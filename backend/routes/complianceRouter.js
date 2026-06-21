const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken; 
const allowWrite = [verifyToken, checkRole(['admin', 'compliance', 'legal_compliance'])];

/**
 * ==========================================
 * DASHBOARD STATS
 * ==========================================
 */
router.get('/dashboard-stats', allowRead, async (req, res, next) => {
  try {
    const totalLicenses = await prisma.legal_documents.count({
      where: { module: 'compliance' }
    });

    const activeLicenses = await prisma.legal_documents.count({
      where: {
        module: 'compliance',
        doc_status: 'Active'
      }
    });

    // Count expiring licenses within 60 days
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    const expiringLicenses = await prisma.legal_documents.count({
      where: {
        module: 'compliance',
        expiry_date: {
          gte: new Date(),
          lte: sixtyDaysFromNow
        },
        doc_status: 'Active'
      }
    });

    const totalAudits = await prisma.legal_audit_logs.count({
      where: { module: 'compliance' }
    });

    res.json({
      totalLicenses,
      activeLicenses,
      expiringLicenses,
      totalAudits
    });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * COMPLIANCE LICENSES (LEGAL_DOCUMENTS) ENDPOINTS
 * ==========================================
 */
router.get('/licenses', allowRead, async (req, res, next) => {
  try {
    const { search = '', category, companyId, docStatus, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      module: 'compliance'
    };

    if (search) {
      where.OR = [
        { doc_name: { contains: search, mode: 'insensitive' } },
        { id_number: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.category = category;
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }
    if (docStatus) {
      where.doc_status = docStatus;
    }

    const [list, count] = await Promise.all([
      prisma.legal_documents.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_company: true
        }
      }),
      prisma.legal_documents.count({ where })
    ]);

    res.json({
      data: list,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/licenses/:id', allowRead, async (req, res, next) => {
  try {
    const license = await prisma.legal_documents.findFirst({
      where: {
        id: parseInt(req.params.id),
        module: 'compliance'
      },
      include: {
        m_company: true,
        legal_audit_logs: {
          orderBy: { performed_at: 'desc' }
        }
      }
    });

    if (!license) {
      return res.status(404).json({ error: 'Compliance license not found.' });
    }

    res.json(license);
  } catch (err) {
    next(err);
  }
});

router.post('/licenses', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.doc_name || !data.category) {
      return res.status(400).json({ error: 'License document name and category are required.' });
    }

    // Buat dokumen baru dengan module dipaksa ke 'compliance'
    const newLicense = await prisma.legal_documents.create({
      data: {
        module: 'compliance',
        doc_name: data.doc_name,
        category: data.category,
        id_number: data.id_number || null,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        pic: data.pic || req.user.full_name || 'System',
        company_id: data.company_id ? parseInt(data.company_id) : null,
        doc_status: data.doc_status || 'Active',
        confidentiality: data.confidentiality || 'Public/Internal',
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        notes: data.notes || null
      }
    });

    // Buat audit log secara otomatis
    await prisma.legal_audit_logs.create({
      data: {
        document_id: newLicense.id,
        doc_name: newLicense.doc_name,
        module: 'compliance',
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

    // Pastikan dokumen itu adalah compliance
    const existing = await prisma.legal_documents.findFirst({
      where: { id: licenseId, module: 'compliance' }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Compliance license not found.' });
    }

    const updated = await prisma.legal_documents.update({
      where: { id: licenseId },
      data: {
        doc_name: data.doc_name !== undefined ? data.doc_name : undefined,
        category: data.category !== undefined ? data.category : undefined,
        id_number: data.id_number !== undefined ? data.id_number : undefined,
        issue_date: data.issue_date !== undefined ? (data.issue_date ? new Date(data.issue_date) : null) : undefined,
        expiry_date: data.expiry_date !== undefined ? (data.expiry_date ? new Date(data.expiry_date) : null) : undefined,
        pic: data.pic !== undefined ? data.pic : undefined,
        company_id: data.company_id !== undefined ? (data.company_id ? parseInt(data.company_id) : null) : undefined,
        doc_status: data.doc_status !== undefined ? data.doc_status : undefined,
        confidentiality: data.confidentiality !== undefined ? data.confidentiality : undefined,
        file_url: data.file_url !== undefined ? data.file_url : undefined,
        file_name: data.file_name !== undefined ? data.file_name : undefined,
        notes: data.notes !== undefined ? data.notes : undefined
      }
    });

    // Buat audit log update
    await prisma.legal_audit_logs.create({
      data: {
        document_id: licenseId,
        doc_name: updated.doc_name,
        module: 'compliance',
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
    const existing = await prisma.legal_documents.findFirst({
      where: { id: licenseId, module: 'compliance' }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Compliance license not found.' });
    }

    // Hapus audit log terkait dulu karena relasi foreign key
    await prisma.legal_audit_logs.deleteMany({
      where: { document_id: licenseId }
    });

    await prisma.legal_documents.delete({
      where: { id: licenseId }
    });

    res.json({ message: 'Compliance license deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * AUDIT LOGS ENDPOINTS
 * ==========================================
 */
router.get('/audit-logs', allowRead, async (req, res, next) => {
  try {
    const logs = await prisma.legal_audit_logs.findMany({
      where: { module: 'compliance' },
      orderBy: { performed_at: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
