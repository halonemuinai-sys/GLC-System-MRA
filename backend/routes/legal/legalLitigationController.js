const prisma = require('../../api/db');
const { withHearingStatus, sortByHearing } = require('./legalHelper');

// GET /litigation
async function getLitigation(req, res, next) {
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
}

// GET /litigation/:id
async function getLitigationDetail(req, res, next) {
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
}

// POST /litigation
async function createLitigation(req, res, next) {
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
}

// PUT /litigation/:id
async function updateLitigation(req, res, next) {
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
}

// DELETE /litigation/:id
async function deleteLitigation(req, res, next) {
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
}

module.exports = {
  getLitigation,
  getLitigationDetail,
  createLitigation,
  updateLitigation,
  deleteLitigation
};
