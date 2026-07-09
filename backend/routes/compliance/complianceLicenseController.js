const prisma = require('../../api/db');
const { withExpiryStatus, withAuditStatus, sortByExpiry } = require('./complianceHelper');

// GET List Licenses
async function getLicenses(req, res, next) {
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
}

// GET License by ID
async function getLicenseDetail(req, res, next) {
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
}

// POST Create License
async function createLicense(req, res, next) {
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
}

// PUT Update License
async function updateLicense(req, res, next) {
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
}

// DELETE License
async function deleteLicense(req, res, next) {
  try {
    const licenseId = parseInt(req.params.id);
    const existing = await prisma.compliance_licenses.findUnique({ where: { id: licenseId } });
    if (!existing) {
      return res.status(404).json({ error: 'License not found.' });
    }

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
}

module.exports = {
  getLicenses,
  getLicenseDetail,
  createLicense,
  updateLicense,
  deleteLicense
};
