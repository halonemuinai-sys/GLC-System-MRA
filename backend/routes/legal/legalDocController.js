const prisma = require('../../api/db');
const { LEGAL_GENERIC_MODULES, withExpiryStatus, sortByExpiry } = require('./legalHelper');

// GET /legal-docs
async function getLegalDocs(req, res, next) {
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
}

// GET /legal-docs/:id
async function getLegalDocDetail(req, res, next) {
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
}

// POST /legal-docs
async function createLegalDoc(req, res, next) {
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
}

// PUT /legal-docs/:id
async function updateLegalDoc(req, res, next) {
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
}

// DELETE /legal-docs/:id
async function deleteLegalDoc(req, res, next) {
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
}

module.exports = {
  getLegalDocs,
  getLegalDocDetail,
  createLegalDoc,
  updateLegalDoc,
  deleteLegalDoc
};
