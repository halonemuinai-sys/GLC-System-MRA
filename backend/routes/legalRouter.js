const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken; 
const allowWrite = [verifyToken, checkRole(['admin', 'legal', 'legal_compliance', 'ga'])];

/**
 * ==========================================
 * DASHBOARD STATS
 * ==========================================
 */
router.get('/dashboard-stats', allowRead, async (req, res, next) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalDocs,
      activeDocs,
      expiringDocs,
      totalInsurances,
      insurancePremiumSum
    ] = await Promise.all([
      prisma.documents.count(),
      prisma.documents.count({ where: { status: 'Active' } }),
      prisma.documents.count({
        where: {
          valid_until: { gte: new Date(), lte: thirtyDaysFromNow },
          status: 'Active'
        }
      }),
      prisma.insurances.count(),
      prisma.insurances.aggregate({ _sum: { premium_idr: true } })
    ]);

    res.json({
      totalDocuments: totalDocs,
      activeDocuments: activeDocs,
      expiringDocuments: expiringDocs,
      totalInsurances,
      totalInsurancePremiums: insurancePremiumSum._sum.premium_idr || 0
    });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * DOCUMENTS (PKS / CONTRACTS) ENDPOINTS
 * ==========================================
 */
router.get('/documents', allowRead, async (req, res, next) => {
  try {
    const { search = '', docSubtype, divisionId, docTypeId, companyId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { doc_number: { contains: search, mode: 'insensitive' } },
        { doc_title: { contains: search, mode: 'insensitive' } },
        { counter_party: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (docSubtype) {
      where.doc_subtype = docSubtype;
    }
    if (divisionId) {
      where.division_id = parseInt(divisionId);
    }
    if (docTypeId) {
      where.doc_type_id = parseInt(docTypeId);
    }
    if (companyId) {
      where.mra_party_id = parseInt(companyId);
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const [list, count, activeCount, sumAggregate, expiringCount, companyGroup] = await Promise.all([
      prisma.documents.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_division: true,
          m_document_type: true,
          m_company: true,
          vendors: true
        }
      }),
      prisma.documents.count({ where }),
      prisma.documents.count({
        where: {
          ...where,
          status: 'Active'
        }
      }),
      prisma.documents.aggregate({
        where,
        _sum: {
          amount: true
        }
      }),
      prisma.documents.count({
        where: {
          ...where,
          status: 'Active',
          valid_until: {
            gte: today,
            lte: thirtyDaysFromNow
          }
        }
      }),
      prisma.documents.groupBy({
        by: ['mra_party_id'],
        where
      })
    ]);

    res.json({
      data: list,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalDocuments: count,
        activeCount,
        totalValue: Number(sumAggregate._sum.amount || 0),
        expiringCount,
        uniqueCompaniesCount: companyGroup.filter(g => g.mra_party_id !== null).length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id', allowRead, async (req, res, next) => {
  try {
    const doc = await prisma.documents.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_division: true,
        m_document_type: true,
        m_company: true,
        vendors: true
      }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.post('/documents', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.doc_number || !data.doc_title) {
      return res.status(400).json({ error: 'Document number and title are required.' });
    }

    const newDoc = await prisma.documents.create({
      data: {
        doc_number: data.doc_number,
        doc_title: data.doc_title,
        doc_type_id: data.doc_type_id ? parseInt(data.doc_type_id) : null,
        doc_subtype: data.doc_subtype || 'agreement',
        division_id: data.division_id ? parseInt(data.division_id) : null,
        mra_party_id: data.mra_party_id ? parseInt(data.mra_party_id) : null,
        counter_party: data.counter_party || null,
        vendor_id: data.vendor_id ? parseInt(data.vendor_id) : null,
        pic_internal: data.pic_internal || null,
        valid_from: data.valid_from ? new Date(data.valid_from) : null,
        valid_until: data.valid_until ? new Date(data.valid_until) : null,
        physical_location: data.physical_location || null,
        auto_renewal: data.auto_renewal || false,
        digital_doc_url: data.digital_doc_url || null,
        amount: data.amount ? parseFloat(data.amount) : null,
        notes: data.notes || null,
        status: data.status || 'Active'
      }
    });
    res.status(201).json(newDoc);
  } catch (err) {
    next(err);
  }
});

router.put('/documents/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const updated = await prisma.documents.update({
      where: { id: parseInt(req.params.id) },
      data: {
        doc_number: data.doc_number !== undefined ? data.doc_number : undefined,
        doc_title: data.doc_title !== undefined ? data.doc_title : undefined,
        doc_type_id: data.doc_type_id !== undefined ? (data.doc_type_id ? parseInt(data.doc_type_id) : null) : undefined,
        doc_subtype: data.doc_subtype !== undefined ? data.doc_subtype : undefined,
        division_id: data.division_id !== undefined ? (data.division_id ? parseInt(data.division_id) : null) : undefined,
        mra_party_id: data.mra_party_id !== undefined ? (data.mra_party_id ? parseInt(data.mra_party_id) : null) : undefined,
        counter_party: data.counter_party !== undefined ? data.counter_party : undefined,
        vendor_id: data.vendor_id !== undefined ? (data.vendor_id ? parseInt(data.vendor_id) : null) : undefined,
        pic_internal: data.pic_internal !== undefined ? data.pic_internal : undefined,
        valid_from: data.valid_from !== undefined ? (data.valid_from ? new Date(data.valid_from) : null) : undefined,
        valid_until: data.valid_until !== undefined ? (data.valid_until ? new Date(data.valid_until) : null) : undefined,
        physical_location: data.physical_location !== undefined ? data.physical_location : undefined,
        auto_renewal: data.auto_renewal !== undefined ? data.auto_renewal : undefined,
        digital_doc_url: data.digital_doc_url !== undefined ? data.digital_doc_url : undefined,
        amount: data.amount !== undefined ? (data.amount ? parseFloat(data.amount) : null) : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/documents/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.documents.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * INSURANCES ENDPOINTS
 * ==========================================
 */
router.get('/insurances', allowRead, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10, status, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { policy_number: { contains: search, mode: 'insensitive' } },
        { insurance_company: { contains: search, mode: 'insensitive' } },
        { broker: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } },
        { vehicle_type: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const [list, count, activeCount, costAggregate, expiringCount, companyGroup] = await Promise.all([
      prisma.insurances.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_company: true,
          vehicles: true
        }
      }),
      prisma.insurances.count({ where }),
      prisma.insurances.count({
        where: {
          ...where,
          status: 'Active'
        }
      }),
      prisma.insurances.aggregate({
        where,
        _sum: {
          premium_idr: true,
          coverage_idr: true,
          premium_usd: true,
          coverage_usd: true
        }
      }),
      prisma.insurances.count({
        where: {
          ...where,
          status: 'Active',
          end_date: {
            gte: today,
            lte: thirtyDaysFromNow
          }
        }
      }),
      prisma.insurances.groupBy({
        by: ['company_id'],
        where
      })
    ]);

    res.json({
      data: list,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalCount: count,
        activeCount,
        totalPremiumIdr: Number(costAggregate._sum.premium_idr || 0),
        totalCoverageIdr: Number(costAggregate._sum.coverage_idr || 0),
        totalPremiumUsd: Number(costAggregate._sum.premium_usd || 0),
        totalCoverageUsd: Number(costAggregate._sum.coverage_usd || 0),
        expiringCount,
        uniqueCompaniesCount: companyGroup.filter(g => g.company_id !== null).length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/insurances/:id', allowRead, async (req, res, next) => {
  try {
    const ins = await prisma.insurances.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_company: true,
        vehicles: true
      }
    });
    if (!ins) return res.status(404).json({ error: 'Insurance not found.' });
    res.json(ins);
  } catch (err) {
    next(err);
  }
});

router.post('/insurances', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.company_id || !data.policy_number) {
      return res.status(400).json({ error: 'Company ID and policy number are required.' });
    }

    const newIns = await prisma.insurances.create({
      data: {
        company_id: parseInt(data.company_id),
        insurance_company: data.insurance_company || null,
        insurance_type: data.insurance_type || null,
        category: data.category || null,
        policy_number: data.policy_number,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        vehicle_id: data.vehicle_id ? parseInt(data.vehicle_id) : null,
        vehicle_type: data.vehicle_type || null,
        premium_idr: data.premium_idr ? parseFloat(data.premium_idr) : 0,
        premium_usd: data.premium_usd ? parseFloat(data.premium_usd) : 0,
        coverage_idr: data.coverage_idr ? parseFloat(data.coverage_idr) : 0,
        coverage_usd: data.coverage_usd ? parseFloat(data.coverage_usd) : 0,
        tjh3: data.tjh3 ? parseFloat(data.tjh3) : 0,
        broker: data.broker || null,
        pic: data.pic || null,
        contact_person: data.contact_person || null,
        information: data.information || null,
        doc_url: data.doc_url || null,
        checklist_status: data.checklist_status || null,
        status: data.status || 'Active'
      }
    });
    res.status(201).json(newIns);
  } catch (err) {
    next(err);
  }
});

router.put('/insurances/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const updated = await prisma.insurances.update({
      where: { id: parseInt(req.params.id) },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        insurance_company: data.insurance_company !== undefined ? data.insurance_company : undefined,
        insurance_type: data.insurance_type !== undefined ? data.insurance_type : undefined,
        category: data.category !== undefined ? data.category : undefined,
        policy_number: data.policy_number !== undefined ? data.policy_number : undefined,
        start_date: data.start_date !== undefined ? (data.start_date ? new Date(data.start_date) : null) : undefined,
        end_date: data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : undefined,
        vehicle_id: data.vehicle_id !== undefined ? (data.vehicle_id ? parseInt(data.vehicle_id) : null) : undefined,
        vehicle_type: data.vehicle_type !== undefined ? data.vehicle_type : undefined,
        premium_idr: data.premium_idr !== undefined ? parseFloat(data.premium_idr) : undefined,
        premium_usd: data.premium_usd !== undefined ? parseFloat(data.premium_usd) : undefined,
        coverage_idr: data.coverage_idr !== undefined ? parseFloat(data.coverage_idr) : undefined,
        coverage_usd: data.coverage_usd !== undefined ? parseFloat(data.coverage_usd) : undefined,
        tjh3: data.tjh3 !== undefined ? parseFloat(data.tjh3) : undefined,
        broker: data.broker !== undefined ? data.broker : undefined,
        pic: data.pic !== undefined ? data.pic : undefined,
        contact_person: data.contact_person !== undefined ? data.contact_person : undefined,
        information: data.information !== undefined ? data.information : undefined,
        doc_url: data.doc_url !== undefined ? data.doc_url : undefined,
        checklist_status: data.checklist_status !== undefined ? data.checklist_status : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/insurances/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.insurances.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Insurance deleted successfully.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * MASTER ENDPOINTS
 * ==========================================
 */
router.get('/divisions', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.m_division.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/document-types', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.m_document_type.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * LEGAL MODULES — Contract & Agreement / Corporate Legal Documents (generik, tabel
 * legal_documents) + Litigation & Dispute (dedicated, tabel legal_litigation)
 * Sengaja dipisah dari complianceRouter.js meski berbagi tabel legal_documents,
 * supaya dashboard & notifikasi Legal tidak campur dengan Compliance Dashboard.
 * ==========================================
 */
const LEGAL_GENERIC_MODULES = ['contract', 'corporate'];
const LEGAL_MODULES = [...LEGAL_GENERIC_MODULES, 'litigation'];
const LEGAL_MODULE_LABELS = {
  contract: 'Contract & Agreement',
  corporate: 'Corporate Legal Documents',
  litigation: 'Litigation & Dispute'
};

function computeExpiryStatus(expiryDate) {
  if (!expiryDate) return { status: null, daysUntilExpiry: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  let status;
  if (daysUntilExpiry < 0) status = 'Expired';
  else if (daysUntilExpiry < 30) status = 'Critical';
  else if (daysUntilExpiry < 90) status = 'Warning';
  else status = 'Valid';
  return { status, daysUntilExpiry };
}

function withExpiryStatus(doc) {
  const { status, daysUntilExpiry } = computeExpiryStatus(doc.expiry_date);
  return { ...doc, status, days_until_expiry: daysUntilExpiry };
}

function sortByExpiry(a, b) {
  if (!a.expiry_date && !b.expiry_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.expiry_date) return 1;
  if (!b.expiry_date) return -1;
  return new Date(a.expiry_date) - new Date(b.expiry_date);
}

// Status sidang dihitung dari next_hearing_date, dipisah dari case_status (yang diisi manual)
// supaya badge "kasus aktif/ditutup" tidak tertukar dengan urgensi tanggal sidang berikutnya
function withHearingStatus(c) {
  const { status, daysUntilExpiry } = computeExpiryStatus(c.next_hearing_date);
  return { ...c, hearing_status: status, days_until_hearing: daysUntilExpiry };
}

function sortByHearing(a, b) {
  if (!a.next_hearing_date && !b.next_hearing_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.next_hearing_date) return 1;
  if (!b.next_hearing_date) return -1;
  return new Date(a.next_hearing_date) - new Date(b.next_hearing_date);
}

// Normalisasi baris legal_litigation agar bisa digabung dengan legal_documents
// saat agregasi lintas-modul (notifications & summary Legal Dashboard)
function litigationToDocShape(c) {
  return {
    id: c.id,
    module: 'litigation',
    doc_name: c.doc_name,
    category: c.category,
    pic: c.pic,
    company_id: c.company_id,
    m_company: c.m_company,
    doc_status: c.case_status,
    confidentiality: c.confidentiality,
    expiry_date: c.next_hearing_date,
    created_at: c.created_at
  };
}

/**
 * ==========================================
 * LEGAL-DOCS — Generic CRUD untuk Contract & Agreement / Corporate Legal Documents
 * ==========================================
 */
router.get('/legal-docs', allowRead, async (req, res, next) => {
  try {
    const { module, search = '', category, companyId, companyMasterId, docStatus, confidentiality, expiryStatus, page = 1, limit = 20 } = req.query;

    if (!module || !LEGAL_GENERIC_MODULES.includes(module)) {
      return res.status(400).json({ error: 'Valid module is required.' });
    }

    const where = { module };
    if (search) {
      where.OR = [
        { doc_name: { contains: search, mode: 'insensitive' } },
        { id_number: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) where.category = category;
    if (companyId) where.company_id = parseInt(companyId);
    else if (companyMasterId) where.m_company = { company_master_id: parseInt(companyMasterId) };
    if (docStatus) where.doc_status = docStatus;
    if (confidentiality) where.confidentiality = confidentiality;

    const matching = await prisma.legal_documents.findMany({
      where,
      include: { m_company: { select: { id: true, name: true, company_master_id: true } } }
    });

    let withStatus = matching.map(withExpiryStatus).sort(sortByExpiry);
    if (expiryStatus) {
      withStatus = withStatus.filter(d => d.status === expiryStatus);
    }

    const total = withStatus.length;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const paged = withStatus.slice(skip, skip + take);

    res.json({
      data: paged,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take) || 1
      },
      summary: {
        totalCount: total,
        activeCount: withStatus.filter(d => d.doc_status === 'Active').length,
        expiringSoonCount: withStatus.filter(d => d.status === 'Warning' || d.status === 'Critical').length,
        expiredCount: withStatus.filter(d => d.status === 'Expired').length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/legal-docs/:id', allowRead, async (req, res, next) => {
  try {
    const doc = await prisma.legal_documents.findFirst({
      where: { id: parseInt(req.params.id), module: { in: LEGAL_GENERIC_MODULES } },
      include: {
        m_company: { select: { id: true, name: true, company_master_id: true } },
        legal_audit_logs: { orderBy: { performed_at: 'desc' }, take: 20 }
      }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    res.json(withExpiryStatus(doc));
  } catch (err) {
    next(err);
  }
});

router.post('/legal-docs', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.module || !LEGAL_GENERIC_MODULES.includes(data.module)) {
      return res.status(400).json({ error: 'Valid module is required.' });
    }
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Document name, category, and PIC are required.' });
    }

    const newDoc = await prisma.legal_documents.create({
      data: {
        module: data.module,
        doc_name: data.doc_name,
        category: data.category,
        id_number: data.id_number || null,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        pic: data.pic,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        doc_status: data.doc_status || 'Draft',
        confidentiality: data.confidentiality || 'Public/Internal',
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        notes: data.notes || null
      }
    });

    await prisma.legal_audit_logs.create({
      data: {
        document_id: newDoc.id,
        doc_name: newDoc.doc_name,
        module: newDoc.module,
        action: 'CREATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.status(201).json(newDoc);
  } catch (err) {
    next(err);
  }
});

router.put('/legal-docs/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const docId = parseInt(req.params.id);

    const existing = await prisma.legal_documents.findFirst({
      where: { id: docId, module: { in: LEGAL_GENERIC_MODULES } }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Document name, category, and PIC are required.' });
    }

    const updated = await prisma.legal_documents.update({
      where: { id: docId },
      data: {
        doc_name: data.doc_name,
        category: data.category,
        id_number: data.id_number || null,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        pic: data.pic,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        doc_status: data.doc_status || 'Draft',
        confidentiality: data.confidentiality || 'Public/Internal',
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        notes: data.notes || null,
        updated_at: new Date()
      }
    });

    await prisma.legal_audit_logs.create({
      data: {
        document_id: docId,
        doc_name: updated.doc_name,
        module: existing.module,
        action: 'UPDATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/legal-docs/:id', allowWrite, async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.legal_documents.findFirst({
      where: { id: docId, module: { in: LEGAL_GENERIC_MODULES } }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    await prisma.legal_audit_logs.updateMany({
      where: { document_id: docId },
      data: { document_id: null }
    });
    await prisma.legal_audit_logs.create({
      data: {
        document_id: null,
        doc_name: existing.doc_name,
        module: existing.module,
        action: 'DELETE',
        performed_by: req.user.full_name || 'System'
      }
    });
    await prisma.legal_documents.delete({ where: { id: docId } });

    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * LITIGATION — CRUD dedicated untuk Litigation & Dispute (tabel legal_litigation)
 * ==========================================
 */
router.get('/litigation', allowRead, async (req, res, next) => {
  try {
    const { search = '', category, companyId, companyMasterId, caseStatus, riskLevel, confidentiality, hearingStatus, page = 1, limit = 20 } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { doc_name: { contains: search, mode: 'insensitive' } },
        { case_number: { contains: search, mode: 'insensitive' } },
        { opposing_party: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) where.category = category;
    if (companyId) where.company_id = parseInt(companyId);
    else if (companyMasterId) where.m_company = { company_master_id: parseInt(companyMasterId) };
    if (caseStatus) where.case_status = caseStatus;
    if (riskLevel) where.risk_level = riskLevel;
    if (confidentiality) where.confidentiality = confidentiality;

    const matching = await prisma.legal_litigation.findMany({
      where,
      include: { m_company: { select: { id: true, name: true, company_master_id: true } } }
    });

    let withStatus = matching.map(withHearingStatus).sort(sortByHearing);
    if (hearingStatus) {
      withStatus = withStatus.filter(c => c.hearing_status === hearingStatus);
    }

    const total = withStatus.length;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    const paged = withStatus.slice(skip, skip + take);

    const CLOSED_STATUSES = ['Won', 'Lost', 'Settlement', 'Closed'];
    res.json({
      data: paged,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take) || 1
      },
      summary: {
        totalCount: total,
        activeCount: withStatus.filter(c => !CLOSED_STATUSES.includes(c.case_status)).length,
        criticalCount: withStatus.filter(c => c.hearing_status === 'Critical' || c.hearing_status === 'Expired').length,
        closedCount: withStatus.filter(c => CLOSED_STATUSES.includes(c.case_status)).length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/litigation/:id', allowRead, async (req, res, next) => {
  try {
    const item = await prisma.legal_litigation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_company: { select: { id: true, name: true, company_master_id: true } },
        legal_litigation_audit_logs: { orderBy: { performed_at: 'desc' }, take: 20 }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    res.json(withHearingStatus(item));
  } catch (err) {
    next(err);
  }
});

router.post('/litigation', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Case title, category, and PIC are required.' });
    }

    const newCase = await prisma.legal_litigation.create({
      data: {
        case_number: data.case_number || null,
        doc_name: data.doc_name,
        category: data.category,
        court_name: data.court_name || null,
        opposing_party: data.opposing_party || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        business_unit: data.business_unit || null,
        pic: data.pic,
        external_counsel: data.external_counsel || null,
        case_status: data.case_status || 'Filed',
        risk_level: data.risk_level || null,
        claim_amount: data.claim_amount ? parseFloat(data.claim_amount) : null,
        settlement_amount: data.settlement_amount ? parseFloat(data.settlement_amount) : null,
        filing_date: data.filing_date ? new Date(data.filing_date) : null,
        next_hearing_date: data.next_hearing_date ? new Date(data.next_hearing_date) : null,
        closing_date: data.closing_date ? new Date(data.closing_date) : null,
        confidentiality: data.confidentiality || 'Confidential',
        document_url: data.document_url || null,
        notes: data.notes || null
      }
    });

    await prisma.legal_litigation_audit_logs.create({
      data: {
        case_id: newCase.id,
        doc_name: newCase.doc_name,
        action: 'CREATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
});

router.put('/litigation/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const caseId = parseInt(req.params.id);

    const existing = await prisma.legal_litigation.findUnique({ where: { id: caseId } });
    if (!existing) {
      return res.status(404).json({ error: 'Case not found.' });
    }
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Case title, category, and PIC are required.' });
    }

    const updated = await prisma.legal_litigation.update({
      where: { id: caseId },
      data: {
        case_number: data.case_number || null,
        doc_name: data.doc_name,
        category: data.category,
        court_name: data.court_name || null,
        opposing_party: data.opposing_party || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        business_unit: data.business_unit || null,
        pic: data.pic,
        external_counsel: data.external_counsel || null,
        case_status: data.case_status || 'Filed',
        risk_level: data.risk_level || null,
        claim_amount: data.claim_amount ? parseFloat(data.claim_amount) : null,
        settlement_amount: data.settlement_amount ? parseFloat(data.settlement_amount) : null,
        filing_date: data.filing_date ? new Date(data.filing_date) : null,
        next_hearing_date: data.next_hearing_date ? new Date(data.next_hearing_date) : null,
        closing_date: data.closing_date ? new Date(data.closing_date) : null,
        confidentiality: data.confidentiality || 'Confidential',
        document_url: data.document_url || null,
        notes: data.notes || null,
        updated_at: new Date()
      }
    });

    await prisma.legal_litigation_audit_logs.create({
      data: {
        case_id: caseId,
        doc_name: updated.doc_name,
        action: 'UPDATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/litigation/:id', allowWrite, async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id);
    const existing = await prisma.legal_litigation.findUnique({ where: { id: caseId } });
    if (!existing) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    await prisma.legal_litigation_audit_logs.updateMany({
      where: { case_id: caseId },
      data: { case_id: null }
    });
    await prisma.legal_litigation_audit_logs.create({
      data: {
        case_id: null,
        doc_name: existing.doc_name,
        action: 'DELETE',
        performed_by: req.user.full_name || 'System'
      }
    });
    await prisma.legal_litigation.delete({ where: { id: caseId } });

    res.json({ message: 'Case deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * NOTIFICATIONS — Badge Sidebar untuk section Legal
 * ==========================================
 */
router.get('/notifications', allowRead, async (req, res, next) => {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const CLOSED_STATUSES = ['Won', 'Lost', 'Settlement', 'Closed'];

    const [genericDocs, litigationCases] = await Promise.all([
      prisma.legal_documents.findMany({
        where: {
          module: { in: LEGAL_GENERIC_MODULES },
          expiry_date: { not: null, lt: ninetyDaysFromNow }
        }
      }),
      prisma.legal_litigation.findMany({
        where: {
          case_status: { notIn: CLOSED_STATUSES },
          next_hearing_date: { not: null, lt: ninetyDaysFromNow }
        }
      })
    ]);

    const perModule = {};
    genericDocs.forEach(d => {
      perModule[d.module] = (perModule[d.module] || 0) + 1;
    });
    if (litigationCases.length > 0) perModule.litigation = litigationCases.length;

    const MODULE_LINK = { contract: '/dashboard/legal/contracts', corporate: '/dashboard/legal/corporate' };
    const items = [];
    genericDocs.forEach(d => {
      const { status, daysUntilExpiry } = computeExpiryStatus(d.expiry_date);
      if (status) items.push({ id: `${d.module}-${d.id}`, title: d.doc_name, subtitle: LEGAL_MODULE_LABELS[d.module] || d.module, date: d.expiry_date, daysLeft: daysUntilExpiry, status, link: MODULE_LINK[d.module] || '/dashboard/legal/dashboard' });
    });
    litigationCases.forEach(c => {
      const { status, daysUntilExpiry } = computeExpiryStatus(c.next_hearing_date);
      if (status) items.push({ id: `litigation-${c.id}`, title: c.doc_name, subtitle: 'Litigation & Dispute', date: c.next_hearing_date, daysLeft: daysUntilExpiry, status, link: '/dashboard/legal/litigation' });
    });
    items.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({ total: genericDocs.length + litigationCases.length, perModule, items: items.slice(0, 30) });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * SUMMARY — Agregasi lintas modul untuk Legal Dashboard
 * ==========================================
 */
router.get('/summary', allowRead, async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const genericWhere = { module: { in: LEGAL_GENERIC_MODULES } };
    const litigationWhere = {};
    if (companyId) {
      genericWhere.company_id = parseInt(companyId);
      litigationWhere.company_id = parseInt(companyId);
    }

    const [genericDocs, litigationCases] = await Promise.all([
      prisma.legal_documents.findMany({
        where: genericWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.legal_litigation.findMany({
        where: litigationWhere,
        include: { m_company: { select: { name: true } } }
      })
    ]);

    const allDocs = [...genericDocs, ...litigationCases.map(litigationToDocShape)];
    const withStatus = allDocs.map(withExpiryStatus);

    const CLOSED_STATUSES = ['Won', 'Lost', 'Settlement', 'Closed', 'Archived'];
    const kpi = {
      total: withStatus.length,
      active: withStatus.filter(d => !CLOSED_STATUSES.includes(d.doc_status)).length,
      expiringSoon: withStatus.filter(d => d.status === 'Warning' || d.status === 'Critical').length,
      expired: withStatus.filter(d => d.status === 'Expired').length
    };

    const byModule = LEGAL_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: LEGAL_MODULE_LABELS[m],
        total: docs.length,
        critical: docs.filter(d => d.status === 'Critical' || d.status === 'Expired').length
      };
    });

    const docStatusMap = {};
    withStatus.forEach(d => {
      const key = d.doc_status || 'Draft';
      docStatusMap[key] = (docStatusMap[key] || 0) + 1;
    });
    const byDocStatus = Object.entries(docStatusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const byExpiryStatus = LEGAL_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: LEGAL_MODULE_LABELS[m],
        Valid: docs.filter(d => d.status === 'Valid' || d.status === null).length,
        Warning: docs.filter(d => d.status === 'Warning').length,
        Critical: docs.filter(d => d.status === 'Critical').length,
        Expired: docs.filter(d => d.status === 'Expired').length
      };
    });

    const criticalDocs = withStatus
      .filter(d => d.status === 'Critical' || d.status === 'Warning' || d.status === 'Expired')
      .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
      .slice(0, 10);

    const companyMap = {};
    withStatus.forEach(d => {
      const name = d.m_company?.name || 'Unassigned';
      if (!companyMap[name]) companyMap[name] = { name, total: 0, expired: 0, critical: 0 };
      companyMap[name].total++;
      if (d.status === 'Expired') companyMap[name].expired++;
      if (d.status === 'Critical') companyMap[name].critical++;
    });
    const byCompany = Object.values(companyMap).sort((a, b) => b.total - a.total);

    res.json({ kpi, byModule, byDocStatus, byExpiryStatus, criticalDocs, byCompany });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
