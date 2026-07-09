const prisma = require('../../api/db');
const { withTimelineStatus, withAuditStatus, sortByDueDate } = require('./complianceHelper');

// GET List Monitoring
async function getMonitoring(req, res, next) {
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
}

// GET Monitoring Detail
async function getMonitoringDetail(req, res, next) {
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
}

// POST Create Monitoring
async function createMonitoring(req, res, next) {
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
}

// PUT Update Monitoring
async function updateMonitoring(req, res, next) {
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
}

// DELETE Monitoring
async function deleteMonitoring(req, res, next) {
  try {
    const recordId = parseInt(req.params.id);
    const existing = await prisma.compliance_monitoring.findUnique({ where: { id: recordId } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }

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
}

module.exports = {
  getMonitoring,
  getMonitoringDetail,
  createMonitoring,
  updateMonitoring,
  deleteMonitoring
};
