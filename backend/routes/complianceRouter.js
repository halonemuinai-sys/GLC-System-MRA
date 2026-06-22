const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken;
const allowWrite = [verifyToken, checkRole(['admin', 'compliance', 'legal_compliance'])];

// Modul-modul Compliance yang masih berbagi tabel generik legal_documents (kolom `module`).
// 'license', 'monitoring', dan 'sop' TIDAK termasuk di sini lagi — masing-masing punya tabel
// sendiri (compliance_licenses, compliance_monitoring, compliance_sop) karena field-nya jauh
// lebih detail daripada bentuk generik.
const GENERIC_MODULES = ['hr_compliance', 'tax_finance', 'product_regulatory'];
const COMPLIANCE_MODULES = ['license', 'monitoring', 'sop', ...GENERIC_MODULES];

const MODULE_LABELS = {
  license: 'License & Permit',
  monitoring: 'Compliance Docs',
  sop: 'SOP & Policy',
  hr_compliance: 'HR & Employment',
  tax_finance: 'Tax & Finance',
  product_regulatory: 'Product Regulatory'
};

// Status kadaluarsa dihitung dari expiry_date (tidak disimpan di DB), sama untuk semua modul
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

// Status jadwal audit dihitung dari next_audit_date — pakai ambang yang sama dengan
// computeExpiryStatus (90/30 hari) karena urgensinya serupa, tapi field hasil dipisah
// (audit_status / days_until_audit) supaya tidak tertukar dengan status kadaluarsa dokumen
function withAuditStatus(doc) {
  if (!doc.next_audit_date) return { ...doc, audit_status: null, days_until_audit: null };
  const { status, daysUntilExpiry } = computeExpiryStatus(doc.next_audit_date);
  return { ...doc, audit_status: status, days_until_audit: daysUntilExpiry };
}

// Khusus untuk agregasi lintas-modul (Compliance Dashboard & notifications): sebuah dokumen
// dianggap "perlu perhatian" kalau status kadaluarsa ATAU status audit-nya genting — dipakai
// terpisah dari withExpiryStatus supaya tabel per-modul tetap nunjukin status expiry yang murni
function withCombinedUrgency(doc) {
  const primary = computeExpiryStatus(doc.expiry_date);
  if (!doc.next_audit_date) {
    return { ...doc, status: primary.status, days_until_expiry: primary.daysUntilExpiry };
  }
  const audit = computeExpiryStatus(doc.next_audit_date);
  const URGENCY_RANK = { Expired: 3, Critical: 2, Warning: 1, Valid: 0 };
  const primaryRank = primary.status ? URGENCY_RANK[primary.status] : -1;
  const auditRank = audit.status ? URGENCY_RANK[audit.status] : -1;
  if (auditRank > primaryRank) {
    return { ...doc, status: audit.status, days_until_expiry: audit.daysUntilExpiry };
  }
  return { ...doc, status: primary.status, days_until_expiry: primary.daysUntilExpiry };
}

function sortByExpiry(a, b) {
  if (!a.expiry_date && !b.expiry_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.expiry_date) return 1;
  if (!b.expiry_date) return -1;
  return new Date(a.expiry_date) - new Date(b.expiry_date);
}

// Normalisasi baris compliance_licenses agar bisa digabung dengan legal_documents
// saat agregasi lintas-modul (notifications & summary)
function licenseToDocShape(lic) {
  return {
    id: lic.id,
    module: 'license',
    doc_name: lic.doc_name,
    category: lic.category,
    pic: lic.pic,
    company_id: lic.company_id,
    m_company: lic.m_company,
    doc_status: lic.doc_status,
    confidentiality: lic.confidentiality,
    expiry_date: lic.expiry_date,
    next_audit_date: lic.next_audit_date,
    created_at: lic.created_at
  };
}

// Normalisasi baris compliance_sop agar bisa digabung dengan legal_documents
// saat agregasi lintas-modul (notifications & summary) — sudah punya expiry_date sendiri
function sopToDocShape(rec) {
  return {
    id: rec.id,
    module: 'sop',
    doc_name: rec.doc_name,
    category: rec.category,
    pic: rec.pic,
    company_id: rec.company_id,
    m_company: rec.m_company,
    doc_status: rec.doc_status,
    confidentiality: rec.confidentiality,
    expiry_date: rec.expiry_date,
    created_at: rec.created_at
  };
}

// Normalisasi baris compliance_monitoring — due_date diperlakukan seperti expiry_date
// supaya bisa dipakai ulang oleh helper Valid/Warning/Critical/Expired saat agregasi lintas-modul
function monitoringToDocShape(rec) {
  return {
    id: rec.id,
    module: 'monitoring',
    doc_name: rec.doc_name,
    category: rec.category,
    pic: rec.pic,
    company_id: rec.company_id,
    m_company: rec.m_company,
    doc_status: rec.compliance_status,
    confidentiality: rec.confidentiality,
    expiry_date: rec.due_date,
    next_audit_date: rec.next_audit_date,
    created_at: rec.created_at
  };
}

// Status timeline due-date untuk compliance_monitoring (beda makna dari expiry: Overdue/Due
// Soon/On Track/Completed, ambang waktu lebih pendek karena CAP/finding biasanya jangka pendek)
function computeTimelineStatus(dueDate, completionDate) {
  if (!dueDate) return { status: null, daysOutstanding: null };
  if (completionDate) return { status: 'Completed', daysOutstanding: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysOutstanding = Math.round((today - due) / (1000 * 60 * 60 * 24));

  let status;
  if (daysOutstanding > 0) status = 'Overdue';
  else if (daysOutstanding >= -7) status = 'Due Soon';
  else status = 'On Track';
  return { status, daysOutstanding };
}

function withTimelineStatus(rec) {
  const { status, daysOutstanding } = computeTimelineStatus(rec.due_date, rec.completion_date);
  return { ...rec, status, days_outstanding: daysOutstanding };
}

function sortByDueDate(a, b) {
  if (!a.due_date && !b.due_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return new Date(a.due_date) - new Date(b.due_date);
}

/**
 * ==========================================
 * DOCUMENTS — Generic CRUD untuk seluruh modul Compliance
 * (license, monitoring, sop, hr_compliance, tax_finance, product_regulatory)
 * ==========================================
 */
router.get('/documents', allowRead, async (req, res, next) => {
  try {
    const { module, search = '', category, companyId, docStatus, confidentiality, expiryStatus, page = 1, limit = 20 } = req.query;

    if (!module || !GENERIC_MODULES.includes(module)) {
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
    if (docStatus) where.doc_status = docStatus;
    if (confidentiality) where.confidentiality = confidentiality;

    const matching = await prisma.legal_documents.findMany({
      where,
      include: { m_company: { select: { id: true, name: true } } }
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

router.get('/documents/:id', allowRead, async (req, res, next) => {
  try {
    const doc = await prisma.legal_documents.findFirst({
      where: { id: parseInt(req.params.id), module: { in: GENERIC_MODULES } },
      include: {
        m_company: { select: { id: true, name: true } },
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

router.post('/documents', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.module || !GENERIC_MODULES.includes(data.module)) {
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

router.put('/documents/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const docId = parseInt(req.params.id);

    const existing = await prisma.legal_documents.findFirst({
      where: { id: docId, module: { in: GENERIC_MODULES } }
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

router.delete('/documents/:id', allowWrite, async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.legal_documents.findFirst({
      where: { id: docId, module: { in: GENERIC_MODULES } }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Lepas relasi audit log dari dokumen (bukan dihapus) agar riwayat tetap tersimpan,
    // baru catat aksi DELETE, lalu hapus dokumennya untuk menghindari FK constraint
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
 * LICENSE & PERMIT — CRUD khusus (tabel compliance_licenses sendiri, field lebih detail
 * daripada modul compliance generik lainnya: Business Unit, Risk Level, Status Perpanjangan, dst)
 * ==========================================
 */
router.get('/licenses', allowRead, async (req, res, next) => {
  try {
    const { search = '', category, companyId, companyMasterId, docStatus, riskLevel, renewalStatus, expiryStatus, page = 1, limit = 20 } = req.query;

    const where = {};
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
    if (riskLevel) where.risk_level = riskLevel;
    if (renewalStatus) where.renewal_status = renewalStatus;

    const matching = await prisma.compliance_licenses.findMany({
      where,
      include: { m_company: { select: { id: true, name: true, company_master_id: true } } }
    });

    let withStatus = matching.map(withExpiryStatus).map(withAuditStatus).sort(sortByExpiry);
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

router.get('/licenses/:id', allowRead, async (req, res, next) => {
  try {
    const license = await prisma.compliance_licenses.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_company: { select: { id: true, name: true } },
        compliance_license_audit_logs: { orderBy: { performed_at: 'desc' }, take: 20 }
      }
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found.' });
    }

    res.json(withAuditStatus(withExpiryStatus(license)));
  } catch (err) {
    next(err);
  }
});

router.post('/licenses', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Document name, category, and PIC are required.' });
    }

    const newLicense = await prisma.compliance_licenses.create({
      data: {
        doc_name: data.doc_name,
        category: data.category,
        sub_category: data.sub_category || null,
        id_number: data.id_number || null,
        issuing_authority: data.issuing_authority || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        business_unit: data.business_unit || null,
        site_location: data.site_location || null,
        related_product: data.related_product || null,
        pic: data.pic,
        pic_department: data.pic_department || null,
        backup_pic: data.backup_pic || null,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        effective_date: data.effective_date ? new Date(data.effective_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        doc_status: data.doc_status || 'Draft',
        renewal_status: data.renewal_status || null,
        regulator_submission_status: data.regulator_submission_status || null,
        risk_level: data.risk_level || null,
        confidentiality: data.confidentiality || 'Public',
        approval_authority: data.approval_authority || null,
        audit_requirement: data.audit_requirement || null,
        last_audit_date: data.last_audit_date ? new Date(data.last_audit_date) : null,
        next_audit_date: data.next_audit_date ? new Date(data.next_audit_date) : null,
        regulator_url: data.regulator_url || null,
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        notes: data.notes || null
      }
    });

    await prisma.compliance_license_audit_logs.create({
      data: {
        license_id: newLicense.id,
        doc_name: newLicense.doc_name,
        action: 'CREATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.status(201).json(newLicense);
  } catch (err) {
    next(err);
  }
});

router.put('/licenses/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const licenseId = parseInt(req.params.id);

    const existing = await prisma.compliance_licenses.findUnique({ where: { id: licenseId } });
    if (!existing) {
      return res.status(404).json({ error: 'License not found.' });
    }
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Document name, category, and PIC are required.' });
    }

    const updated = await prisma.compliance_licenses.update({
      where: { id: licenseId },
      data: {
        doc_name: data.doc_name,
        category: data.category,
        sub_category: data.sub_category || null,
        id_number: data.id_number || null,
        issuing_authority: data.issuing_authority || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        business_unit: data.business_unit || null,
        site_location: data.site_location || null,
        related_product: data.related_product || null,
        pic: data.pic,
        pic_department: data.pic_department || null,
        backup_pic: data.backup_pic || null,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        effective_date: data.effective_date ? new Date(data.effective_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        doc_status: data.doc_status || 'Draft',
        renewal_status: data.renewal_status || null,
        regulator_submission_status: data.regulator_submission_status || null,
        risk_level: data.risk_level || null,
        confidentiality: data.confidentiality || 'Public',
        approval_authority: data.approval_authority || null,
        audit_requirement: data.audit_requirement || null,
        last_audit_date: data.last_audit_date ? new Date(data.last_audit_date) : null,
        next_audit_date: data.next_audit_date ? new Date(data.next_audit_date) : null,
        regulator_url: data.regulator_url || null,
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        notes: data.notes || null,
        updated_at: new Date()
      }
    });

    await prisma.compliance_license_audit_logs.create({
      data: {
        license_id: licenseId,
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

router.delete('/licenses/:id', allowWrite, async (req, res, next) => {
  try {
    const licenseId = parseInt(req.params.id);
    const existing = await prisma.compliance_licenses.findUnique({ where: { id: licenseId } });
    if (!existing) {
      return res.status(404).json({ error: 'License not found.' });
    }

    // Lepas relasi audit log dari lisensi (bukan dihapus) agar riwayat tetap tersimpan,
    // baru catat aksi DELETE, lalu hapus lisensinya untuk menghindari FK constraint
    await prisma.compliance_license_audit_logs.updateMany({
      where: { license_id: licenseId },
      data: { license_id: null }
    });

    await prisma.compliance_license_audit_logs.create({
      data: {
        license_id: null,
        doc_name: existing.doc_name,
        action: 'DELETE',
        performed_by: req.user.full_name || 'System'
      }
    });

    await prisma.compliance_licenses.delete({ where: { id: licenseId } });

    res.json({ message: 'License deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * COMPLIANCE DOCS / MONITORING — CRUD khusus (tabel compliance_monitoring sendiri, field
 * lebih detail daripada modul compliance generik lainnya: Risk Level, Finding Status, CAP, dst)
 * ==========================================
 */
router.get('/monitoring', allowRead, async (req, res, next) => {
  try {
    const { search = '', category, companyId, companyMasterId, complianceStatus, findingStatus, riskLevel, timelineStatus, page = 1, limit = 20 } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { doc_name: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } },
        { regulatory_authority: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) where.category = category;
    if (companyId) where.company_id = parseInt(companyId);
    else if (companyMasterId) where.m_company = { company_master_id: parseInt(companyMasterId) };
    if (complianceStatus) where.compliance_status = complianceStatus;
    if (findingStatus) where.finding_status = findingStatus;
    if (riskLevel) where.risk_level = riskLevel;

    const matching = await prisma.compliance_monitoring.findMany({
      where,
      include: { m_company: { select: { id: true, name: true, company_master_id: true } } }
    });

    let withStatus = matching.map(withTimelineStatus).map(withAuditStatus).sort(sortByDueDate);
    if (timelineStatus) {
      withStatus = withStatus.filter(d => d.status === timelineStatus);
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
        complyCount: withStatus.filter(d => d.compliance_status === 'Comply').length,
        overdueCount: withStatus.filter(d => d.status === 'Overdue').length,
        openFindingCount: withStatus.filter(d => d.finding_status === 'Open' || d.finding_status === 'On Progress').length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/monitoring/:id', allowRead, async (req, res, next) => {
  try {
    const record = await prisma.compliance_monitoring.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_company: { select: { id: true, name: true, company_master_id: true } },
        compliance_monitoring_audit_logs: { orderBy: { performed_at: 'desc' }, take: 20 }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    res.json(withAuditStatus(withTimelineStatus(record)));
  } catch (err) {
    next(err);
  }
});

router.post('/monitoring', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Regulation/Requirement, category, and PIC are required.' });
    }

    const newRecord = await prisma.compliance_monitoring.create({
      data: {
        doc_name: data.doc_name,
        category: data.category,
        regulatory_authority: data.regulatory_authority || null,
        business_unit: data.business_unit || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        process_activity: data.process_activity || null,
        compliance_obligation: data.compliance_obligation || null,
        pic: data.pic,
        pic_department: data.pic_department || null,
        risk_level: data.risk_level || null,
        compliance_status: data.compliance_status || 'Under Review',
        finding_status: data.finding_status || 'Open',
        due_date: data.due_date ? new Date(data.due_date) : null,
        completion_date: data.completion_date ? new Date(data.completion_date) : null,
        monitoring_frequency: data.monitoring_frequency || null,
        review_frequency: data.review_frequency || null,
        policy_sop_reference: data.policy_sop_reference || null,
        document_url: data.document_url || null,
        confidentiality: data.confidentiality || 'Public',
        approval_status: data.approval_status || null,
        approved_by: data.approved_by || null,
        approval_date: data.approval_date ? new Date(data.approval_date) : null,
        audit_requirement: data.audit_requirement || null,
        audit_type: data.audit_type || null,
        last_audit_date: data.last_audit_date ? new Date(data.last_audit_date) : null,
        next_audit_date: data.next_audit_date ? new Date(data.next_audit_date) : null,
        notes: data.notes || null
      }
    });

    await prisma.compliance_monitoring_audit_logs.create({
      data: {
        record_id: newRecord.id,
        doc_name: newRecord.doc_name,
        action: 'CREATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.status(201).json(newRecord);
  } catch (err) {
    next(err);
  }
});

router.put('/monitoring/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const recordId = parseInt(req.params.id);

    const existing = await prisma.compliance_monitoring.findUnique({ where: { id: recordId } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Regulation/Requirement, category, and PIC are required.' });
    }

    const updated = await prisma.compliance_monitoring.update({
      where: { id: recordId },
      data: {
        doc_name: data.doc_name,
        category: data.category,
        regulatory_authority: data.regulatory_authority || null,
        business_unit: data.business_unit || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        process_activity: data.process_activity || null,
        compliance_obligation: data.compliance_obligation || null,
        pic: data.pic,
        pic_department: data.pic_department || null,
        risk_level: data.risk_level || null,
        compliance_status: data.compliance_status || 'Under Review',
        finding_status: data.finding_status || 'Open',
        due_date: data.due_date ? new Date(data.due_date) : null,
        completion_date: data.completion_date ? new Date(data.completion_date) : null,
        monitoring_frequency: data.monitoring_frequency || null,
        review_frequency: data.review_frequency || null,
        policy_sop_reference: data.policy_sop_reference || null,
        document_url: data.document_url || null,
        confidentiality: data.confidentiality || 'Public',
        approval_status: data.approval_status || null,
        approved_by: data.approved_by || null,
        approval_date: data.approval_date ? new Date(data.approval_date) : null,
        audit_requirement: data.audit_requirement || null,
        audit_type: data.audit_type || null,
        last_audit_date: data.last_audit_date ? new Date(data.last_audit_date) : null,
        next_audit_date: data.next_audit_date ? new Date(data.next_audit_date) : null,
        notes: data.notes || null,
        updated_at: new Date()
      }
    });

    await prisma.compliance_monitoring_audit_logs.create({
      data: {
        record_id: recordId,
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

router.delete('/monitoring/:id', allowWrite, async (req, res, next) => {
  try {
    const recordId = parseInt(req.params.id);
    const existing = await prisma.compliance_monitoring.findUnique({ where: { id: recordId } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    // Lepas relasi audit log dari record (bukan dihapus) agar riwayat tetap tersimpan,
    // baru catat aksi DELETE, lalu hapus record-nya untuk menghindari FK constraint
    await prisma.compliance_monitoring_audit_logs.updateMany({
      where: { record_id: recordId },
      data: { record_id: null }
    });

    await prisma.compliance_monitoring_audit_logs.create({
      data: {
        record_id: null,
        doc_name: existing.doc_name,
        action: 'DELETE',
        performed_by: req.user.full_name || 'System'
      }
    });

    await prisma.compliance_monitoring.delete({ where: { id: recordId } });

    res.json({ message: 'Record deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * SOP & POLICY — CRUD khusus (tabel compliance_sop sendiri, field lebih detail daripada
 * modul compliance generik lainnya: Versi Dokumen, Training, Distribution, Acknowledgement, dst)
 * ==========================================
 */
router.get('/sop', allowRead, async (req, res, next) => {
  try {
    const { search = '', category, companyId, companyMasterId, docStatus, riskLevel, archiveStatus, expiryStatus, page = 1, limit = 20 } = req.query;

    const where = {};
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
    if (riskLevel) where.risk_level = riskLevel;
    if (archiveStatus) where.archive_status = archiveStatus;

    const matching = await prisma.compliance_sop.findMany({
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

router.get('/sop/:id', allowRead, async (req, res, next) => {
  try {
    const record = await prisma.compliance_sop.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_company: { select: { id: true, name: true, company_master_id: true } },
        compliance_sop_audit_logs: { orderBy: { performed_at: 'desc' }, take: 20 }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    res.json(withExpiryStatus(record));
  } catch (err) {
    next(err);
  }
});

router.post('/sop', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Nama SOP/Policy, category, and PIC are required.' });
    }

    const newRecord = await prisma.compliance_sop.create({
      data: {
        doc_name: data.doc_name,
        category: data.category,
        id_number: data.id_number || null,
        version: data.version || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        business_unit: data.business_unit || null,
        process_owner: data.process_owner || null,
        document_owner: data.document_owner || null,
        pic: data.pic,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        effective_date: data.effective_date ? new Date(data.effective_date) : null,
        review_date: data.review_date ? new Date(data.review_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        last_revision_date: data.last_revision_date ? new Date(data.last_revision_date) : null,
        doc_status: data.doc_status || 'Draft',
        risk_level: data.risk_level || null,
        document_classification: data.document_classification || null,
        confidentiality: data.confidentiality || 'Public',
        controlled_copy: data.controlled_copy || null,
        approval_status: data.approval_status || null,
        approval_authority: data.approval_authority || null,
        workflow_status: data.workflow_status || null,
        change_request_number: data.change_request_number || null,
        audit_requirement: data.audit_requirement || null,
        audit_status: data.audit_status || null,
        regulatory_reference: data.regulatory_reference || null,
        policy_objective: data.policy_objective || null,
        scope_of_application: data.scope_of_application || null,
        related_sop_policy: data.related_sop_policy || null,
        revision_notes: data.revision_notes || null,
        training_required: data.training_required || null,
        training_status: data.training_status || null,
        distribution_status: data.distribution_status || null,
        acknowledgement_status: data.acknowledgement_status || null,
        review_frequency: data.review_frequency || null,
        retention_period: data.retention_period || null,
        archive_status: data.archive_status || null,
        document_url: data.document_url || null,
        supporting_documents: data.supporting_documents || null,
        legal_compliance_notes: data.legal_compliance_notes || null,
        notes: data.notes || null
      }
    });

    await prisma.compliance_sop_audit_logs.create({
      data: {
        record_id: newRecord.id,
        doc_name: newRecord.doc_name,
        action: 'CREATE',
        performed_by: req.user.full_name || 'System'
      }
    });

    res.status(201).json(newRecord);
  } catch (err) {
    next(err);
  }
});

router.put('/sop/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const recordId = parseInt(req.params.id);

    const existing = await prisma.compliance_sop.findUnique({ where: { id: recordId } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    if (!data.doc_name || !data.category || !data.pic) {
      return res.status(400).json({ error: 'Nama SOP/Policy, category, and PIC are required.' });
    }

    const updated = await prisma.compliance_sop.update({
      where: { id: recordId },
      data: {
        doc_name: data.doc_name,
        category: data.category,
        id_number: data.id_number || null,
        version: data.version || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        business_unit: data.business_unit || null,
        process_owner: data.process_owner || null,
        document_owner: data.document_owner || null,
        pic: data.pic,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        effective_date: data.effective_date ? new Date(data.effective_date) : null,
        review_date: data.review_date ? new Date(data.review_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        last_revision_date: data.last_revision_date ? new Date(data.last_revision_date) : null,
        doc_status: data.doc_status || 'Draft',
        risk_level: data.risk_level || null,
        document_classification: data.document_classification || null,
        confidentiality: data.confidentiality || 'Public',
        controlled_copy: data.controlled_copy || null,
        approval_status: data.approval_status || null,
        approval_authority: data.approval_authority || null,
        workflow_status: data.workflow_status || null,
        change_request_number: data.change_request_number || null,
        audit_requirement: data.audit_requirement || null,
        audit_status: data.audit_status || null,
        regulatory_reference: data.regulatory_reference || null,
        policy_objective: data.policy_objective || null,
        scope_of_application: data.scope_of_application || null,
        related_sop_policy: data.related_sop_policy || null,
        revision_notes: data.revision_notes || null,
        training_required: data.training_required || null,
        training_status: data.training_status || null,
        distribution_status: data.distribution_status || null,
        acknowledgement_status: data.acknowledgement_status || null,
        review_frequency: data.review_frequency || null,
        retention_period: data.retention_period || null,
        archive_status: data.archive_status || null,
        document_url: data.document_url || null,
        supporting_documents: data.supporting_documents || null,
        legal_compliance_notes: data.legal_compliance_notes || null,
        notes: data.notes || null,
        updated_at: new Date()
      }
    });

    await prisma.compliance_sop_audit_logs.create({
      data: {
        record_id: recordId,
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

router.delete('/sop/:id', allowWrite, async (req, res, next) => {
  try {
    const recordId = parseInt(req.params.id);
    const existing = await prisma.compliance_sop.findUnique({ where: { id: recordId } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    // Lepas relasi audit log dari record (bukan dihapus) agar riwayat tetap tersimpan,
    // baru catat aksi DELETE, lalu hapus record-nya untuk menghindari FK constraint
    await prisma.compliance_sop_audit_logs.updateMany({
      where: { record_id: recordId },
      data: { record_id: null }
    });

    await prisma.compliance_sop_audit_logs.create({
      data: {
        record_id: null,
        doc_name: existing.doc_name,
        action: 'DELETE',
        performed_by: req.user.full_name || 'System'
      }
    });

    await prisma.compliance_sop.delete({ where: { id: recordId } });

    res.json({ message: 'Record deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * NOTIFICATIONS — Jumlah dokumen per modul yang mendekati/lewat kadaluarsa (< 90 hari)
 * Dipakai untuk badge counter di Sidebar
 * ==========================================
 */
router.get('/notifications', allowRead, async (req, res, next) => {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const [genericDocs, licenseDocs, monitoringDocs, sopDocs] = await Promise.all([
      prisma.legal_documents.findMany({
        where: {
          module: { in: GENERIC_MODULES },
          expiry_date: { not: null, lt: ninetyDaysFromNow }
        },
        select: { module: true }
      }),
      prisma.compliance_licenses.count({
        where: {
          OR: [
            { expiry_date: { not: null, lt: ninetyDaysFromNow } },
            { next_audit_date: { not: null, lt: ninetyDaysFromNow } }
          ]
        }
      }),
      prisma.compliance_monitoring.count({
        where: {
          OR: [
            { due_date: { not: null, lt: ninetyDaysFromNow }, completion_date: null },
            { next_audit_date: { not: null, lt: ninetyDaysFromNow } }
          ]
        }
      }),
      prisma.compliance_sop.count({
        where: { expiry_date: { not: null, lt: ninetyDaysFromNow } }
      })
    ]);

    const perModule = {};
    genericDocs.forEach(d => {
      perModule[d.module] = (perModule[d.module] || 0) + 1;
    });
    if (licenseDocs > 0) perModule.license = licenseDocs;
    if (monitoringDocs > 0) perModule.monitoring = monitoringDocs;
    if (sopDocs > 0) perModule.sop = sopDocs;

    res.json({ total: genericDocs.length + licenseDocs + monitoringDocs + sopDocs, perModule });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * SUMMARY — Agregasi lintas modul untuk Compliance Dashboard
 * ==========================================
 */
router.get('/summary', allowRead, async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const genericWhere = { module: { in: GENERIC_MODULES } };
    const licenseWhere = {};
    const monitoringWhere = {};
    const sopWhere = {};
    if (companyId) {
      genericWhere.company_id = parseInt(companyId);
      licenseWhere.company_id = parseInt(companyId);
      monitoringWhere.company_id = parseInt(companyId);
      sopWhere.company_id = parseInt(companyId);
    }

    const [genericDocs, licenseDocs, monitoringDocs, sopDocs] = await Promise.all([
      prisma.legal_documents.findMany({
        where: genericWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.compliance_licenses.findMany({
        where: licenseWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.compliance_monitoring.findMany({
        where: monitoringWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.compliance_sop.findMany({
        where: sopWhere,
        include: { m_company: { select: { name: true } } }
      })
    ]);

    const allDocs = [...genericDocs, ...licenseDocs.map(licenseToDocShape), ...monitoringDocs.map(monitoringToDocShape), ...sopDocs.map(sopToDocShape)];
    const withStatus = allDocs.map(withCombinedUrgency);

    const kpi = {
      total: withStatus.length,
      active: withStatus.filter(d => d.doc_status === 'Active' || d.doc_status === 'Comply').length,
      expiringSoon: withStatus.filter(d => d.status === 'Warning' || d.status === 'Critical').length,
      expired: withStatus.filter(d => d.status === 'Expired').length
    };

    const byModule = COMPLIANCE_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: MODULE_LABELS[m],
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

    const byExpiryStatus = COMPLIANCE_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: MODULE_LABELS[m],
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
