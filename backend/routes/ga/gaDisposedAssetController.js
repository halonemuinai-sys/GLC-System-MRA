const prisma = require('../../api/db');

// Disposed assets registry: assets with status Disposed (status_id = 4), joined to the
// approved Berita Acara Penghapusan (BAP) that wrote them off. Read-only — corrections go
// through the BAP itself.
const DISPOSED_STATUS_ID = 4;
const MAX_EXPORT_ROWS = 5000;

function parseDate(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

// The approved BAP an asset belongs to (latest one if, unusually, there are several).
function approvedBap(asset) {
  const baps = (asset.asset_disposal_items || [])
    .map((i) => i.asset_disposals)
    .filter((d) => d && d.status === 'APPROVED')
    .sort((a, b) => new Date(b.disposal_date) - new Date(a.disposal_date));
  return baps[0] || null;
}

function buildWhere(q) {
  const where = { status_id: DISPOSED_STATUS_ID };
  if (q.search) {
    where.OR = [
      { asset_name: { contains: q.search, mode: 'insensitive' } },
      { asset_code: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.companyId) where.company_id = parseInt(q.companyId);
  if (q.categoryId) where.asset_category_id = parseInt(q.categoryId);

  // Date / reason / BAP-number filters apply to the approved BAP.
  const from = parseDate(q.dateFrom);
  const to = parseDate(q.dateTo, true);
  const bapWhere = { status: 'APPROVED' };
  if (from || to) bapWhere.disposal_date = { ...(from && { gte: from }), ...(to && { lte: to }) };
  if (q.reason) bapWhere.reason = { contains: q.reason, mode: 'insensitive' };
  if (q.bap) bapWhere.disposal_number = { contains: q.bap, mode: 'insensitive' };
  if (from || to || q.reason || q.bap) where.asset_disposal_items = { some: { asset_disposals: bapWhere } };
  return where;
}

const bapSelect = {
  select: {
    id: true,
    disposal_number: true,
    disposal_date: true,
    reason: true,
    reason_detail: true,
    status: true,
    approved_at: true,
    approver: { select: { name: true, position: true } },
    requested_by: { select: { full_name: true } },
  },
};

// GET /api/ga/assets-disposed
async function getDisposedAssets(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const exportAll = req.query.all === '1';
    const limit = exportAll ? MAX_EXPORT_ROWS : Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const where = buildWhere(req.query);

    // Light pass over every match: KPIs + ordering by disposal date (a relation field Prisma
    // cannot sort on directly).
    const light = await prisma.assets.findMany({
      where,
      select: {
        id: true,
        acquisition_cost: true,
        asset_disposal_items: { select: { asset_disposals: { select: { id: true, status: true, disposal_date: true } } } },
      },
    });
    const thisYear = new Date().getFullYear();
    const bapIds = new Set();
    let totalValue = 0;
    let disposedThisYear = 0;
    let withoutBap = 0;
    const ordered = light.map((a) => {
      const bap = approvedBap(a);
      totalValue += Number(a.acquisition_cost || 0);
      if (bap) {
        bapIds.add(bap.id);
        if (new Date(bap.disposal_date).getFullYear() === thisYear) disposedThisYear += 1;
      } else {
        withoutBap += 1;
      }
      return { id: a.id, date: bap ? new Date(bap.disposal_date).getTime() : 0 };
    }).sort((x, y) => y.date - x.date || y.id - x.id);

    const pageIds = ordered.slice((page - 1) * limit, page * limit).map((o) => o.id);
    const rows = pageIds.length ? await prisma.assets.findMany({
      where: { id: { in: pageIds } },
      include: {
        m_company: { select: { id: true, name: true } },
        m_asset_category: { select: { id: true, name: true } },
        m_location: { select: { id: true, name: true } },
        asset_disposal_items: { select: { condition_snapshot: true, notes: true, asset_disposals: bapSelect } },
      },
    }) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));

    const data = pageIds.map((id) => byId.get(id)).filter(Boolean).map((a) => {
      const bap = approvedBap(a);
      const item = bap ? a.asset_disposal_items.find((i) => i.asset_disposals?.id === bap.id) : null;
      return {
        id: a.id,
        asset_code: a.asset_code,
        asset_name: a.asset_name,
        company: a.m_company,
        category: a.m_asset_category,
        location: a.m_location,
        room: a.room,
        acquisition_date: a.acquisition_date,
        acquisition_cost: a.acquisition_cost,
        condition_snapshot: item?.condition_snapshot || null,
        item_notes: item?.notes || null,
        bap: bap ? {
          id: bap.id,
          number: bap.disposal_number,
          date: bap.disposal_date,
          reason: bap.reason,
          reason_detail: bap.reason_detail,
          approved_at: bap.approved_at,
          approver: bap.approver,
          requested_by: bap.requested_by?.full_name || null,
        } : null,
      };
    });

    res.json({
      data,
      meta: { total: ordered.length, page, limit, totalPages: Math.max(1, Math.ceil(ordered.length / limit)) },
      summary: {
        totalDisposed: ordered.length,
        totalValue,
        disposedThisYear,
        bapCount: bapIds.size,
        withoutBap,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/ga/assets-disposed/reasons — reasons used on approved BAPs (filter options).
async function getDisposalReasons(req, res, next) {
  try {
    const rows = await prisma.asset_disposals.groupBy({ by: ['reason'], where: { status: 'APPROVED' }, _count: { id: true } });
    res.json(rows.map((r) => ({ reason: r.reason, count: r._count.id })).sort((a, b) => b.count - a.count));
  } catch (err) {
    next(err);
  }
}

module.exports = { getDisposedAssets, getDisposalReasons, approvedBap, buildWhere };
