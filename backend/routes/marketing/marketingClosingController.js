const crypto = require('crypto');
const prisma = require('../../api/db');
const { resolveEmployee, FRONTEND_URL, canManageDoc } = require('./marketingHelper');
const { sendPlanClosingApprovalEmail, sendMail } = require('../../api/mailer');
const { closingWindow, computeKpi } = require('./marketingGovernance');

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UNSETTLED_PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'OVERBUDGET_WARN'];
const STEPS = [
  { step: 1, role: 'Marketing Head', bodyKey: 'head_signer_id' },
  { step: 2, role: 'Kadiv', bodyKey: 'kadiv_signer_id' }
];

const num = (v) => Number(v || 0);
const settlementTypeOf = (variance) => (variance > 0 ? 'CLAIM' : variance < 0 ? 'EXCESS' : 'BALANCED');
const itemLabel = (item) => item.description || item.m_coa?.name || `Item #${item.id}`;

const PLAN_INCLUDE = {
  company: true,
  items: { include: { m_coa: true, vendors: true, payment_requests: true }, orderBy: { id: 'asc' } }
};
const SIGNER_SELECT = { select: { id: true, name: true, email: true, position: true } };
const CLOSING_INCLUDE = {
  items: true,
  submitted_by: SIGNER_SELECT,
  approver: SIGNER_SELECT,
  approvers: { include: { signer: SIGNER_SELECT }, orderBy: { step_number: 'asc' } }
};

function inScope(req, plan) {
  return !req.companyScope || req.companyScope.all || req.companyScope.companyIds.includes(plan.company_id);
}

// Gabungkan item plan (budget & realisasi dibayar terkini) dengan isian closing yang tersimpan.
function buildRows(plan, closing) {
  const saved = new Map((closing?.items || []).map(ci => [ci.plan_item_id, ci]));
  const locked = closing && ['PENDING_APPROVAL', 'APPROVED'].includes(closing.status);
  return plan.items.map(item => {
    const ci = saved.get(item.id);
    // Setelah diajukan/disetujui, pakai snapshot nilai dibayar; saat draft, pakai realisasi terkini.
    const paid = locked && ci ? num(ci.paid_amount) : num(item.actual_amount);
    const finalAmount = ci && ci.final_amount !== null ? num(ci.final_amount) : null;
    return {
      plan_item_id: item.id,
      label: itemLabel(item),
      coa: item.m_coa ? `${item.m_coa.code ? `${item.m_coa.code} - ` : ''}${item.m_coa.name}` : null,
      vendor: item.vendors?.vendor_name || null,
      budget: num(item.budget_amount),
      paid,
      final_amount: finalAmount,
      variance: finalAmount === null ? 0 : finalAmount - paid,
      note: ci?.note || '',
      proof_url: ci?.proof_url || ''
    };
  });
}

function summarize(rows) {
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalFinal = rows.reduce((s, r) => s + (r.final_amount ?? 0), 0);
  const variance = totalFinal - totalPaid;
  return { total_paid: totalPaid, total_final: totalFinal, variance, settlement_type: settlementTypeOf(variance) };
}

const loadPlan = (planId) => prisma.marketing_plans.findUnique({ where: { id: planId }, include: PLAN_INCLUDE });
const loadClosing = (planId) => prisma.marketing_plan_closings.findUnique({ where: { marketing_plan_id: planId }, include: CLOSING_INCLUDE });

function responseFor(plan, closing) {
  const rows = buildRows(plan, closing);
  return {
    closing: closing ? { ...closing, items: undefined } : null,
    rows,
    summary: summarize(rows),
    kpi: computeKpi(plan),
    window: closingWindow(plan, closing?.status),
    unsettled_payments: plan.items.flatMap(i => i.payment_requests).filter(p => UNSETTLED_PAYMENT_STATUSES.includes(p.status)).length,
    actuals_filled: !!plan.actuals_filled_at
  };
}

// GET /plans/:id/closing
async function getClosing(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const plan = await loadPlan(planId);
    if (!plan || !inScope(req, plan)) return res.status(404).json({ error: 'Marketing Plan not found.' });
    res.json(responseFor(plan, await loadClosing(planId)));
  } catch (err) {
    next(err);
  }
}

// Simpan isian closing (draft). Dipakai juga oleh submit sebelum validasi.
async function persistClosing(plan, existing, { notes, items }) {
  const rowsInput = new Map((items || []).map(it => [Number(it.plan_item_id), it]));
  const itemData = plan.items.map(item => {
    const input = rowsInput.get(item.id) || {};
    const raw = input.final_amount;
    const finalAmount = raw === undefined || raw === null || raw === '' ? null : Number(raw);
    const paid = num(item.actual_amount);
    return {
      plan_item_id: item.id,
      paid_amount: paid,
      final_amount: finalAmount,
      variance: finalAmount === null ? 0 : finalAmount - paid,
      note: input.note ? String(input.note).trim() || null : null,
      proof_url: input.proof_url ? String(input.proof_url).trim() || null : null
    };
  });
  const totalPaid = itemData.reduce((s, r) => s + r.paid_amount, 0);
  const totalFinal = itemData.reduce((s, r) => s + (r.final_amount ?? 0), 0);
  const variance = totalFinal - totalPaid;

  return prisma.$transaction(async (tx) => {
    const header = {
      total_paid: totalPaid,
      total_final: totalFinal,
      variance,
      settlement_type: settlementTypeOf(variance),
      notes: notes ? String(notes).trim() || null : null,
      updated_at: new Date()
    };
    const closing = existing
      ? await tx.marketing_plan_closings.update({ where: { id: existing.id }, data: header })
      : await tx.marketing_plan_closings.create({ data: { ...header, marketing_plan_id: plan.id, status: 'DRAFT' } });

    await tx.marketing_plan_closing_items.deleteMany({ where: { closing_id: closing.id } });
    await tx.marketing_plan_closing_items.createMany({ data: itemData.map(d => ({ ...d, closing_id: closing.id })) });
    return closing;
  });
}

async function guardEditable(req, res, planId) {
  const plan = await loadPlan(planId);
  if (!plan || !inScope(req, plan)) { res.status(404).json({ error: 'Marketing Plan not found.' }); return null; }
  if (plan.status !== 'APPROVED') { res.status(400).json({ error: 'Closing hanya bisa diisi untuk plan berstatus APPROVED.' }); return null; }
  const employee = await resolveEmployee(req.user?.email);
  if (!canManageDoc(req, plan.creator_id, employee)) { res.status(403).json({ error: 'Only the plan creator or a Marketing Manager can fill in the closing.' }); return null; }
  const existing = await loadClosing(planId);
  if (existing && ['PENDING_APPROVAL', 'APPROVED'].includes(existing.status)) {
    res.status(400).json({ error: 'Closing sedang menunggu / sudah disetujui, tidak bisa diubah.' });
    return null;
  }
  return { plan, existing };
}

// PUT /plans/:id/closing — simpan draft
async function saveClosing(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const ctx = await guardEditable(req, res, planId);
    if (!ctx) return;
    await persistClosing(ctx.plan, ctx.existing, req.body);
    res.json(responseFor(await loadPlan(planId), await loadClosing(planId)));
  } catch (err) {
    next(err);
  }
}

// Kirim email approval ke approver tahap aktif (magic link baru).
async function notifyStepApprover(closingId) {
  const closing = await prisma.marketing_plan_closings.findUnique({ where: { id: closingId }, include: CLOSING_INCLUDE });
  const plan = await loadPlan(closing.marketing_plan_id);
  const step = closing.approvers.find(a => a.step_number === closing.current_step);
  const rows = buildRows(plan, closing);
  const kpi = computeKpi(plan);
  const previous = closing.approvers.filter(a => a.step_number < closing.current_step && a.status === 'APPROVED');

  sendPlanClosingApprovalEmail({
    to: step.signer.email,
    approverName: step.signer.name,
    stepLabel: `Tahap ${step.step_number}/${closing.approvers.length}: ${step.role_label}`,
    previousApprovals: previous.map(p => `${p.role_label}: ${p.signer.name}${p.comment ? ` — "${p.comment}"` : ''}`),
    planTitle: plan.title,
    companyName: plan.company?.name,
    submitterName: closing.submitted_by?.name || '-',
    totalPaid: num(closing.total_paid),
    totalFinal: num(closing.total_final),
    variance: num(closing.variance),
    settlementType: closing.settlement_type,
    kpiScore: kpi.score,
    kpiRows: kpi.rows,
    items: rows.map(r => ({ label: r.label, paid: r.paid, final: r.final_amount, variance: r.variance })),
    approveUrl: `${FRONTEND_URL}/approve-closing/${closing.magic_link_token}`
  }).catch(err => console.error('Gagal mengirim email approval closing:', err.message));
}

// POST /plans/:id/closing/submit — simpan + validasi + kirim ke Marketing Head (tahap 1)
async function submitClosing(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const signerIds = STEPS.map(s => parseInt(req.body[s.bodyKey], 10));
    if (signerIds.some(id => !id)) return res.status(400).json({ error: 'Pilih Marketing Head dan Kadiv sebagai approver closing.' });
    if (signerIds[0] === signerIds[1]) return res.status(400).json({ error: 'Marketing Head dan Kadiv harus orang yang berbeda.' });

    const ctx = await guardEditable(req, res, planId);
    if (!ctx) return;
    const { plan } = ctx;

    if (!plan.actuals_filled_at) {
      return res.status(400).json({ error: 'Isi hasil event (data aktual post-campaign) terlebih dahulu.' });
    }
    const unsettled = plan.items.flatMap(i => i.payment_requests).filter(p => UNSETTLED_PAYMENT_STATUSES.includes(p.status));
    if (unsettled.length > 0) {
      return res.status(400).json({ error: `Masih ada ${unsettled.length} payment request yang belum selesai (belum PAID/REJECTED).` });
    }

    const signers = await prisma.m_approval_signer.findMany({ where: { id: { in: signerIds }, is_active: true } });
    if (signers.length !== 2) return res.status(400).json({ error: 'Approver tidak valid.' });

    const submitter = await resolveEmployee(req.user.email);
    const saved = await persistClosing(plan, ctx.existing, req.body);
    const rows = buildRows(plan, await loadClosing(planId));

    const missingFinal = rows.filter(r => r.final_amount === null);
    if (missingFinal.length > 0) {
      return res.status(400).json({ error: `Biaya final belum diisi untuk: ${missingFinal.map(r => r.label).join(', ')}.` });
    }
    const missingProof = rows.filter(r => r.variance !== 0 && !r.proof_url);
    if (missingProof.length > 0) {
      return res.status(400).json({ error: `Bukti wajib diunggah untuk item yang ada selisih: ${missingProof.map(r => r.label).join(', ')}.` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.marketing_plan_closing_approvers.deleteMany({ where: { closing_id: saved.id } });
      await tx.marketing_plan_closing_approvers.createMany({
        data: STEPS.map((s, i) => ({
          closing_id: saved.id, step_number: s.step, role_label: s.role, signer_id: signerIds[i],
          status: s.step === 1 ? 'PENDING' : 'WAITING'
        }))
      });
      await tx.marketing_plan_closings.update({
        where: { id: saved.id },
        data: {
          status: 'PENDING_APPROVAL',
          current_step: 1,
          kpi_score: computeKpi(plan).score,
          submitted_by_id: submitter?.id || null,
          submitted_at: new Date(),
          approver_signer_id: signerIds[0],
          approved_at: null,
          rejection_reason: null,
          magic_link_token: crypto.randomBytes(32).toString('hex'),
          magic_link_expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS),
          magic_link_used_at: null
        }
      });
    });

    await notifyStepApprover(saved.id);
    res.json(responseFor(await loadPlan(planId), await loadClosing(planId)));
  } catch (err) {
    next(err);
  }
}

function notifySubmitter(closing, plan, subject, html) {
  if (!closing.submitted_by?.email) return;
  sendMail({ to: closing.submitted_by.email, subject: `${subject} ${plan.title}`, html })
    .catch(err => console.error('Gagal mengirim notifikasi closing:', err.message));
}

// Terapkan keputusan tahap aktif. APPROVE tahap terakhir -> closing APPROVED & plan COMPLETED.
async function applyDecision(closing, action, comment) {
  const current = closing.approvers.find(a => a.step_number === closing.current_step);
  const next = closing.approvers.find(a => a.step_number === closing.current_step + 1);
  const plan = await prisma.marketing_plans.findUnique({ where: { id: closing.marketing_plan_id } });
  const approve = action === 'APPROVE';

  await prisma.$transaction(async (tx) => {
    await tx.marketing_plan_closing_approvers.update({
      where: { id: current.id },
      data: { status: approve ? 'APPROVED' : 'REJECTED', action_at: new Date(), comment: comment || null }
    });

    if (!approve) {
      await tx.marketing_plan_closings.update({
        where: { id: closing.id },
        data: { status: 'REJECTED', rejection_reason: comment, magic_link_used_at: new Date(), updated_at: new Date() }
      });
    } else if (next) {
      await tx.marketing_plan_closing_approvers.update({ where: { id: next.id }, data: { status: 'PENDING' } });
      await tx.marketing_plan_closings.update({
        where: { id: closing.id },
        data: {
          current_step: next.step_number,
          approver_signer_id: next.signer_id,
          magic_link_token: crypto.randomBytes(32).toString('hex'),
          magic_link_expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS),
          magic_link_used_at: null,
          updated_at: new Date()
        }
      });
    } else {
      await tx.marketing_plan_closings.update({
        where: { id: closing.id },
        data: { status: 'APPROVED', approved_at: new Date(), magic_link_used_at: new Date(), updated_at: new Date() }
      });
      await tx.marketing_plans.update({ where: { id: closing.marketing_plan_id }, data: { status: 'COMPLETED', updated_at: new Date() } });
    }
  });

  if (!approve) {
    notifySubmitter(closing, plan, '[Closing Ditolak]',
      `<p>Halo ${closing.submitted_by?.name},</p><p>Closing Marketing Plan <strong>${plan.title}</strong> <strong>DITOLAK</strong> oleh ${current.role_label} (${current.signer.name}).</p><p>Alasan: ${comment}</p><p>Silakan perbaiki isian closing dan ajukan ulang.</p>`);
  } else if (next) {
    await notifyStepApprover(closing.id);
  } else {
    notifySubmitter(closing, plan, '[Closing Disetujui]',
      `<p>Halo ${closing.submitted_by?.name},</p><p>Closing Marketing Plan <strong>${plan.title}</strong> telah <strong>DISETUJUI</strong> oleh seluruh approver. Plan resmi ditutup (COMPLETED).</p>`);
  }
}

// PUT /plans/:id/closing/approve | /reject — dari dalam aplikasi (admin), untuk tahap aktif
function decideInApp(action) {
  return async (req, res, next) => {
    try {
      const planId = parseInt(req.params.id, 10);
      const plan = await loadPlan(planId);
      if (!plan || !inScope(req, plan)) return res.status(404).json({ error: 'Marketing Plan not found.' });
      const closing = await loadClosing(planId);
      if (!closing || closing.status !== 'PENDING_APPROVAL') {
        return res.status(400).json({ error: 'Tidak ada closing yang menunggu persetujuan.' });
      }
      const comment = (req.body?.rejection_reason || req.body?.comment || '').trim();
      if (action === 'REJECT' && !comment) return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
      await applyDecision(closing, action, comment);
      res.json(responseFor(await loadPlan(planId), await loadClosing(planId)));
    } catch (err) {
      next(err);
    }
  };
}

async function findValidMagicClosing(token, res) {
  const closing = await prisma.marketing_plan_closings.findUnique({ where: { magic_link_token: token }, include: CLOSING_INCLUDE });
  if (!closing) { res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' }); return null; }
  if (closing.magic_link_used_at) { res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' }); return null; }
  if (new Date() > closing.magic_link_expires_at) { res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' }); return null; }
  if (closing.status !== 'PENDING_APPROVAL') { res.status(410).json({ error: 'Closing ini sudah diproses melalui jalur lain.' }); return null; }
  return closing;
}

// GET /closing/magic/:token (PUBLIK)
async function getClosingByToken(req, res, next) {
  try {
    const closing = await findValidMagicClosing(req.params.token, res);
    if (!closing) return;
    const plan = await loadPlan(closing.marketing_plan_id);
    res.json({
      plan: {
        id: plan.id, title: plan.title, company: plan.company?.name,
        event_start_date: plan.event_start_date, event_end_date: plan.event_end_date,
        total_budget: num(plan.total_budget), actual_notes: plan.actual_notes,
        is_late_submission: plan.is_late_submission, late_submission_reason: plan.late_submission_reason
      },
      ...responseFor(plan, closing)
    });
  } catch (err) {
    next(err);
  }
}

// POST /closing/magic/:token (PUBLIK)
async function processClosingByToken(req, res, next) {
  try {
    const { action } = req.body;
    const comment = (req.body.rejection_reason || req.body.comment || '').trim();
    if (!['APPROVE', 'REJECT'].includes(action)) return res.status(400).json({ error: 'Action harus APPROVE atau REJECT.' });
    if (action === 'REJECT' && !comment) return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
    const closing = await findValidMagicClosing(req.params.token, res);
    if (!closing) return;
    const isLastStep = closing.current_step === closing.approvers.length;
    await applyDecision(closing, action, comment);
    res.json({
      message: action === 'REJECT' ? 'Closing ditolak.' : isLastStep ? 'Closing disetujui. Plan COMPLETED.' : 'Disetujui. Diteruskan ke approver berikutnya.',
      final: action === 'REJECT' || isLastStep
    });
  } catch (err) {
    next(err);
  }
}

// PUT /plans/:id/closing/settle — Finance mengonfirmasi kelebihan dana sudah kembali / claim sudah dibayar
async function settleClosing(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const plan = await loadPlan(planId);
    if (!plan || !inScope(req, plan)) return res.status(404).json({ error: 'Marketing Plan not found.' });
    const closing = await loadClosing(planId);
    if (!closing || closing.status !== 'APPROVED') return res.status(400).json({ error: 'Settlement is only for approved closings.' });
    if (closing.settled_at) return res.status(400).json({ error: 'This closing is already marked as settled.' });

    await prisma.marketing_plan_closings.update({
      where: { id: closing.id },
      data: {
        settled_at: new Date(),
        settled_by: req.user?.full_name || req.user?.email || 'Finance',
        settlement_note: req.body?.note ? String(req.body.note).trim() || null : null,
        updated_at: new Date()
      }
    });
    res.json(responseFor(await loadPlan(planId), await loadClosing(planId)));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  settleClosing,
  getClosing,
  saveClosing,
  submitClosing,
  approveClosing: decideInApp('APPROVE'),
  rejectClosing: decideInApp('REJECT'),
  getClosingByToken,
  processClosingByToken
};
