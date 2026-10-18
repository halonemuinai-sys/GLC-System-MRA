const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking
const allowRead = verifyToken;
const allowWrite = [verifyToken, checkRole(['admin', 'ga', 'legal', 'compliance', 'marketing', 'marketing_manager'])];


/**
 * ==========================================
 * SHARED HELPERS — companies, holdings, locations
 * ==========================================
 */
const SECTORS = ['GENERAL', 'RETAIL', 'FB', 'MEDIA', 'RADIO'];
const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const toId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };

// Every relation that points at m_company. Used for the usage breakdown and to
// decide whether a company may be hard-deleted.
const COMPANY_USAGE = {
  assets: 'Assets', vehicles: 'Vehicles', device_rentals: 'IT rentals', maintenances: 'Maintenance',
  vendors: 'Vendors', insurances: 'Insurance', documents: 'Documents', expense_budget: 'GA budgets',
  legal_documents: 'Legal documents', legal_litigation: 'Litigation', compliance_licenses: 'Licenses',
  compliance_monitoring: 'Compliance monitoring', compliance_sop: 'SOPs', marketing_plans: 'Marketing plans',
  marketing_budgets: 'Marketing budgets', m_branches: 'Marketing branches', m_brands: 'Brands',
  asset_disposals: 'Asset disposals', asset_handovers: 'Asset handovers', user_access: 'User access',
  approval_role_contacts: 'Approval contacts',
};
const COMPANY_COUNT_SELECT = Object.fromEntries(Object.keys(COMPANY_USAGE).map(k => [k, true]));
const usageSummary = (counts = {}) => {
  const items = Object.entries(counts).filter(([, n]) => n > 0).map(([key, n]) => ({ key, label: COMPANY_USAGE[key] || key, count: n }));
  return { items, total: items.reduce((s, i) => s + i.count, 0) };
};

/**
 * ==========================================
 * MASTER COMPANY GROUP (HOLDING) ENDPOINTS
 * ==========================================
 */

// GET /api/master/companies/master — holdings with how many companies, locations and contacts use them
router.get('/companies/master', allowRead, async (req, res, next) => {
  try {
    const masters = await prisma.m_company_master.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { companies: true, branches: true, approval_role_contacts: true } } }
    });
    res.json(masters.map(({ _count, ...m }) => ({
      ...m,
      company_count: _count.companies,
      branch_count: _count.branches,
      contact_count: _count.approval_role_contacts,
      can_delete: _count.companies + _count.branches + _count.approval_role_contacts === 0
    })));
  } catch (err) {
    next(err);
  }
});

async function parseHolding(body, excludeId) {
  const name = cleanStr(body.name, 150);
  const sector = cleanStr(body.sector, 50).toUpperCase();
  if (!name) return { error: 'Holding name is required.' };
  if (!SECTORS.includes(sector)) return { error: `Sector must be one of ${SECTORS.join(', ')}.` };
  const dup = await prisma.m_company_master.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
  if (dup) return { error: `Holding "${dup.name}" already exists.` };
  return { data: { name, sector } };
}

// POST /api/master/companies/master — Create new holding
router.post('/companies/master', allowWrite, async (req, res, next) => {
  try {
    const parsed = await parseHolding(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    res.status(201).json(await prisma.m_company_master.create({ data: parsed.data }));
  } catch (err) {
    next(err);
  }
});

// PUT /api/master/companies/master/:id — Update holding; its locations follow the new sector
router.put('/companies/master/:id', allowWrite, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const existing = id ? await prisma.m_company_master.findUnique({ where: { id } }) : null;
    if (!existing) return res.status(404).json({ error: 'Holding not found.' });
    const parsed = await parseHolding(req.body || {}, id);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const [master] = await prisma.$transaction([
      prisma.m_company_master.update({ where: { id }, data: parsed.data }),
      prisma.m_company_branch.updateMany({ where: { company_master_id: id }, data: { sector: parsed.data.sector } })
    ]);
    res.json(master);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/master/companies/master/:id — only when nothing is attached
// (deleting would silently detach its companies and cascade-delete holding-level approval contacts)
router.delete('/companies/master/:id', allowWrite, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const master = id ? await prisma.m_company_master.findUnique({ where: { id }, include: { _count: { select: { companies: true, branches: true, approval_role_contacts: true } } } }) : null;
    if (!master) return res.status(404).json({ error: 'Holding not found.' });
    const { companies, branches, approval_role_contacts: contacts } = master._count;
    if (companies + branches + contacts > 0) {
      const parts = [companies && `${companies} companies`, branches && `${branches} locations`, contacts && `${contacts} approval contacts`].filter(Boolean).join(', ');
      return res.status(409).json({ error: `"${master.name}" is still used by ${parts}. Move them to another holding first.` });
    }
    await prisma.m_company_master.delete({ where: { id } });
    res.json({ message: 'Holding deleted.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * MASTER COMPANY BRANCH (LOCATION) ENDPOINTS
 * ==========================================
 */

const BRANCH_INCLUDE = {
  m_company_master: true,
  _count: { select: { assets: true, maintenances: true, device_rentals: true } }
};
const withBranchUsage = ({ _count, ...b }) => {
  const used = (_count?.assets || 0) + (_count?.maintenances || 0) + (_count?.device_rentals || 0);
  return { ...b, asset_count: _count?.assets || 0, maintenance_count: _count?.maintenances || 0, rental_count: _count?.device_rentals || 0, usage_total: used, can_delete: used === 0 };
};

// GET /api/master/companies/branch — locations with usage counts
router.get('/companies/branch', allowRead, async (req, res, next) => {
  try {
    const { search = '', sector, is_active } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (is_active !== undefined && is_active !== '') where.is_active = is_active === 'true';
    if (sector && sector !== 'ALL') where.sector = sector.toUpperCase().trim();

    const branches = await prisma.m_company_branch.findMany({ where, include: BRANCH_INCLUDE, orderBy: [{ name: 'asc' }, { location: 'asc' }] });
    res.json(branches.map(withBranchUsage));
  } catch (err) {
    next(err);
  }
});

// Location sector always follows its holding when one is set.
async function parseBranch(body, current = {}) {
  const name = cleanStr(body.name ?? current.name, 150);
  const location = cleanStr(body.location ?? current.location, 200);
  if (!name || !location) return { error: 'Company name and location are required.' };
  const masterId = body.company_master_id !== undefined ? toId(body.company_master_id) : current.company_master_id ?? null;
  let sector = cleanStr(body.sector ?? current.sector, 50).toUpperCase();
  if (masterId) {
    const master = await prisma.m_company_master.findUnique({ where: { id: masterId } });
    if (!master) return { error: 'Holding not found.' };
    sector = master.sector;
  }
  if (!SECTORS.includes(sector)) return { error: `Sector must be one of ${SECTORS.join(', ')}.` };
  const dup = await prisma.m_company_branch.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, location: { equals: location, mode: 'insensitive' }, ...(current.id ? { NOT: { id: current.id } } : {}) }
  });
  if (dup) return { error: `"${dup.name} — ${dup.location}" already exists.` };
  return { data: { name, location, sector, company_master_id: masterId } };
}

// POST /api/master/companies/branch — Create new location
router.post('/companies/branch', allowWrite, async (req, res, next) => {
  try {
    const parsed = await parseBranch(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const branch = await prisma.m_company_branch.create({ data: { ...parsed.data, is_active: true }, include: BRANCH_INCLUDE });
    res.status(201).json(withBranchUsage(branch));
  } catch (err) {
    next(err);
  }
});

// PUT /api/master/companies/branch/:id — Update location (or toggle is_active)
router.put('/companies/branch/:id', allowWrite, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const current = id ? await prisma.m_company_branch.findUnique({ where: { id } }) : null;
    if (!current) return res.status(404).json({ error: 'Location not found.' });
    const body = req.body || {};
    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') return res.status(400).json({ error: 'Invalid active status.' });

    const onlyStatus = Object.keys(body).every(k => k === 'is_active');
    let data = {};
    if (!onlyStatus) {
      const parsed = await parseBranch(body, current);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      data = parsed.data;
    }
    if (body.is_active !== undefined) data.is_active = body.is_active;
    const branch = await prisma.m_company_branch.update({ where: { id }, data, include: BRANCH_INCLUDE });
    res.json(withBranchUsage(branch));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/master/companies/branch/:id — only when no asset, maintenance or rental uses it
router.delete('/companies/branch/:id', allowWrite, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const branch = id ? await prisma.m_company_branch.findUnique({ where: { id }, include: BRANCH_INCLUDE }) : null;
    if (!branch) return res.status(404).json({ error: 'Location not found.' });
    const u = withBranchUsage(branch);
    if (!u.can_delete) {
      const parts = [u.asset_count && `${u.asset_count} assets`, u.maintenance_count && `${u.maintenance_count} maintenance records`, u.rental_count && `${u.rental_count} IT rentals`].filter(Boolean).join(', ');
      return res.status(409).json({ error: `"${branch.name} — ${branch.location}" is used by ${parts}. Deactivate it instead.` });
    }
    await prisma.m_company_branch.delete({ where: { id } });
    res.json({ message: 'Location deleted.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * MASTER COMPANY (LEGAL ENTITY) ENDPOINTS
 * ==========================================
 */

// GET /api/master/companies — paginated companies with usage totals
router.get('/companies', allowRead, async (req, res, next) => {
  try {
    const { search = '', is_active, holding } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { npwp: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (is_active !== undefined && is_active !== '') where.is_active = is_active === 'true';
    if (holding === 'none') where.company_master_id = null;
    else if (toId(holding)) where.company_master_id = toId(holding);

    const [rows, total, summary] = await Promise.all([
      prisma.m_company.findMany({
        where,
        include: { m_company_master: true, _count: { select: COMPANY_COUNT_SELECT } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.m_company.count({ where }),
      Promise.all([
        prisma.m_company.count(),
        prisma.m_company.count({ where: { is_active: true } }),
        prisma.m_company.count({ where: { company_master_id: null } }),
        prisma.m_company_master.count()
      ])
    ]);

    res.json({
      data: rows.map(({ _count, ...c }) => {
        const usage = usageSummary(_count);
        return { ...c, usage_total: usage.total, can_delete: usage.total === 0 };
      }),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: { total: summary[0], active: summary[1], without_holding: summary[2], holdings: summary[3] }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/master/companies/all — Simple list for dropdowns (no pagination)
router.get('/companies/all', allowRead, async (req, res, next) => {
  try {
    const data = await prisma.m_company.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, company_master_id: true }
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/master/companies/:id — detail with a usage breakdown across every module
router.get('/companies/:id', allowRead, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const company = id ? await prisma.m_company.findUnique({ where: { id }, include: { m_company_master: true, _count: { select: COMPANY_COUNT_SELECT } } }) : null;
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    const { _count, ...rest } = company;
    const usage = usageSummary(_count);
    res.json({ ...rest, usage: usage.items, usage_total: usage.total, can_delete: usage.total === 0 });
  } catch (err) {
    next(err);
  }
});

// Code: trimmed, upper-case, unique (case-insensitive); empty → null.
// NPWP: optional; when given it must have 15 or 16 digits (punctuation allowed).
async function parseCompany(body, current = {}) {
  const name = cleanStr(body.name ?? current.name, 150);
  if (!name) return { error: 'Company name is required.' };
  const rawCode = body.code !== undefined ? body.code : current.code;
  const code = rawCode ? cleanStr(String(rawCode), 20).toUpperCase().replace(/\s+/g, '') : null;
  const rawNpwp = body.npwp !== undefined ? body.npwp : current.npwp;
  const npwp = rawNpwp ? cleanStr(String(rawNpwp), 30) : null;
  if (npwp && ![15, 16].includes(npwp.replace(/\D/g, '').length)) return { error: 'NPWP must contain 15 or 16 digits.' };
  const address = body.address !== undefined ? (cleanStr(body.address, 1000) || null) : current.address ?? null;
  const masterId = body.company_master_id !== undefined ? toId(body.company_master_id) : current.company_master_id ?? null;
  if (masterId && !(await prisma.m_company_master.findUnique({ where: { id: masterId }, select: { id: true } }))) return { error: 'Holding not found.' };

  const notSelf = current.id ? { NOT: { id: current.id } } : {};
  if (code) {
    const dupCode = await prisma.m_company.findFirst({ where: { code: { equals: code, mode: 'insensitive' }, ...notSelf } });
    if (dupCode) return { error: `Code ${code} is already used by ${dupCode.name}.`, status: 409 };
  }
  const dupName = await prisma.m_company.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...notSelf } });
  if (dupName) return { error: `A company named "${dupName.name}" already exists.`, status: 409 };
  return { data: { name, code, npwp, address, company_master_id: masterId } };
}

// POST /api/master/companies — Create new company
router.post('/companies', allowWrite, async (req, res, next) => {
  try {
    const parsed = await parseCompany(req.body || {});
    if (parsed.error) return res.status(parsed.status || 400).json({ error: parsed.error });
    res.status(201).json(await prisma.m_company.create({ data: { ...parsed.data, is_active: true } }));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Company code already exists.' });
    next(err);
  }
});

// PUT /api/master/companies/:id — Update company (or toggle is_active)
router.put('/companies/:id', allowWrite, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const current = id ? await prisma.m_company.findUnique({ where: { id } }) : null;
    if (!current) return res.status(404).json({ error: 'Company not found.' });
    const body = req.body || {};
    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') return res.status(400).json({ error: 'Invalid active status.' });

    const onlyStatus = Object.keys(body).every(k => k === 'is_active');
    let data = {};
    if (!onlyStatus) {
      const parsed = await parseCompany(body, current);
      if (parsed.error) return res.status(parsed.status || 400).json({ error: parsed.error });
      data = parsed.data;
    }
    if (body.is_active !== undefined) data.is_active = body.is_active;
    res.json(await prisma.m_company.update({ where: { id }, data }));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Company code already exists.' });
    next(err);
  }
});

// DELETE /api/master/companies/:id — permanent delete only for an unused company.
// Used companies are rejected with a breakdown; deactivate them via PUT is_active=false.
router.delete('/companies/:id', allowWrite, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const company = id ? await prisma.m_company.findUnique({ where: { id }, include: { _count: { select: COMPANY_COUNT_SELECT } } }) : null;
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    const usage = usageSummary(company._count);
    if (usage.total > 0) {
      const top = usage.items.sort((a, b) => b.count - a.count).slice(0, 4).map(i => `${i.count} ${i.label}`).join(', ');
      return res.status(409).json({ error: `${company.name} is used by ${top}${usage.items.length > 4 ? ' and more' : ''}. Deactivate it instead.`, usage: usage.items });
    }
    await prisma.m_company.delete({ where: { id } });
    res.json({ message: 'Company deleted.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * SEED: Populate companies & branches from Helpdesk MRA
 * ==========================================
 */
router.post('/companies/seed', verifyToken, checkRole(['admin']), async (req, res, next) => {
  try {
    // 1. Seed Master Company Groupings (PT Induk)
    const masterData = [
      { name: 'PT Mugi Rekso Abadi', sector: 'GENERAL' },
      { name: 'PT Media Insani Abadi', sector: 'MEDIA' },
      { name: 'PT Emera Boga Makmur', sector: 'FB' },
      { name: 'PT Surya Swara Mediatama', sector: 'RADIO' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL' }
    ];

    const masterMap = {};

    for (const m of masterData) {
      let masterRecord = await prisma.m_company_master.findFirst({
        where: { name: m.name }
      });

      if (!masterRecord) {
        masterRecord = await prisma.m_company_master.create({
          data: {
            name: m.name,
            sector: m.sector
          }
        });
      }
      masterMap[m.sector] = masterRecord.id;
    }

    // 2. Seed Original Companies List (PT-PT Utama / Tab 1)
    const companies = [
      { code: 'MRA', name: 'PT Mugi Rekso Abadi', sector: 'GENERAL' },
      { code: 'PKA', name: 'PT Paramita Kreasi Abadi', sector: 'GENERAL' },
      { code: 'EDI', name: 'PT Emera Digital Indonesia', sector: 'GENERAL' },
      { code: 'AAA', name: 'PT Amanda Arumdhani Aishwarya', sector: 'GENERAL' },
      { code: 'GEA', name: 'PT Graha Emera Abadi', sector: 'GENERAL' },
      { code: 'PLA', name: 'PT Permata Landmarq Abadi', sector: 'GENERAL' },
      { code: 'MC', name: 'Medical Claim', sector: 'GENERAL' },
      { code: 'MIA', name: 'PT Media Insani Abadi', sector: 'MEDIA' },
      { code: 'AJSK', name: 'PT Artindo Jakarta Seni Kini', sector: 'MEDIA' },
      { code: 'RKAB', name: 'PT Rupa Kreasi Anak Bangsa', sector: 'MEDIA' },
      { code: 'JPI', name: 'PT Jemma Putri International', sector: 'MEDIA' },
      { code: 'EBM', name: 'PT Emera Boga Makmur', sector: 'FB' },
      { code: 'RAD', name: 'PT Rahayu Arumdhani Distribusindo', sector: 'FB' },
      { code: 'RAI', name: 'PT Rahayu Arumdhani International', sector: 'FB' },
      { code: 'SSM', name: 'PT Surya Swara Mediatama', sector: 'RADIO' },
      { code: 'RSK', name: 'PT Radio Suara Kedjajaan', sector: 'RADIO' },
      { code: 'RAND', name: 'PT Radio Antar Nusa Djaja', sector: 'RADIO' },
      { code: 'HIP', name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL' },
      { code: 'HIS', name: 'PT Hourlogy Inti Semesta', sector: 'RETAIL' },
      { code: 'MPI', name: 'PT Mogems Putri International', sector: 'RETAIL' }
    ];

    let compCreated = 0;
    let compSkipped = 0;

    for (const c of companies) {
      const masterId = c.sector ? (masterMap[c.sector.toUpperCase()] || null) : null;
      const existing = await prisma.m_company.findFirst({
        where: { name: c.name }
      });

      if (existing) {
        // Update relation mapping for existing seed company
        await prisma.m_company.update({
          where: { id: existing.id },
          data: { company_master_id: masterId }
        });
        compSkipped++;
        continue;
      }

      await prisma.m_company.create({
        data: {
          code: c.code,
          name: c.name,
          company_master_id: masterId,
          is_active: true
        }
      });
      compCreated++;
    }

    // 3. Seed Branches (Tab 3)
    const branchesData = [
      { name: 'Medical Claim', sector: 'GENERAL', location: 'HQ' },
      { name: 'PT Amanda Arumdhani Aishwarya', sector: 'GENERAL', location: 'Head Office' },
      { name: 'PT Emera Boga Makmur', sector: 'FB', location: 'HQ' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Plaza Indonesia' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Plaza Senayan' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Mall Kelapa Gading 3' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Tunjungan Plaza 4 Surabaya' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Head Office' },
      { name: 'PT Hourlogy Inti Semesta', sector: 'RETAIL', location: 'Service Center' },
      { name: 'PT Hourlogy Inti Semesta', sector: 'RETAIL', location: 'Head Office' },
      { name: 'PT Jemma Putri International', sector: 'MEDIA', location: 'HQ' },
      { name: 'PT Mogems Putri International', sector: 'RETAIL', location: 'Head Office' }
    ];

    let branchCreated = 0;
    let branchSkipped = 0;

    for (const b of branchesData) {
      const existing = await prisma.m_company_branch.findFirst({
        where: { name: b.name, location: b.location }
      });

      if (existing) {
        branchSkipped++;
        continue;
      }

      const masterId = masterMap[b.sector] || null;

      await prisma.m_company_branch.create({
        data: {
          name: b.name,
          location: b.location,
          sector: b.sector,
          company_master_id: masterId,
          is_active: true
        }
      });
      branchCreated++;
    }

    res.json({ 
      message: `Seed completed. Companies: ${compCreated} created, ${compSkipped} skipped. Branches: ${branchCreated} created, ${branchSkipped} skipped.`,
      totalCompanies: companies.length,
      totalBranches: branchesData.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * MASTER BRAND / MEREK ENDPOINTS
 * ==========================================
 */

// GET /api/master/brands — List all brands (with pagination/search)
router.get('/brands', allowRead, async (req, res, next) => {
  try {
    const { search = '', company_id, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (company_id) {
      where.company_id = parseInt(company_id, 10);
    }

    const [data, total] = await Promise.all([
      prisma.m_brand.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          m_company: { select: { id: true, name: true, code: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.m_brand.count({ where })
    ]);

    res.json({
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/master/brands — Create new brand
router.post('/brands', allowWrite, async (req, res, next) => {
  try {
    const { name, company_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama brand / merek wajib diisi.' });
    }

    const parsedCompanyId = company_id ? parseInt(company_id, 10) : null;
    const trimmedName = name.trim();

    // Check if brand already exists (case-insensitive)
    const existing = await prisma.m_brand.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
      include: {
        m_company: { select: { id: true, name: true, code: true } }
      }
    });

    if (existing) {
      if (!existing.company_id && parsedCompanyId) {
        const updated = await prisma.m_brand.update({
          where: { id: existing.id },
          data: { company_id: parsedCompanyId },
          include: {
            m_company: { select: { id: true, name: true, code: true } }
          }
        });
        return res.status(200).json(updated);
      }
      return res.status(200).json(existing);
    }

    const brand = await prisma.m_brand.create({
      data: {
        name: trimmedName,
        company_id: parsedCompanyId
      },
      include: {
        m_company: { select: { id: true, name: true, code: true } }
      }
    });

    res.status(201).json(brand);
  } catch (err) {
    next(err);
  }
});

// PUT /api/master/brands/:id — Update brand
router.put('/brands/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama brand / merek wajib diisi.' });
    }

    const dataToUpdate = { name: name.trim() };
    if (company_id !== undefined) {
      dataToUpdate.company_id = company_id ? parseInt(company_id, 10) : null;
    }

    const brand = await prisma.m_brand.update({
      where: { id: parseInt(id, 10) },
      data: dataToUpdate,
      include: {
        m_company: { select: { id: true, name: true, code: true } }
      }
    });

    res.json(brand);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/master/brands/:id — Delete brand
router.delete('/brands/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if brand is referenced in marketing items
    const linkedItems = await prisma.marketing_plan_items.count({
      where: { brand_id: parseInt(id) }
    });

    if (linkedItems > 0) {
      return res.status(400).json({ error: 'Cannot delete brand as it is linked to marketing plans.' });
    }

    await prisma.m_brand.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Brand deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * MASTER LINE OF BUSINESS (LOB) ENDPOINTS
 * ==========================================
 */

// GET /api/master/lobs — List all LOBs (with pagination/search) plus usage counts
router.get('/lobs', allowRead, async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [rows, total, usedTotal] = await Promise.all([
      prisma.m_line_business.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { items: true, marketing_budgets: true } } }
      }),
      prisma.m_line_business.count({ where }),
      prisma.m_line_business.count({ where: { ...where, OR: [{ items: { some: {} } }, { marketing_budgets: { some: {} } }] } })
    ]);

    const data = rows.map(({ _count, ...lob }) => ({
      ...lob,
      plan_item_count: _count.items,
      budget_count: _count.marketing_budgets,
      can_delete: _count.items === 0 && _count.marketing_budgets === 0
    }));

    res.json({
      data,
      meta: { total, used: usedTotal, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    next(err);
  }
});

const cleanLobName = value => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');
async function lobNameError(name, excludeId) {
  if (!name) return 'Nama Line of Business wajib diisi.';
  if (name.length > 100) return 'Nama Line of Business maksimal 100 karakter.';
  const duplicate = await prisma.m_line_business.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { NOT: { id: excludeId } } : {}) }
  });
  return duplicate ? `Line of Business "${duplicate.name}" sudah ada.` : null;
}

// POST /api/master/lobs — Create new LOB
router.post('/lobs', allowWrite, async (req, res, next) => {
  try {
    const name = cleanLobName(req.body?.name);
    const error = await lobNameError(name);
    if (error) return res.status(400).json({ error });

    const lob = await prisma.m_line_business.create({ data: { name } });
    res.status(201).json(lob);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Line of Business dengan nama ini sudah ada.' });
    next(err);
  }
});

// PUT /api/master/lobs/:id — Update LOB
router.put('/lobs/:id', allowWrite, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = Number.isInteger(id) ? await prisma.m_line_business.findUnique({ where: { id } }) : null;
    if (!existing) return res.status(404).json({ error: 'Line of Business tidak ditemukan.' });

    const name = cleanLobName(req.body?.name);
    const error = await lobNameError(name, id);
    if (error) return res.status(400).json({ error });

    const lob = await prisma.m_line_business.update({ where: { id }, data: { name } });
    res.json(lob);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Line of Business dengan nama ini sudah ada.' });
    next(err);
  }
});

// DELETE /api/master/lobs/:id — Delete LOB (blocked while used by plans or budgets)
router.delete('/lobs/:id', allowWrite, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lob = Number.isInteger(id) ? await prisma.m_line_business.findUnique({ where: { id } }) : null;
    if (!lob) return res.status(404).json({ error: 'Line of Business tidak ditemukan.' });

    const [planItems, budgets] = await Promise.all([
      prisma.marketing_plan_items.count({ where: { lob_id: id } }),
      prisma.m_marketing_budget.count({ where: { lob_id: id } })
    ]);
    if (planItems > 0 || budgets > 0) {
      const usedIn = [planItems && `${planItems} item marketing plan`, budgets && `${budgets} budget`].filter(Boolean).join(' dan ');
      return res.status(409).json({ error: `"${lob.name}" tidak bisa dihapus karena dipakai di ${usedIn}. Ubah namanya bila perlu.` });
    }

    await prisma.m_line_business.delete({ where: { id } });
    res.json({ message: 'Line of Business dihapus.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
