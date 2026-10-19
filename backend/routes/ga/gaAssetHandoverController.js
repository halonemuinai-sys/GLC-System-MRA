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
  items: { include: { assets: { include: { m_asset_category: true } } } }
};

// Pasang approver + magic link baru ke BAST, set PENDING_APPROVAL, lalu kirim email ke approver.
async function issueApprovalRequest(handoverId, approverSignerId) {
  const token = crypto.randomBytes(32).toString('hex');
  const handover = await prisma.asset_handovers.update({
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
  });

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
      data,
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
    res.json(handover);
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

    const assetIds = items.map(it => Number(it.asset_id));
    const assets = await prisma.assets.findMany({
      where: { id: { in: assetIds } },
      include: { m_condition: true }
    });
    if (assets.length !== assetIds.length) {
      return res.status(400).json({ error: 'Some selected assets were not found.' });
    }
    const assetMap = new Map(assets.map(a => [a.id, a]));

    const handoverNumber = await nextDocNumber(prisma.asset_handovers, 'handover_number', 'BAST/GA');

    const draft = await prisma.asset_handovers.create({
      data: {
        handover_number: handoverNumber,
        company_id: parseInt(company_id),
        handover_date: new Date(handover_date),
        handover_type,
        giver_name,
        giver_position: giver_position || null,
        recipient_name,
        recipient_position: recipient_position || null,
        recipient_department: recipient_department || null,
        notes: notes || null,
        status: 'DRAFT',
        created_by_id: req.user.id,
        items: {
          create: items.map(it => ({
            asset_id: Number(it.asset_id),
            condition_snapshot: assetMap.get(Number(it.asset_id))?.m_condition?.name || null,
            accessories: it.accessories || null
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

// PUT /api/ga/asset-handovers/:id/approve
async function approveAssetHandover(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const handover = await prisma.asset_handovers.findUnique({ where: { id } });
    if (!handover) return res.status(404).json({ error: 'Asset handover report not found.' });
    if (handover.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only reports pending approval can be approved.' });
    }
    res.json(await prisma.asset_handovers.update({
      where: { id },
      data: { status: 'APPROVED', approved_at: new Date(), rejection_reason: null }
    }));
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
  return handover;
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

    res.json(await prisma.asset_handovers.update({
      where: { id: handover.id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approved_at: action === 'APPROVE' ? new Date() : null,
        rejection_reason: action === 'REJECT' ? rejection_reason : null,
        magic_link_used_at: new Date()
      }
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
