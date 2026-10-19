const crypto = require('crypto');
const prisma = require('../../api/db');
const { sendAssetDocApprovalEmail } = require('../../api/mailer');
const { nextDocNumber } = require('./gaDocNumber');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HANDOVER_TYPES = ['Assignment', 'Return', 'Transfer'];

const DETAIL_INCLUDE = {
  m_company: true,
  created_by: { select: { full_name: true, position: true } },
  approver: { select: { name: true, email: true, position: true } },
  items: { include: { assets: { include: { m_asset_category: true, m_company: { select: { id: true, name: true } }, m_location: { select: { id: true, name: true, location: true } } } } } }
};

const locationLabel = (loc) => (loc ? `${loc.name}${loc.location && loc.location !== loc.name ? ` - ${loc.location}` : ''}` : null);

// Adds readable names for the destination and for each item's previous place.
async function withTransfer(handover) {
  if (!handover) return handover;
  const companyIds = new Set([handover.to_company_id, ...(handover.items || []).map(it => it.from_company_id)].filter(Boolean));
  const locationIds = new Set([handover.to_location_id, ...(handover.items || []).map(it => it.from_location_id)].filter(Boolean));
  const [companies, locations] = await Promise.all([
    companyIds.size ? prisma.m_company.findMany({ where: { id: { in: [...companyIds] } }, select: { id: true, name: true } }) : [],
    locationIds.size ? prisma.m_company_branch.findMany({ where: { id: { in: [...locationIds] } }, select: { id: true, name: true, location: true } }) : []
  ]);
  const company = new Map(companies.map(c => [c.id, c]));
  const location = new Map(locations.map(l => [l.id, l]));
  return {
    ...handover,
    to_company: handover.to_company_id ? company.get(handover.to_company_id) || null : null,
    to_location: handover.to_location_id ? location.get(handover.to_location_id) || null : null,
    items: (handover.items || []).map(it => ({
      ...it,
      from_company: it.from_company_id ? company.get(it.from_company_id) || null : null,
      from_location: it.from_location_id ? location.get(it.from_location_id) || null : null
    }))
  };
}

// Human summary of where the assets go, for e-mails.
function destinationText(h) {
  const parts = [];
  if (h.to_company) parts.push(h.to_company.name);
  if (h.to_location) parts.push(locationLabel(h.to_location));
  if (h.to_room) parts.push(`room ${h.to_room}`);
  return parts.join(' · ');
}

// Validates the destination fields. Returns { data } or { error }.
async function parseDestination(body, sourceCompanyId, handoverType) {
  const toCompanyId = body.to_company_id ? parseInt(body.to_company_id, 10) : null;
  const toLocationId = body.to_location_id ? parseInt(body.to_location_id, 10) : null;
  const toRoom = body.to_room ? String(body.to_room).trim().slice(0, 100) || null : null;
  if (toCompanyId) {
    const c = await prisma.m_company.findUnique({ where: { id: toCompanyId }, select: { id: true } });
    if (!c) return { error: 'Destination company not found.' };
  }
  if (toLocationId) {
    const l = await prisma.m_company_branch.findUnique({ where: { id: toLocationId }, select: { id: true } });
    if (!l) return { error: 'Destination location not found.' };
  }
  if (handoverType === 'Transfer' && !toLocationId && (!toCompanyId || toCompanyId === sourceCompanyId)) {
    return { error: 'A transfer needs a destination location or another company.' };
  }
  return { data: { to_company_id: toCompanyId && toCompanyId !== sourceCompanyId ? toCompanyId : null, to_location_id: toLocationId, to_room: toRoom } };
}

// Approves a BAST and applies the transfer to its assets in one transaction.
async function approveAndApply(id, extra = {}, actorId = null) {
  return prisma.$transaction(async (tx) => {
    const handover = await tx.asset_handovers.findUnique({ where: { id }, include: { items: { include: { assets: true } } } });
    const moves = !!(handover.to_company_id || handover.to_location_id || handover.to_room);
    const changes = [];
    if (moves && !handover.transfer_applied_at) {
      for (const item of handover.items) {
        const a = item.assets;
        await tx.asset_handover_items.update({
          where: { id: item.id },
          data: { from_company_id: a.company_id, from_location_id: a.location_id, from_room: a.room }
        });
        const data = { updated_at: new Date() };
        if (handover.to_company_id) data.company_id = handover.to_company_id;
        if (handover.to_location_id) data.location_id = handover.to_location_id;
        if (handover.to_room) data.room = handover.to_room;
        await tx.assets.update({ where: { id: a.id }, data });
        changes.push({ asset_id: a.id, asset_code: a.asset_code, from: { company_id: a.company_id, location_id: a.location_id, room: a.room }, to: { company_id: data.company_id ?? a.company_id, location_id: data.location_id ?? a.location_id, room: data.room ?? a.room } });
      }
      await tx.audit_log.create({
        data: { table_name: 'asset_handovers', record_id: id, action: 'TRANSFER', user_id: actorId, old_data: { handover_number: handover.handover_number }, new_data: { assets: changes } }
      });
    }
    return tx.asset_handovers.update({
      where: { id },
      data: { status: 'APPROVED', approved_at: new Date(), rejection_reason: null, ...(moves ? { transfer_applied_at: new Date() } : {}), ...extra }
    });
  });
}

// Pasang approver + magic link baru ke BAST, set PENDING_APPROVAL, lalu kirim email ke approver.
async function issueApprovalRequest(handoverId, approverSignerId) {
  const token = crypto.randomBytes(32).toString('hex');
  const handover = await withTransfer(await prisma.asset_handovers.update({
    where: { id: handoverId },
    data: {
      status: 'PENDING_APPROVAL',
      approver_signer_id: parseInt(approverSignerId),
      rejection_reason: null,
      magic_link_token: token,
      magic_link_expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      magic_link_used_at: null
    },
    include: DETAIL_INCLUDE
  }));

  const destination = destinationText(handover);
  sendAssetDocApprovalEmail({
    to: handover.approver.email,
    approverName: handover.approver.name,
    docTitle: 'Asset Handover Report (BAST)',
    docNumber: handover.handover_number,
    infoRows: [
      ['Company (PT)', handover.m_company.name],
      ['Date', new Date(handover.handover_date).toLocaleDateString('en-GB')],
      ['Type', handover.handover_type],
      ['Handed over by', `${handover.giver_name}${handover.giver_position ? ` (${handover.giver_position})` : ''}`],
      ['Received by', `${handover.recipient_name}${handover.recipient_position ? ` (${handover.recipient_position})` : ''}${handover.recipient_department ? ` - ${handover.recipient_department}` : ''}`],
      ...(destination ? [['Assets move to', destination]] : []),
      ['Submitted by', handover.created_by.full_name]
    ],
    assets: handover.items.map(it => ({
      asset_code: it.assets.asset_code,
      asset_name: it.assets.asset_name,
      condition_snapshot: it.condition_snapshot,
      accessories: it.accessories
    })),
    approveUrl: `${FRONTEND_URL}/approve-handover/${token}`
  }).catch(err => console.error('Gagal mengirim email approval BAST:', err.message));

  return handover;
}

// GET /api/ga/asset-handovers
async function getAssetHandovers(req, res, next) {
  try {
    const { status, companyId, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (companyId) where.company_id = parseInt(companyId);
    if (search) {
      where.OR = [
        { handover_number: { contains: search, mode: 'insensitive' } },
        { giver_name: { contains: search, mode: 'insensitive' } },
        { recipient_name: { contains: search, mode: 'insensitive' } },
        { recipient_department: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.asset_handovers.findMany({
        where,
        include: {
          m_company: { select: { name: true } },
          created_by: { select: { full_name: true } },
          approver: { select: { name: true, position: true } },
          items: { select: { id: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.asset_handovers.count({ where })
    ]);

    res.json({
      data: await Promise.all(data.map(withTransfer)),
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/ga/asset-handovers/:id
async function getAssetHandoverDetail(req, res, next) {
  try {
    const handover = await prisma.asset_handovers.findUnique({
      where: { id: parseInt(req.params.id) },
      include: DETAIL_INCLUDE
    });
    if (!handover) return res.status(404).json({ error: 'Asset handover report not found.' });
    res.json(await withTransfer(handover));
  } catch (err) {
    next(err);
  }
}

// POST /api/ga/asset-handovers
async function createAssetHandover(req, res, next) {
  try {
    const {
      company_id, handover_date, handover_type,
      giver_name, giver_position,
      recipient_name, recipient_position, recipient_department,
      notes, items, approver_signer_id
    } = req.body;

    if (!company_id || !handover_date || !handover_type || !giver_name || !recipient_name) {
      return res.status(400).json({ error: 'Company, date, handover type, first party and second party are required.' });
    }
    if (!HANDOVER_TYPES.includes(handover_type)) {
      return res.status(400).json({ error: 'Invalid handover type.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Select at least one asset to hand over.' });
    }
    const sourceCompanyId = parseInt(company_id);

    const assetIds = [...new Set(items.map(it => Number(it.asset_id)))];
    const assets = await prisma.assets.findMany({
      where: { id: { in: assetIds } },
      include: { m_condition: true }
    });
    if (assets.length !== assetIds.length) {
      return res.status(400).json({ error: 'Some selected assets were not found.' });
    }
    const foreign = assets.filter(a => a.company_id !== sourceCompanyId);
    if (foreign.length) {
      return res.status(400).json({ error: `These assets do not belong to the selected company: ${foreign.map(a => a.asset_code || a.asset_name).join(', ')}.` });
    }
    // An asset cannot be in two open handovers at once (the later transfer would undo the first).
    const busy = await prisma.asset_handover_items.findMany({
      where: { asset_id: { in: assetIds }, asset_handovers: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } },
      select: { asset_id: true, asset_handovers: { select: { handover_number: true } } }
    });
    if (busy.length) {
      const names = busy.map(b => `${assets.find(a => a.id === b.asset_id)?.asset_code || b.asset_id} (${b.asset_handovers.handover_number})`);
      return res.status(409).json({ error: `Already in an open handover report: ${names.join(', ')}.` });
    }
    const destination = await parseDestination(req.body, sourceCompanyId, handover_type);
    if (destination.error) return res.status(400).json({ error: destination.error });

    const assetMap = new Map(assets.map(a => [a.id, a]));
    const handoverNumber = await nextDocNumber(prisma.asset_handovers, 'handover_number', 'BAST/GA');

    const draft = await prisma.asset_handovers.create({
      data: {
        handover_number: handoverNumber,
        company_id: sourceCompanyId,
        handover_date: new Date(handover_date),
        handover_type,
        giver_name,
        giver_position: giver_position || null,
        recipient_name,
        recipient_position: recipient_position || null,
        recipient_department: recipient_department || null,
        notes: notes || null,
        ...destination.data,
        status: 'DRAFT',
        created_by_id: req.user.id,
        items: {
          create: assetIds.map(assetId => ({
            asset_id: assetId,
            condition_snapshot: assetMap.get(assetId)?.m_condition?.name || null,
            accessories: items.find(it => Number(it.asset_id) === assetId)?.accessories || null
          }))
        }
      }
    });

    const handover = approver_signer_id ? await issueApprovalRequest(draft.id, approver_signer_id) : draft;
    res.status(201).json(handover);
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-handovers/:id/submit — kirim Draft / Rejected ke approver
async function submitAssetHandover(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { approver_signer_id } = req.body;
    if (!approver_signer_id) return res.status(400).json({ error: 'Approver is required.' });
    const handover = await prisma.asset_handovers.findUnique({ where: { id } });
    if (!handover) return res.status(404).json({ error: 'Asset handover report not found.' });
    if (!['DRAFT', 'REJECTED'].includes(handover.status)) {
      return res.status(400).json({ error: 'Only Draft or Rejected reports can be submitted for approval.' });
    }
    res.json(await issueApprovalRequest(id, approver_signer_id));
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-handovers/:id/approve — also moves the assets to the destination.
async function approveAssetHandover(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const handover = await prisma.asset_handovers.findUnique({ where: { id } });
    if (!handover) return res.status(404).json({ error: 'Asset handover report not found.' });
    if (handover.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only reports pending approval can be approved.' });
    }
    res.json(await approveAndApply(id, {}, req.user?.id || null));
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-handovers/:id/reject
async function rejectAssetHandover(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: 'Rejection reason is required.' });
    const handover = await prisma.asset_handovers.findUnique({ where: { id } });
    if (!handover) return res.status(404).json({ error: 'Asset handover report not found.' });
    if (handover.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only reports pending approval can be rejected.' });
    }
    res.json(await prisma.asset_handovers.update({
      where: { id },
      data: { status: 'REJECTED', rejection_reason }
    }));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/ga/asset-handovers/:id (hanya Draft / Rejected)
async function deleteAssetHandover(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const handover = await prisma.asset_handovers.findUnique({ where: { id } });
    if (!handover) return res.status(404).json({ error: 'Asset handover report not found.' });
    if (!['DRAFT', 'REJECTED'].includes(handover.status)) {
      return res.status(400).json({ error: 'Only Draft or Rejected reports can be deleted.' });
    }
    await prisma.asset_handovers.delete({ where: { id } });
    res.json({ message: 'Asset handover report deleted.' });
  } catch (err) {
    next(err);
  }
}

async function findValidMagicHandover(token, res) {
  const handover = await prisma.asset_handovers.findUnique({ where: { magic_link_token: token }, include: DETAIL_INCLUDE });
  if (!handover) { res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' }); return null; }
  if (handover.magic_link_used_at) { res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' }); return null; }
  if (new Date() > handover.magic_link_expires_at) { res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' }); return null; }
  if (handover.status !== 'PENDING_APPROVAL') { res.status(410).json({ error: 'Berita Acara ini sudah diproses melalui jalur lain.' }); return null; }
  return withTransfer(handover);
}

// GET /api/ga/asset-handovers/magic/:token (PUBLIK — tanpa login)
async function getHandoverByToken(req, res, next) {
  try {
    const handover = await findValidMagicHandover(req.params.token, res);
    if (handover) res.json(handover);
  } catch (err) {
    next(err);
  }
}

// POST /api/ga/asset-handovers/magic/:token (PUBLIK — tanpa login)
async function processHandoverByToken(req, res, next) {
  try {
    const { action, rejection_reason } = req.body;
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action harus APPROVE atau REJECT.' });
    }
    if (action === 'REJECT' && !rejection_reason) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
    }
    const handover = await findValidMagicHandover(req.params.token, res);
    if (!handover) return;

    if (action === 'APPROVE') {
      return res.json(await approveAndApply(handover.id, { magic_link_used_at: new Date() }));
    }
    res.json(await prisma.asset_handovers.update({
      where: { id: handover.id },
      data: { status: 'REJECTED', approved_at: null, rejection_reason, magic_link_used_at: new Date() }
    }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssetHandovers,
  getAssetHandoverDetail,
  createAssetHandover,
  submitAssetHandover,
  approveAssetHandover,
  rejectAssetHandover,
  deleteAssetHandover,
  getHandoverByToken,
  processHandoverByToken
};
