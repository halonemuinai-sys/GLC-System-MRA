const prisma = require('../../api/db');
const { resolveEmployee, resolveApproverContact, queueMagicLink, dispatchMagicLinkEmails } = require('./marketingHelper');

// Reimbursement records an expense already paid personally but not yet recorded.
// It may use an existing budget item or create an unbudgeted expense item, with Finance-only approval.
async function createClaim(req, res, next) {
  try {
    const { marketing_plan_id, marketing_plan_item_id, coa_id, title, amount, notes, doc_url, expense_date, reimbursement_payee, expense_vendor, confirmed_paid } = req.body;
    const planId = Number(marketing_plan_id);
    const itemId = marketing_plan_item_id ? Number(marketing_plan_item_id) : null;
    const coaId = coa_id ? Number(coa_id) : null;
    const value = Number(amount);
    if (confirmed_paid !== true || !Number.isInteger(planId) || planId <= 0 ||
        (itemId !== null && (!Number.isInteger(itemId) || itemId <= 0)) ||
        (itemId === null && (!Number.isInteger(coaId) || coaId <= 0)) || !Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value * 100)) ||
        typeof title !== 'string' || !title.trim() || title.trim().length > 200 ||
        (notes != null && typeof notes !== 'string') || typeof doc_url !== 'string' || !doc_url.trim() ||
        typeof reimbursement_payee !== 'string' || !reimbursement_payee.trim() || reimbursement_payee.trim().length > 150 ||
        (expense_vendor != null && (typeof expense_vendor !== 'string' || expense_vendor.trim().length > 200))) {
      return res.status(400).json({ error: 'Isi campaign, pos anggaran atau akun biaya, judul transaksi, nominal, penerima reimbursement, dan bukti.' });
    }
    const expenseDate = typeof expense_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expense_date) ? new Date(`${expense_date}T00:00:00.000Z`) : null;
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!expenseDate || !Number.isFinite(expenseDate.getTime()) || expenseDate.toISOString().slice(0, 10) !== expense_date || expense_date > today) {
      return res.status(400).json({ error: 'Tanggal transaksi wajib valid dan tidak boleh di masa depan.' });
    }
    let proof;
    try { proof = new URL(doc_url); } catch { return res.status(400).json({ error: 'URL bukti tidak valid.' }); }
    if (!['https:', 'http:'].includes(proof.protocol)) return res.status(400).json({ error: 'URL bukti harus HTTP/HTTPS.' });
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'Email tidak terdaftar sebagai Master Signer.' });
    const queue = [];
    const result = await prisma.$transaction(async tx => {
      // Serialize per campaign, including reimbursements that create a new item.
      await tx.$queryRaw`SELECT id FROM marketing_budget.marketing_plans WHERE id = ${planId} FOR UPDATE`;
      const plan = await tx.marketing_plans.findUnique({ where: { id: planId }, include: { company: true, closing: true } });
      if (!plan || (!req.companyScope.all && !req.companyScope.companyIds.includes(plan.company_id))) {
        const error = new Error('Campaign tidak ditemukan.'); error.status = 404; throw error;
      }
      const item = itemId ? await tx.marketing_plan_items.findUnique({ where: { id: itemId } }) : null;
      if (itemId && (!item || item.marketing_plan_id !== planId)) {
        const error = new Error('Pos anggaran bukan milik campaign ini.'); error.status = 400; throw error;
      }
      if (!itemId && !await tx.m_coa.findUnique({ where: { id: coaId } })) {
        const error = new Error('Akun biaya tidak valid.'); error.status = 400; throw error;
      }
      if (plan.status !== 'APPROVED' || ['PENDING_APPROVAL', 'APPROVED'].includes(plan.closing?.status)) {
        const error = new Error('Reimbursement dapat diajukan pada campaign approved sebelum closing diajukan.'); error.status = 400; throw error;
      }
      const duplicate = await tx.payment_requests.findFirst({ where: {
        marketing_plan_item: { marketing_plan_id: planId }, amount: value,
        doc_url: doc_url.trim(), status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      } });
      if (duplicate) { const error = new Error('Transaksi dengan nominal dan bukti yang sama sudah tercatat pada campaign ini.'); error.status = 409; throw error; }
      if (value > 50000000) {
        const agreement = await tx.documents.findFirst({ where: {
          mra_party_id: plan.company_id, amount: { gte: value }, status: 'Active', valid_until: { gte: new Date() }
        } });
        if (!agreement) { const error = new Error('Claim di atas Rp 50 juta memerlukan PKS aktif di modul Legal.'); error.status = 400; throw error; }
      }
      const expenseItem = item || await tx.marketing_plan_items.create({ data: {
        marketing_plan_id: planId, coa_id: coaId, period_month: expenseDate.getUTCMonth() + 1,
        budget_amount: 0, actual_amount: 0, qty: 1, unit_price: 0,
        description: `Reimbursement: ${title.trim()}`
      } });
      const payment = await tx.payment_requests.create({ data: {
        marketing_plan_item_id: expenseItem.id, request_type: 'CLAIM', title: title.trim(), amount: value,
        notes: notes?.trim() || null, doc_url: doc_url.trim(), status: 'PENDING', creator_id: employee.id,
        expense_date: expenseDate, reimbursement_payee: reimbursement_payee.trim(), expense_vendor: expense_vendor?.trim() || null
      } });
      const history = await tx.approval_history.create({ data: {
        payment_request_id: payment.id, approver_id: employee.id, step_number: 1, status: 'PENDING'
      } });
      const financeContact = await resolveApproverContact(tx, 'FINANCE_CONTROLLER', plan.company_id, plan.company?.company_master_id);
      await queueMagicLink(tx, queue, { approvalHistoryId: history.id, role: financeContact ? 'FINANCE_CONTROLLER' : 'FINANCE', stepNumber: 1,
        companyId: plan.company_id, companyMasterId: plan.company?.company_master_id });
      return { payment, companyName: plan.company?.name };
    });
    await dispatchMagicLinkEmails(queue, { docTitle: `Reimbursement: ${result.payment.title}`, docAmount: value,
      companyName: result.companyName, requesterName: employee.name });
    res.status(201).json(result.payment);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { createClaim };
