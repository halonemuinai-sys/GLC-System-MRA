const prisma = require('../../api/db');

// GET /documents
async function getContracts(req, res, next) {
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
}

// GET /documents/:id
async function getContractDetail(req, res, next) {
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
}

// POST /documents
async function createContract(req, res, next) {
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
}

// PUT /documents/:id
async function updateContract(req, res, next) {
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
}

// DELETE /documents/:id
async function deleteContract(req, res, next) {
  try {
    await prisma.documents.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getContracts,
  getContractDetail,
  createContract,
  updateContract,
  deleteContract
};
