const prisma = require('../../api/db');
const { resolveEmployee, resolveApproverContact, queueMagicLink, dispatchMagicLinkEmails, isMarketingManager } = require('./marketingHelper');

// Reimbursements are additional transactions: each claim gets its own unbudgeted line under the
// "Others" cost account (CoA 620110), approved by Finance only, and can be edited while pending
// or deleted while pending/rejected — the extra line is removed with it.
const OTHERS_COA_CODE = '620110';
const httpError = (status, message) => Object.assign(new Error(message), { status });

async function resolveOthersCoa(db) {
  const coa = await db.m_coa.findFirst({ where: { code: OTHERS_COA_CODE } })
    || await db.m_coa.findFirst({ where: { name: { equals: 'Others', mode: 'insensitive' } } });
  if (!coa) throw httpError(400, `Cost account ${OTHERS_COA_CODE} - Others is missing in the CoA master.`);
  return coa;
}

// Shared validation for create and edit. Returns cleaned values.
function cleanClaimInput(body) {
  const { title, amount, notes, doc_url, expense_date, reimbursement_payee, expense_vendor } = body;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value * 100)) ||
      typeof title !== 'string' || !title.trim() || title.trim().length > 200 ||
      (notes != null && typeof notes !== 'string') || typeof doc_url !== 'string' || !doc_url.trim() ||
      typeof reimbursement_payee !== 'string' || !reimbursement_payee.trim() || reimbursement_payee.trim().length > 150 ||
      (expense_vendor != null && (typeof expense_vendor !== 'string' || expense_vendor.trim().length > 200))) {
    throw httpError(400, 'Fill in the title, amount, payee and proof of the reimbursement.');
  }
  const expenseDate = typeof expense_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expense_date) ? new Date(`${expense_date}T00:00:00.000Z`) : null;
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!expenseDate || !Number.isFinite(expenseDate.getTime()) || expenseDate.toISOString().slice(0, 10) !== expense_date || expense_date > today) {
    throw httpError(400, 'The transaction date must be valid and cannot be in the future.');
  }
  let proof;
  try { proof = new URL(doc_url); } catch { throw httpError(400, 'Invalid proof URL.'); }
  if (!['https:', 'http:'].includes(proof.protocol)) throw httpError(400, 'The proof URL must be HTTP/HTTPS.');
  return {
    title: title.trim(), value, notes: notes?.trim() || null, doc_url: doc_url.trim(), expenseDate,
    payee: reimbursement_payee.trim(), vendor: expense_vendor?.trim() || null
  };
}

async function assertPksIfLarge(tx, plan, value) {
  if (value <= 50000000) return;
  const agreement = await tx.documents.findFirst({ where: { mra_party_id: plan.company_id, amount: { gte: value }, status: 'Active', valid_until: { gte: new Date() } } });
  if (!agreement) throw httpError(400, 'Claims above Rp 50,000,000 require an active cooperation agreement (PKS) in the Legal module.');
}

const claimOpenForChanges = plan => plan.status === 'APPROVED' && !['PENDING_APPROVAL', 'APPROVED'].includes(plan.closing?.status);
async function createClaim(req, res, next) {
  try {
    const planId = Number(req.body.marketing_plan_id);
    if (req.body.confirmed_paid !== true || !Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({ error: 'Select the campaign and confirm the cost was paid personally.' });
    }
    const { title, value, notes, doc_url, expenseDate, payee, vendor } = cleanClaimInput(req.body);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'Your email is not registered as a Master Signer.' });
    const queue = [];
    const result = await prisma.$transaction(async tx => {
      // Serialize per campaign, including reimbursements that create a new item.
      await tx.$queryRaw`SELECT id FROM marketing_budget.marketing_plans WHERE id = ${planId} FOR UPDATE`;
      const plan = await tx.marketing_plans.findUnique({ where: { id: planId }, include: { company: true, closing: true } });
      if (!plan || (!req.companyScope.all && !req.companyScope.companyIds.includes(plan.company_id))) throw httpError(404, 'Campaign not found.');
      if (!claimOpenForChanges(plan)) throw httpError(400, 'Reimbursements can be added to an approved campaign until its closing is submitted.');
      const duplicate = await tx.payment_requests.findFirst({ where: {
        marketing_plan_item: { marketing_plan_id: planId }, amount: value, doc_url, status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      } });
      if (duplicate) throw httpError(409, 'A transaction with the same amount and proof is already recorded on this campaign.');
      await assertPksIfLarge(tx, plan, value);
      const others = await resolveOthersCoa(tx);
      const expenseItem = await tx.marketing_plan_items.create({ data: {
        marketing_plan_id: planId, coa_id: others.id, period_month: expenseDate.getUTCMonth() + 1,
        budget_amount: 0, actual_amount: 0, qty: 1, unit_price: 0,
        description: `Reimbursement: ${title}`
      } });
      const payment = await tx.payment_requests.create({ data: {
        marketing_plan_item_id: expenseItem.id, request_type: 'CLAIM', title, amount: value,
        notes, doc_url, status: 'PENDING', creator_id: employee.id,
        expense_date: expenseDate, reimbursement_payee: payee, expense_vendor: vendor
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

async function loadClaim(tx, req, id) {
  const claim = Number.isInteger(id) ? await tx.payment_requests.findUnique({
    where: { id },
    include: { approval_history: true, marketing_plan_item: { include: { marketing_plan: { include: { company: true, closing: true } } } } }
  }) : null;
  const plan = claim?.marketing_plan_item?.marketing_plan;
  if (!claim || claim.request_type !== 'CLAIM' || !plan || (!req.companyScope.all && !req.companyScope.companyIds.includes(plan.company_id))) throw httpError(404, 'Reimbursement not found.');
  const employee = await resolveEmployee(req.user.email);
  if (!isMarketingManager(req) && (!employee || employee.id !== claim.creator_id)) throw httpError(403, 'Only the requester or a Marketing Manager can change this reimbursement.');
  if (!claimOpenForChanges(plan)) throw httpError(400, 'The closing is already submitted or approved; reimbursements are locked.');
  return { claim, plan };
}

// PUT /claims/:id — edit a reimbursement that Finance has not decided yet.
async function updateClaim(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const input = cleanClaimInput(req.body);
    const updated = await prisma.$transaction(async tx => {
      const { claim, plan } = await loadClaim(tx, req, id);
      if (claim.status !== 'PENDING') throw httpError(400, 'Only reimbursements waiting for Finance can be edited.');
      const duplicate = await tx.payment_requests.findFirst({ where: {
        id: { not: id }, marketing_plan_item: { marketing_plan_id: plan.id }, amount: input.value, doc_url: input.doc_url, status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      } });
      if (duplicate) throw httpError(409, 'A transaction with the same amount and proof is already recorded on this campaign.');
      await assertPksIfLarge(tx, plan, input.value);
      const item = claim.marketing_plan_item;
      if (String(item.description || '').startsWith('Reimbursement: ') && Number(item.budget_amount) === 0) {
        await tx.marketing_plan_items.update({ where: { id: item.id }, data: { description: `Reimbursement: ${input.title}`, period_month: input.expenseDate.getUTCMonth() + 1 } });
      }
      return tx.payment_requests.update({
        where: { id },
        data: { title: input.title, amount: input.value, notes: input.notes, doc_url: input.doc_url, expense_date: input.expenseDate, reimbursement_payee: input.payee, expense_vendor: input.vendor, updated_at: new Date() }
      });
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// DELETE /claims/:id — pending or rejected reimbursements; removes its extra "Others" line too.
async function deleteClaim(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.$transaction(async tx => {
      const { claim } = await loadClaim(tx, req, id);
      if (!['PENDING', 'REJECTED'].includes(claim.status)) throw httpError(400, 'Approved or paid reimbursements cannot be deleted.');
      const item = claim.marketing_plan_item;
      await tx.approval_history.deleteMany({ where: { payment_request_id: id } });
      await tx.payment_requests.delete({ where: { id } });
      const othersOnItem = await tx.payment_requests.count({ where: { marketing_plan_item_id: item.id } });
      if (!othersOnItem && String(item.description || '').startsWith('Reimbursement: ') && Number(item.budget_amount) === 0) {
        await tx.marketing_plan_closing_items.deleteMany({ where: { plan_item_id: item.id } });
        await tx.marketing_plan_items.delete({ where: { id: item.id } });
      }
    });
    res.status(204).end();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { createClaim, updateClaim, deleteClaim, resolveOthersCoa, cleanClaimInput };
