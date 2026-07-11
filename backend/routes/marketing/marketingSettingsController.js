const prisma = require('../../api/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /metadata
async function getMetadata(req, res, next) {
  try {
    const brands = await prisma.m_brand.findMany({ orderBy: { name: 'asc' } });
    const lobs = await prisma.m_line_business.findMany({ orderBy: { name: 'asc' } });
    const branches = await prisma.m_branch.findMany({ orderBy: { name: 'asc' } });
    const event_locations = await prisma.m_event_location.findMany({ orderBy: { name: 'asc' } });
    
    const marketingCoaNames = [
      'Advertising & Promotion Event',
      'Commision',
      'Cost Of Event',
      'Documentation',
      'Entertainment',
      'Gathering',
      'Selling Expenses',
      'Training',
      'Travelling Expenses',
      'Others',
      'Other'
    ];
    const coas = await prisma.m_coa.findMany({
      where: {
        name: { in: marketingCoaNames }
      },
      orderBy: { code: 'asc' }
    });

    const companies = await prisma.m_company.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: { m_company_master: { select: { id: true, name: true, sector: true } } }
    });

    const vendors = await prisma.vendors.findMany({
      orderBy: { vendor_name: 'asc' },
      select: { id: true, vendor_code: true, vendor_name: true }
    });

    res.json({ brands, lobs, branches, event_locations, coas, companies, vendors });
  } catch (err) {
    next(err);
  }
}

// GET /approval-contacts
async function getApprovalContacts(req, res, next) {
  try {
    const [contacts, holdings] = await Promise.all([
      prisma.approval_role_contacts.findMany({
        include: { m_company_master: { select: { id: true, name: true } } },
        orderBy: [{ role: 'asc' }, { company_master_id: 'asc' }]
      }),
      prisma.m_company_master.findMany({ orderBy: { name: 'asc' } })
    ]);
    res.json({ contacts, holdings });
  } catch (err) {
    next(err);
  }
}

// PUT /approval-contacts/:id
async function updateApprovalContact(req, res, next) {
  try {
    const { id } = req.params;
    const { email, label } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Email tujuan tidak valid.' });
    }

    const updated = await prisma.approval_role_contacts.update({
      where: { id: parseInt(id, 10) },
      data: { email, label, updated_at: new Date() }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /approval-contacts
async function createApprovalContact(req, res, next) {
  try {
    const { role, email, label, company_master_id } = req.body;

    if (!role || !email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Role dan email tujuan wajib diisi dengan benar.' });
    }
    if (!company_master_id) {
      return res.status(400).json({ error: 'Override wajib menentukan Holding Group. Untuk default global, ubah baris yang sudah ada.' });
    }

    const created = await prisma.approval_role_contacts.create({
      data: { role, email, label, company_master_id: parseInt(company_master_id, 10) }
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Override untuk role dan Holding Group ini sudah ada.' });
    }
    next(err);
  }
}

// DELETE /approval-contacts/:id
async function deleteApprovalContact(req, res, next) {
  try {
    const { id } = req.params;
    const contact = await prisma.approval_role_contacts.findUnique({ where: { id: parseInt(id, 10) } });

    if (!contact) {
      return res.status(404).json({ error: 'Konfigurasi tidak ditemukan.' });
    }
    if (!contact.company_master_id) {
      return res.status(400).json({ error: 'Baris default global tidak bisa dihapus, hanya bisa diubah.' });
    }

    await prisma.approval_role_contacts.delete({ where: { id: parseInt(id, 10) } });
    res.json({ message: 'Override berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
}

// POST /upload
async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { originalname, mimetype, buffer } = req.file;

    const newAttachment = await prisma.attachments.create({
      data: {
        filename: originalname,
        mime_type: mimetype,
        data: buffer
      }
    });

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const url = `${protocol}://${host}/api/marketing/attachments/${newAttachment.id}`;

    res.json({
      success: true,
      id: newAttachment.id,
      filename: originalname,
      mime_type: mimetype,
      url: url
    });
  } catch (err) {
    next(err);
  }
}

// GET /attachments/:id
async function serveAttachment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const attachment = await prisma.attachments.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).send('Document not found.');
    }

    res.setHeader('Content-Type', attachment.mime_type);
    if (attachment.mime_type.startsWith('image/') || attachment.mime_type === 'application/pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    }
    res.send(attachment.data);
  } catch (err) {
    next(err);
  }
}

// GET /branches
async function getBranches(req, res, next) {
  try {
    const branches = await prisma.m_branch.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(branches);
  } catch (err) {
    next(err);
  }
}

// POST /branches
async function createBranch(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama lokasi/cabang wajib diisi.' });
    }

    const existing = await prisma.m_branch.findUnique({
      where: { name: name.trim() }
    });
    if (existing) {
      return res.status(400).json({ error: 'Nama lokasi/cabang sudah terdaftar.' });
    }

    const branch = await prisma.m_branch.create({
      data: { name: name.trim() }
    });
    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
}

// PUT /branches/:id
async function updateBranch(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama lokasi/cabang wajib diisi.' });
    }

    const existing = await prisma.m_branch.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Nama lokasi/cabang sudah terdaftar.' });
    }

    const branch = await prisma.m_branch.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(branch);
  } catch (err) {
    next(err);
  }
}

// DELETE /branches/:id
async function deleteBranch(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const linked = await prisma.marketing_plan_items.findFirst({
      where: { branch_id: id }
    });
    if (linked) {
      return res.status(400).json({ error: 'Lokasi/cabang tidak bisa dihapus karena sedang digunakan dalam rencana anggaran.' });
    }

    await prisma.m_branch.delete({
      where: { id }
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /event-locations
async function getEventLocations(req, res, next) {
  try {
    const locations = await prisma.m_event_location.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

// POST /event-locations
async function createEventLocation(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama lokasi event wajib diisi.' });
    }

    const existing = await prisma.m_event_location.findUnique({
      where: { name: name.trim() }
    });
    if (existing) {
      return res.status(400).json({ error: 'Nama lokasi event sudah terdaftar.' });
    }

    const location = await prisma.m_event_location.create({
      data: { name: name.trim() }
    });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
}

// PUT /event-locations/:id
async function updateEventLocation(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama lokasi event wajib diisi.' });
    }

    const existing = await prisma.m_event_location.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Nama lokasi event sudah terdaftar.' });
    }

    const location = await prisma.m_event_location.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(location);
  } catch (err) {
    next(err);
  }
}

// DELETE /event-locations/:id
async function deleteEventLocation(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const linked = await prisma.marketing_plan_items.findFirst({
      where: { event_location_id: id }
    });
    if (linked) {
      return res.status(400).json({ error: 'Lokasi event tidak bisa dihapus karena sedang digunakan dalam rencana anggaran.' });
    }

    await prisma.m_event_location.delete({
      where: { id }
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /budgets
async function getBudgets(req, res, next) {
  try {
    const { company_id, brand_id, lob_id, fiscal_year } = req.query;
    const where = {};
    if (company_id) where.company_id = parseInt(company_id, 10);
    if (brand_id) where.brand_id = parseInt(brand_id, 10);
    if (lob_id) where.lob_id = parseInt(lob_id, 10);
    if (fiscal_year) where.fiscal_year = parseInt(fiscal_year, 10);

    const budgets = await prisma.m_marketing_budget.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        lob: { select: { id: true, name: true } },
        monthly_limits: { orderBy: { period_month: 'asc' } }
      },
      orderBy: { fiscal_year: 'desc' }
    });

    res.json(budgets);
  } catch (err) {
    next(err);
  }
}

// GET /budgets/check
async function checkBudgetAvailability(req, res, next) {
  try {
    const company_id = parseInt(req.query.company_id, 10);
    const brand_id = parseInt(req.query.brand_id, 10);
    const lob_id = parseInt(req.query.lob_id, 10);
    const fiscal_year = parseInt(req.query.fiscal_year, 10);

    if (!company_id || !brand_id || !lob_id || !fiscal_year) {
      return res.status(400).json({ error: 'Parameter company_id, brand_id, lob_id, dan fiscal_year wajib diisi.' });
    }

    const [budget, allPlans] = await Promise.all([
      prisma.m_marketing_budget.findUnique({
        where: { company_id_brand_id_lob_id_fiscal_year: { company_id, brand_id, lob_id, fiscal_year } },
        include: { monthly_limits: true }
      }),
      prisma.marketing_plans.findMany({
        where: { company_id, fiscal_year, status: { notIn: ['REJECTED'] } },
        include: { items: true, creator: { select: { id: true, name: true } } },
        orderBy: { created_at: 'desc' }
      })
    ]);

    const COMMITTED_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED'];
    const monthlyCommitted = Array.from({ length: 12 }, () => 0);
    const monthlyActual = Array.from({ length: 12 }, () => 0);

    for (const plan of allPlans) {
      const inCommitted = COMMITTED_STATUSES.includes(plan.status);
      for (const item of plan.items) {
        const itemBrandId = item.brand_id;
        const itemLobId = item.lob_id;
        if (itemBrandId !== brand_id || itemLobId !== lob_id) continue;
        const mIdx = item.period_month - 1;
        if (mIdx < 0 || mIdx >= 12) continue;
        if (inCommitted) monthlyCommitted[mIdx] += parseFloat(item.budget_amount || 0);
        monthlyActual[mIdx] += parseFloat(item.actual_amount || 0);
      }
    }

    const result = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const limitObj = budget ? budget.monthly_limits.find(ml => ml.period_month === monthNum) : null;
      const budgetLimit = limitObj ? parseFloat(limitObj.budget_limit || 0) : 0;
      const committed = monthlyCommitted[i];
      const actual = monthlyActual[i];

      return {
        month: monthNum,
        limit: budgetLimit,
        committed,
        actual,
        available: budgetLimit - committed,
        is_locked: budget ? budget.is_locked : false
      };
    });

    // Rencana yang punya minimal 1 item matching brand/lob ini
    const related_plans = allPlans
      .filter(p => p.items.some(item => item.brand_id === brand_id && item.lob_id === lob_id))
      .map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        total_budget: parseFloat(p.total_budget || 0),
        start_date: p.start_date,
        end_date: p.end_date,
        creator: p.creator
      }));

    res.json({
      is_locked: budget ? budget.is_locked : false,
      total_budget: budget ? parseFloat(budget.total_budget || 0) : 0,
      monthly: result,
      related_plans
    });
  } catch (err) {
    next(err);
  }
}

// GET /budgets/:id
async function getBudgetDetail(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const budget = await prisma.m_marketing_budget.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        lob: { select: { id: true, name: true } },
        monthly_limits: { orderBy: { period_month: 'asc' } }
      }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget control tidak ditemukan.' });
    }

    res.json(budget);
  } catch (err) {
    next(err);
  }
}

// POST /budgets
async function createBudget(req, res, next) {
  try {
    const { company_id, brand_id, lob_id, fiscal_year, total_budget, monthly_limits } = req.body;

    if (!company_id || !brand_id || !lob_id || !fiscal_year) {
      return res.status(400).json({ error: 'Perusahaan, Brand, LOB, dan Tahun Fiskal wajib diisi.' });
    }

    const existing = await prisma.m_marketing_budget.findUnique({
      where: {
        company_id_brand_id_lob_id_fiscal_year: {
          company_id: parseInt(company_id, 10),
          brand_id: parseInt(brand_id, 10),
          lob_id: parseInt(lob_id, 10),
          fiscal_year: parseInt(fiscal_year, 10)
        }
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Konfigurasi budget untuk entitas, brand, LOB, dan tahun fiskal ini sudah terdaftar.' });
    }

    const budget = await prisma.$transaction(async (tx) => {
      const bHeader = await tx.m_marketing_budget.create({
        data: {
          company_id: parseInt(company_id, 10),
          brand_id: parseInt(brand_id, 10),
          lob_id: parseInt(lob_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          total_budget: parseFloat(total_budget || 0)
        }
      });

      const monthlyData = [];
      for (let m = 1; m <= 12; m++) {
        const val = monthly_limits ? (monthly_limits.find(ml => ml.period_month === m)?.budget_limit || 0) : 0;
        monthlyData.push({
          marketing_budget_id: bHeader.id,
          period_month: m,
          budget_limit: parseFloat(val)
        });
      }

      await tx.m_marketing_budget_monthly.createMany({
        data: monthlyData
      });

      return bHeader;
    });

    res.status(201).json(budget);
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id
async function updateBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { total_budget, monthly_limits } = req.body;

    const existing = await prisma.m_marketing_budget.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Budget control tidak ditemukan.' });
    }

    if (existing.is_locked) {
      return res.status(400).json({ error: 'Anggaran telah dikunci (Locked). Buka kunci terlebih dahulu untuk mengubah.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bHeader = await tx.m_marketing_budget.update({
        where: { id },
        data: {
          total_budget: parseFloat(total_budget || 0)
        }
      });

      if (monthly_limits && Array.isArray(monthly_limits)) {
        for (const ml of monthly_limits) {
          await tx.m_marketing_budget_monthly.upsert({
            where: {
              marketing_budget_id_period_month: {
                marketing_budget_id: id,
                period_month: ml.period_month
              }
            },
            update: {
              budget_limit: parseFloat(ml.budget_limit || 0)
            },
            create: {
              marketing_budget_id: id,
              period_month: ml.period_month,
              budget_limit: parseFloat(ml.budget_limit || 0)
            }
          });
        }
      }

      return bHeader;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id/lock
async function lockBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await prisma.m_marketing_budget.update({
      where: { id },
      data: {
        is_locked: true,
        locked_at: new Date(),
        locked_by: req.user?.id ? String(req.user.id) : 'admin'
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id/unlock
async function unlockBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await prisma.m_marketing_budget.update({
      where: { id },
      data: {
        is_locked: false,
        locked_at: null,
        locked_by: null
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMetadata,
  getApprovalContacts,
  updateApprovalContact,
  createApprovalContact,
  deleteApprovalContact,
  uploadAttachment,
  serveAttachment,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getEventLocations,
  createEventLocation,
  updateEventLocation,
  deleteEventLocation,
  getBudgets,
  checkBudgetAvailability,
  getBudgetDetail,
  createBudget,
  updateBudget,
  lockBudget,
  unlockBudget
};
