const prisma = require('../../api/db');

// A ticket belongs to the month of its service date (expired_date); tickets without
// one fall back to the month they were created.
const periodWhere = (start, end) => ({
  OR: [
    { expired_date: { gte: start, lt: end } },
    { expired_date: null, created_at: { gte: start, lt: end } }
  ]
});

function parseMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

function baseFilter({ search, status, companyId }) {
  const where = {};
  if (search) {
    where.OR = [
      { asset_name: { contains: search, mode: 'insensitive' } },
      { detail: { contains: search, mode: 'insensitive' } },
      { pic: { contains: search, mode: 'insensitive' } },
      { service_type: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (status) where.status = status;
  if (companyId) where.company_id = parseInt(companyId);
  return where;
}

const isDone = status => ['selesai', 'completed'].includes(String(status || '').toLowerCase());

// GET List Maintenances
async function getMaintenances(req, res, next) {
  try {
    const { search = '', page = 1, limit = 10, status, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { asset_name: { contains: search, mode: 'insensitive' } },
        { detail: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } },
        { service_type: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }
    const monthRange = parseMonth(req.query.month);
    if (monthRange) where.AND = [periodWhere(monthRange.start, monthRange.end)];

    const [list, count, costAggregate, pendingCount, completedCount, companyGroup] = await Promise.all([
      prisma.maintenances.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          assets: true,
          m_company: true,
          m_location: true,
          vendors: true
        }
      }),
      prisma.maintenances.count({ where }),
      prisma.maintenances.aggregate({
        where,
        _sum: {
          total_cost: true
        }
      }),
      prisma.maintenances.count({
        where: {
          ...where,
          status: { in: ['Pending', 'Proses', 'pending', 'proses', 'PENDING', 'PROSES'] }
        }
      }),
      prisma.maintenances.count({
        where: {
          ...where,
          status: { in: ['Selesai', 'Completed', 'selesai', 'completed', 'SELESAI', 'COMPLETED'] }
        }
      }),
      prisma.maintenances.groupBy({
        by: ['company_id'],
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
        totalCost: costAggregate._sum.total_cost || 0,
        pendingCount,
        completedCount,
        uniqueCompaniesCount: companyGroup.length
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST Create Maintenance
async function createMaintenance(req, res, next) {
  try {
    const data = req.body;
    if (!data.company_id || !data.service_type) {
      return res.status(400).json({ error: 'Company ID and service type are required.' });
    }

    const newMaint = await prisma.maintenances.create({
      data: {
        company_id: parseInt(data.company_id),
        location_id: data.location_id ? parseInt(data.location_id) : null,
        room_area: data.room_area || null,
        asset_id: data.asset_id ? parseInt(data.asset_id) : null,
        asset_name: data.asset_name || null,
        detail: data.detail || null,
        pic: data.pic || null,
        service_type: data.service_type,
        expired_date: data.expired_date ? new Date(data.expired_date) : null,
        qty: data.qty ? parseInt(data.qty) : 1,
        est_cost: data.est_cost ? parseFloat(data.est_cost) : 0,
        total_cost: data.total_cost ? parseFloat(data.total_cost) : 0,
        vendor_id: data.vendor_id ? parseInt(data.vendor_id) : null,
        status: data.status || 'Pending',
        information: data.information || null,
        reference_link: data.reference_link || null
      }
    });
    res.status(201).json(newMaint);
  } catch (err) {
    next(err);
  }
}

// PUT Update Maintenance
async function updateMaintenance(req, res, next) {
  try {
    const data = req.body;
    const updated = await prisma.maintenances.update({
      where: { id: parseInt(req.params.id) },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        location_id: data.location_id !== undefined ? (data.location_id ? parseInt(data.location_id) : null) : undefined,
        room_area: data.room_area !== undefined ? data.room_area : undefined,
        asset_id: data.asset_id !== undefined ? (data.asset_id ? parseInt(data.asset_id) : null) : undefined,
        asset_name: data.asset_name !== undefined ? data.asset_name : undefined,
        detail: data.detail !== undefined ? data.detail : undefined,
        pic: data.pic !== undefined ? data.pic : undefined,
        service_type: data.service_type !== undefined ? data.service_type : undefined,
        expired_date: data.expired_date !== undefined ? (data.expired_date ? new Date(data.expired_date) : null) : undefined,
        qty: data.qty !== undefined ? (data.qty ? parseInt(data.qty) : null) : undefined,
        est_cost: data.est_cost !== undefined ? parseFloat(data.est_cost) : undefined,
        total_cost: data.total_cost !== undefined ? parseFloat(data.total_cost) : undefined,
        vendor_id: data.vendor_id !== undefined ? (data.vendor_id ? parseInt(data.vendor_id) : null) : undefined,
        status: data.status !== undefined ? data.status : undefined,
        information: data.information !== undefined ? data.information : undefined,
        reference_link: data.reference_link !== undefined ? data.reference_link : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE Maintenance
async function deleteMaintenance(req, res, next) {
  try {
    await prisma.maintenances.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Maintenance record deleted.' });
  } catch (err) {
    next(err);
  }
}

// GET /maintenances/journey?year=2026 — monthly totals plus a company x month matrix,
// using the same search/status/company filters as the list.
async function getMaintenanceJourney(req, res, next) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const rows = await prisma.maintenances.findMany({
      where: { ...baseFilter(req.query), AND: [periodWhere(start, end)] },
      select: { company_id: true, expired_date: true, created_at: true, total_cost: true, status: true, m_company: { select: { name: true } } }
    });

    const emptyMonth = () => ({ count: 0, cost: 0, done: 0, open: 0 });
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ...emptyMonth() }));
    const companies = new Map();
    for (const row of rows) {
      const m = new Date(row.expired_date || row.created_at).getUTCMonth();
      const cost = Number(row.total_cost || 0);
      const done = isDone(row.status);
      if (!companies.has(row.company_id)) {
        companies.set(row.company_id, { company_id: row.company_id, name: row.m_company?.name || '-', months: Array.from({ length: 12 }, emptyMonth), count: 0, cost: 0 });
      }
      const company = companies.get(row.company_id);
      for (const bucket of [months[m], company.months[m]]) {
        bucket.count += 1;
        bucket.cost += cost;
        bucket[done ? 'done' : 'open'] += 1;
      }
      company.count += 1;
      company.cost += cost;
    }

    res.json({
      year,
      months,
      companies: [...companies.values()].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name)),
      total: { count: rows.length, cost: months.reduce((sum, m) => sum + m.cost, 0) }
    });
  } catch (err) {
    next(err);
  }
}

// GET /maintenances/asset-marks?companyId=1 — maintenance history per asset, used to
// flag assets in the bulk picker that were already serviced.
async function getAssetMaintenanceMarks(req, res, next) {
  try {
    const companyId = parseInt(req.query.companyId);
    if (!companyId) return res.status(400).json({ error: 'companyId is required.' });
    const rows = await prisma.maintenances.findMany({
      where: { company_id: companyId, asset_id: { not: null } },
      select: { asset_id: true, expired_date: true, created_at: true, status: true }
    });
    const marks = {};
    for (const row of rows) {
      const date = row.expired_date || row.created_at;
      const mark = marks[row.asset_id] || (marks[row.asset_id] = { count: 0, open: 0, last_date: null });
      mark.count += 1;
      if (!isDone(row.status)) mark.open += 1;
      if (date && (!mark.last_date || new Date(date) > new Date(mark.last_date))) mark.last_date = date;
    }
    res.json(marks);
  } catch (err) {
    next(err);
  }
}

// POST /maintenances/bulk — one ticket per selected asset of a single company,
// sharing the same service details. Cost fields are per asset.
async function createBulkMaintenance(req, res, next) {
  try {
    const data = req.body || {};
    const companyId = parseInt(data.company_id);
    const assetIds = [...new Set((Array.isArray(data.asset_ids) ? data.asset_ids : []).map(Number).filter(Number.isInteger))];
    if (!companyId || !data.service_type) return res.status(400).json({ error: 'Company and service type are required.' });
    if (!assetIds.length) return res.status(400).json({ error: 'Select at least one asset.' });
    if (assetIds.length > 200) return res.status(400).json({ error: 'Maximum 200 assets per bulk request.' });

    const assets = await prisma.assets.findMany({
      where: { id: { in: assetIds }, company_id: companyId },
      select: { id: true, asset_name: true, location_id: true, room: true }
    });
    if (assets.length !== assetIds.length) {
      return res.status(400).json({ error: 'Some selected assets do not belong to the selected company.' });
    }

    const shared = {
      company_id: companyId,
      detail: data.detail || null,
      pic: data.pic || null,
      service_type: data.service_type,
      expired_date: data.expired_date ? new Date(data.expired_date) : null,
      qty: 1,
      est_cost: data.est_cost ? parseFloat(data.est_cost) : 0,
      total_cost: data.total_cost ? parseFloat(data.total_cost) : 0,
      vendor_id: data.vendor_id ? parseInt(data.vendor_id) : null,
      status: data.status || 'Pending',
      information: data.information || null,
      reference_link: data.reference_link || null
    };
    const result = await prisma.maintenances.createMany({
      data: assets.map(asset => ({
        ...shared,
        asset_id: asset.id,
        asset_name: asset.asset_name,
        location_id: asset.location_id,
        room_area: asset.room ? asset.room.slice(0, 80) : null
      }))
    });
    res.status(201).json({ created: result.count });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMaintenanceJourney,
  getAssetMaintenanceMarks,
  createBulkMaintenance,
  getMaintenances,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance
};
