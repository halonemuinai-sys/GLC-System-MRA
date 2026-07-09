const prisma = require('../../api/db');
const { GENERIC_MODULES, withExpiryStatus, sortByExpiry } = require('./complianceHelper');

// GET List Documents
async function getDocuments(req, res, next) {
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
}

// GET Document by ID
async function getDocumentDetail(req, res, next) {
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
}

// POST Create Document
async function createDocument(req, res, next) {
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
}

// POST Bulk Import Documents
async function bulkImportDocuments(req, res, next) {
  try {
    const { module, documents } = req.body;
    if (!module || !GENERIC_MODULES.includes(module)) {
      return res.status(400).json({ error: 'Valid module is required.' });
    }
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Documents array is required and cannot be empty.' });
    }

    const companies = await prisma.m_company.findMany({
      select: { id: true, name: true }
    });

    const companyMap = {};
    companies.forEach(c => {
      const key = c.name.trim().toLowerCase();
      companyMap[key] = c.id;
    });

    const errors = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const rowNum = i + 1;
      
      if (!doc.doc_name || !doc.category || !doc.pic) {
        errors.push(`Baris ${rowNum}: Nama Dokumen, Kategori, dan PIC wajib diisi.`);
        continue;
      }
      
      if (doc.company_name) {
        const compKey = doc.company_name.trim().toLowerCase();
        if (!companyMap[compKey]) {
          errors.push(`Baris ${rowNum}: Perusahaan "${doc.company_name}" tidak ditemukan di master data.`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const createdDocs = await prisma.$transaction(async (tx) => {
      const inserted = [];
      for (const doc of documents) {
        let companyId = null;
        if (doc.company_name) {
          const compKey = doc.company_name.trim().toLowerCase();
          companyId = companyMap[compKey];
        }

        const newDoc = await tx.legal_documents.create({
          data: {
            module,
            doc_name: doc.doc_name,
            category: doc.category,
            id_number: doc.id_number || null,
            issue_date: doc.issue_date ? new Date(doc.issue_date) : null,
            expiry_date: doc.expiry_date ? new Date(doc.expiry_date) : null,
            pic: doc.pic,
            company_id: companyId,
            doc_status: doc.doc_status || 'Draft',
            confidentiality: doc.confidentiality || 'Public/Internal',
            file_url: doc.file_url || null,
            notes: doc.notes || null
          }
        });

        await tx.legal_audit_logs.create({
          data: {
            document_id: newDoc.id,
            doc_name: newDoc.doc_name,
            module: newDoc.module,
            action: 'CREATE',
            performed_by: req.user.full_name || 'System'
          }
        });

        inserted.push(newDoc);
      }
      return inserted;
    });

    res.status(201).json({ message: `Berhasil mengimpor ${createdDocs.length} dokumen.`, data: createdDocs });
  } catch (err) {
    next(err);
  }
}

// PUT Update Document
async function updateDocument(req, res, next) {
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
}

// DELETE Document
async function deleteDocument(req, res, next) {
  try {
    const docId = parseInt(req.params.id);
    const existing = await prisma.legal_documents.findFirst({
      where: { id: docId, module: { in: GENERIC_MODULES } }
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
  getDocuments,
  getDocumentDetail,
  createDocument,
  bulkImportDocuments,
  updateDocument,
  deleteDocument
};
