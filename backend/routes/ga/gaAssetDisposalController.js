const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../../api/db');
const { sendAssetDocApprovalEmail } = require('../../api/mailer');
const { nextDocNumber } = require('./gaDocNumber');
const { overrideReason, logOverride, loadOverride } = require('./gaDocOverride');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Pasang approver + magic link baru ke BAP, set PENDING_APPROVAL, lalu kirim email ke approver.
async function issueApprovalRequest(disposalId, approverSignerId) {
  const token = crypto.randomBytes(32).toString('hex');
  const disposal = await prisma.asset_disposals.update({
    where: { id: disposalId },
    data: {
      status: 'PENDING_APPROVAL',
      approver_signer_id: parseInt(approverSignerId),
      rejection_reason: null,
      magic_link_token: token,
      magic_link_expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      magic_link_used_at: null
    },
    include: { items: { include: { assets: true } }, m_company: true, requested_by: true, approver: true }
  });

  sendAssetDocApprovalEmail({
    to: disposal.approver.email,
    approverName: disposal.approver.name,
    docTitle: 'Asset Disposal Report (BAP)',
    docNumber: disposal.disposal_number,
    infoRows: [
      ['Company (PT)', disposal.m_company.name],
      ['Date', new Date(disposal.disposal_date).toLocaleDateString('en-GB')],
      ['Reason', disposal.reason],
      ['Submitted by', disposal.requested_by.full_name]
    ],
    assets: disposal.items.map(it => ({
      asset_code: it.assets.asset_code,
      asset_name: it.assets.asset_name,
      condition_snapshot: it.condition_snapshot
    })),
    approveUrl: `${FRONTEND_URL}/approve-disposal/${token}`
  }).catch(err => console.error('Gagal mengirim email approval BAP:', err.message));

  return disposal;
}

// GET /api/ga/asset-disposals
async function getAssetDisposals(req, res, next) {
  try {
    const { status, companyId, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (companyId) where.company_id = parseInt(companyId);
    if (search) {
      where.OR = [
        { disposal_number: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { reason_detail: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.asset_disposals.findMany({
        where,
        include: {
          m_company: { select: { name: true } },
          requested_by: { select: { full_name: true, position: true } },
          approver: { select: { name: true, position: true } },
          items: { select: { id: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.asset_disposals.count({ where })
    ]);

    res.json({
      data,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/ga/asset-disposals/:id
async function getAssetDisposalDetail(req, res, next) {
  try {
    const { id } = req.params;
    const disposal = await prisma.asset_disposals.findUnique({
      where: { id: parseInt(id) },
      include: {
        m_company: true,
        requested_by: { select: { id: true, full_name: true, position: true, department: true } },
        approver: true,
        items: {
          include: {
            assets: {
              include: { m_asset_category: true, m_condition: true, m_status: true }
            }
          }
        }
      }
    });
    if (!disposal) return res.status(404).json({ error: 'Berita Acara Penghapusan tidak ditemukan.' });
    res.json({ ...disposal, admin_override: await loadOverride(prisma, 'asset_disposals', disposal.id) });
  } catch (err) {
    next(err);
  }
}

// Signature row printed on the BAP: names and titles typed by hand (not the approval flow).
const SIGNATORY_GROUPS = ['prepared', 'checked', 'approved'];
function cleanSignatories(input) {
  if (input === undefined || input === null) return { value: null };
  if (!Array.isArray(input)) return { error: 'Signatories must be a list.' };
  const rows = input
    .map(r => ({ group: String(r?.group || ''), name: String(r?.name || '').trim().slice(0, 120), title: String(r?.title || '').trim().slice(0, 100) }))
    .filter(r => r.name || r.title);
  if (rows.some(r => !SIGNATORY_GROUPS.includes(r.group))) return { error: 'Invalid signatory group.' };
  if (rows.length > 10) return { error: 'At most 10 signatories.' };
  return { value: rows.length ? rows : null };
}

// GET /api/ga/asset-disposals/last-signatories?companyId= — prefill from the latest BAP of a company.
async function getLastSignatories(req, res, next) {
  try {
    const companyId = parseInt(req.query.companyId, 10);
    if (!Number.isInteger(companyId)) return res.json([]);
    const last = await prisma.asset_disposals.findFirst({
      where: { company_id: companyId, signatories: { not: Prisma.AnyNull } },
      orderBy: { created_at: 'desc' },
      select: { signatories: true }
    });
    res.json(Array.isArray(last?.signatories) ? last.signatories : []);
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-disposals/:id/signatories — any status; it only changes the printout.
async function updateSignatories(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const disposal = Number.isInteger(id) ? await prisma.asset_disposals.findUnique({ where: { id }, select: { id: true } }) : null;
    if (!disposal) return res.status(404).json({ error: 'Disposal report not found.' });
    const parsed = cleanSignatories(req.body?.signatories);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const updated = await prisma.asset_disposals.update({ where: { id }, data: { signatories: parsed.value ?? Prisma.DbNull, updated_at: new Date() }, select: { id: true, signatories: true } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/ga/asset-disposals
async function createAssetDisposal(req, res, next) {
  try {
    const { company_id, disposal_date, reason, reason_detail, notes, approver_signer_id, asset_ids } = req.body;
    const signatories = cleanSignatories(req.body.signatories);
    if (signatories.error) return res.status(400).json({ error: signatories.error });
    const userId = req.user?.id;

    if (!company_id || !disposal_date || !reason) {
      return res.status(400).json({ error: 'Entitas PT, Tanggal, dan Alasan Penghapusan wajib diisi.' });
    }
    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal satu aset untuk dihapuskan.' });
    }

    const assets = await prisma.assets.findMany({
      where: { id: { in: asset_ids.map(Number) } },
      include: { m_condition: true }
    });
    if (assets.length !== asset_ids.length) {
      return res.status(400).json({ error: 'Beberapa aset yang dipilih tidak ditemukan di database.' });
    }

    const disposalNumber = await nextDocNumber(prisma.asset_disposals, 'disposal_number', 'BAP/GA');

    const draft = await prisma.asset_disposals.create({
      data: {
        disposal_number: disposalNumber,
        company_id: parseInt(company_id),
        disposal_date: new Date(disposal_date),
        reason,
        reason_detail: reason_detail || null,
        notes: notes || null,
        ...(signatories.value ? { signatories: signatories.value } : {}),
        status: 'DRAFT',
        requested_by_id: userId,
        items: {
          create: assets.map(a => ({
            asset_id: a.id,
            condition_snapshot: a.m_condition?.name || null
          }))
        }
      }
    });

    const disposal = approver_signer_id ? await issueApprovalRequest(draft.id, approver_signer_id) : draft;
    res.status(201).json(disposal);
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-disposals/:id/submit — kirim Draft / Rejected ke approver
async function submitAssetDisposal(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { approver_signer_id } = req.body;
    if (!approver_signer_id) return res.status(400).json({ error: 'Approver is required.' });
    const disposal = await prisma.asset_disposals.findUnique({ where: { id } });
    if (!disposal) return res.status(404).json({ error: 'Berita Acara Penghapusan tidak ditemukan.' });
    if (!['DRAFT', 'REJECTED'].includes(disposal.status)) {
      return res.status(400).json({ error: 'Only Draft or Rejected reports can be submitted for approval.' });
    }
    res.json(await issueApprovalRequest(id, approver_signer_id));
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-disposals/:id/approve
// Admin only: approves on the approver's behalf (reason required, audited).
async function approveAssetDisposal(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const disposal = Number.isInteger(id) ? await prisma.asset_disposals.findUnique({ where: { id } }) : null;
    if (!disposal) return res.status(404).json({ error: 'Disposal report not found.' });
    if (disposal.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only reports pending approval can be approved. Send a draft to an approver first.' });
    }
    const parsed = overrideReason(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.asset_disposals.update({
        where: { id },
        data: { status: 'APPROVED', approved_at: new Date(), rejection_reason: null, magic_link_used_at: new Date(), updated_at: new Date() }
      });
      await logOverride(tx, 'asset_disposals', id, req.user?.id, 'APPROVE', parsed.reason);
      return row;
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /api/ga/asset-disposals/:id/reject
async function rejectAssetDisposal(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const rejection_reason = typeof req.body?.rejection_reason === 'string' ? req.body.rejection_reason.trim() : '';
    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }
    const disposal = Number.isInteger(id) ? await prisma.asset_disposals.findUnique({ where: { id }, select: { status: true } }) : null;
    if (!disposal) return res.status(404).json({ error: 'Disposal report not found.' });
    if (disposal.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only reports pending approval can be rejected.' });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.asset_disposals.update({
        where: { id },
        data: { status: 'REJECTED', rejection_reason, magic_link_used_at: new Date(), updated_at: new Date() }
      });
      await logOverride(tx, 'asset_disposals', id, req.user?.id, 'REJECT', rejection_reason);
      return row;
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// GET /api/ga/asset-disposals/magic/:token (PUBLIK — tanpa login)
async function getDisposalByToken(req, res, next) {
  try {
    const { token } = req.params;
    const disposal = await prisma.asset_disposals.findUnique({
      where: { magic_link_token: token },
      include: {
        m_company: true,
        requested_by: { select: { full_name: true, position: true, department: true } },
        approver: { select: { name: true, email: true, position: true } },
        items: { include: { assets: { include: { m_asset_category: true } } } }
      }
    });

    if (!disposal) return res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' });
    if (disposal.magic_link_used_at) return res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' });
    if (new Date() > disposal.magic_link_expires_at) return res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' });
    if (disposal.status !== 'PENDING_APPROVAL') return res.status(410).json({ error: 'Berita Acara ini sudah diproses melalui jalur lain.' });

    res.json(disposal);
  } catch (err) {
    next(err);
  }
}

// POST /api/ga/asset-disposals/magic/:token (PUBLIK — tanpa login)
async function processDisposalByToken(req, res, next) {
  try {
    const { token } = req.params;
    const { action, rejection_reason } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action harus APPROVE atau REJECT.' });
    }
    if (action === 'REJECT' && !rejection_reason) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
    }

    const disposal = await prisma.asset_disposals.findUnique({ where: { magic_link_token: token } });
    if (!disposal) return res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' });
    if (disposal.magic_link_used_at) return res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' });
    if (new Date() > disposal.magic_link_expires_at) return res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' });
    if (disposal.status !== 'PENDING_APPROVAL') return res.status(410).json({ error: 'Berita Acara ini sudah diproses melalui jalur lain.' });

    const updated = await prisma.asset_disposals.update({
      where: { id: disposal.id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approved_at: action === 'APPROVE' ? new Date() : null,
        rejection_reason: action === 'REJECT' ? rejection_reason : null,
        magic_link_used_at: new Date()
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/ga/asset-disposals/:id (hanya untuk status DRAFT)
async function deleteAssetDisposal(req, res, next) {
  try {
    const { id } = req.params;
    const disposal = await prisma.asset_disposals.findUnique({ where: { id: parseInt(id) } });
    if (!disposal) return res.status(404).json({ error: 'Berita Acara Penghapusan tidak ditemukan.' });
    if (!['DRAFT', 'REJECTED'].includes(disposal.status)) {
      return res.status(400).json({ error: 'Only Draft or Rejected reports can be deleted.' });
    }
    await prisma.asset_disposals.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Berita Acara Penghapusan berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/ga/asset-disposal-signers
async function getApprovalSigners(req, res, next) {
  try {
    const signers = await prisma.m_approval_signer.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, position: true, email: true }
    });
    res.json(signers);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssetDisposals,
  getAssetDisposalDetail,
  getLastSignatories,
  updateSignatories,
  createAssetDisposal,
  submitAssetDisposal,
  approveAssetDisposal,
  rejectAssetDisposal,
  deleteAssetDisposal,
  getApprovalSigners,
  getDisposalByToken,
  processDisposalByToken
};
