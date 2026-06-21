const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken; 
const allowWrite = [verifyToken, checkRole(['admin', 'legal', 'legal_compliance'])];

/**
 * ==========================================
 * DASHBOARD STATS
 * ==========================================
 */
router.get('/dashboard-stats', allowRead, async (req, res, next) => {
  try {
    const totalDocs = await prisma.documents.count();
    const activeDocs = await prisma.documents.count({
      where: { status: 'Active' }
    });

    // Count expiring documents within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringDocs = await prisma.documents.count({
      where: {
        valid_until: {
          gte: new Date(),
          lte: thirtyDaysFromNow
        },
        status: 'Active'
      }
    });

    const totalInsurances = await prisma.insurances.count();
    const insurancePremiumSum = await prisma.insurances.aggregate({
      _sum: {
        premium_idr: true
      }
    });

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
          coverage_idr: true
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

module.exports = router;
