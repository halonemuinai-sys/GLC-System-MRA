const prisma = require('../../api/db');
const { withExpiryStatus, sortByExpiry } = require('./complianceHelper');

// GET List SOP
async function getSop(req, res, next) {
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
}

// GET SOP Detail
async function getSopDetail(req, res, next) {
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
}

// POST Create SOP
async function createSop(req, res, next) {
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
}

// PUT Update SOP
async function updateSop(req, res, next) {
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
}

// DELETE SOP
async function deleteSop(req, res, next) {
  try {
    const recordId = parseInt(req.params.id);
    const existing = await prisma.compliance_sop.findUnique({ where: { id: recordId } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }

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
}

module.exports = {
  getSop,
  getSopDetail,
  createSop,
  updateSop,
  deleteSop
};
