const prisma = require('../../api/db');
const { resolveEmployee, queueMagicLink, dispatchMagicLinkEmails, applyCompanyScope, canManageDoc, isMarketingManager, seesAllMarketingDocs, hasRole } = require('./marketingHelper');

const OPEN_STATUSES = ['PENDING', 'OVERBUDGET_WARN', 'APPROVED'];
const inScope = (req, companyId) => req.companyScope?.all || (req.companyScope?.companyIds || []).includes(companyId);
const isAdmin = req => hasRole(req, 'admin');

const PAYMENT_INCLUDE = {
  marketing_plan_item: {
    include: {
      m_coa: { select: { code: true, name: true } },
      marketing_plan: {
        include: { company: true }
      }
    }
  },
  creator: { select: { id: true, name: true, email: true } },
  approval_history: { orderBy: { step_number: 'asc' }, include: { approver: { select: { name: true } } } }
};

// POST /payments — buat payment request baru
async function createPaymentRequest(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'Your email is not registered as a Master Signer.' });

    const { marketing_plan_item_id, notes, doc_url } = req.body;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const itemAmt = Number(req.body.amount);
    if (!marketing_plan_item_id || !title) {
      return res.status(400).json({ error: 'marketing_plan_item_id, title, and amount are required.' });
    }
    if (!Number.isFinite(itemAmt) || itemAmt <= 0) {
      return res.status(400).json({ error: 'The request amount must be greater than 0.' });
    }

    const planItem = await prisma.marketing_plan_items.findUnique({
      where: { id: parseInt(marketing_plan_item_id, 10) },
      include: { marketing_plan: { include: { company: true } } }
    });

    if (!planItem) return res.status(404).json({ error: 'Marketing Plan Item not found.' });
    if (!inScope(req, planItem.marketing_plan.company_id)) {
      return res.status(404).json({ error: 'Marketing Plan Item not found.' });
    }
    if (planItem.marketing_plan.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Cannot request payment on an unapproved marketing plan.' });
    }

    // Remaining budget must also subtract requests already in flight (pending or
    // approved but not yet paid) — actual_amount only grows when a payment is PAID.
    const inFlight = await prisma.payment_requests.aggregate({
      where: { marketing_plan_item_id: planItem.id, status: { in: OPEN_STATUSES } },
      _sum: { amount: true }
    });
    const committed = Number(inFlight._sum.amount || 0);
    const remainingBudget = parseFloat(planItem.budget_amount) - parseFloat(planItem.actual_amount) - committed;
    const isOverbudget = itemAmt > remainingBudget;
    const status = isOverbudget ? 'OVERBUDGET_WARN' : 'PENDING';

    const duplicate = await prisma.payment_requests.findFirst({
      where: {
        marketing_plan_item_id: planItem.id,
        amount: itemAmt,
        status: { in: [...OPEN_STATUSES, 'PAID'] }
      }
    });
    if (duplicate) return res.status(400).json({ error: `Possible duplicate billing: request "${duplicate.title}" with the same amount already exists on this item (status ${duplicate.status}).` });

    if (itemAmt > 50000000) {
      const pks = await prisma.documents.findFirst({
        where: {
          mra_party_id: planItem.marketing_plan.company_id,
          amount: { gte: itemAmt },
          status: 'Active',
          valid_until: { gte: new Date() }
        }
      });
      if (!pks) {
        return res.status(400).json({ error: 'Requests above Rp 50,000,000 require an active cooperation agreement (PKS) in the Legal module.' });
      }
    }

    const approvalRules = await prisma.approval_rules.findMany({
      where: {
        module: 'PAYMENT_REQUEST',
        min_amount: { lte: itemAmt },
        OR: [{ max_amount: { gte: itemAmt } }, { max_amount: null }]
      },
      orderBy: { step_number: 'asc' }
    });
    if (!approvalRules.length && !isOverbudget) {
      return res.status(400).json({ error: 'No Payment Request approval tier covers this amount yet. Set one up in Approval Settings.' });
    }

    const magicLinkQueue = [];
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment_requests.create({
        data: {
          marketing_plan_item_id: planItem.id,
          title, amount: itemAmt, status, notes, doc_url,
          creator_id: employee.id
        }
      });

      // Only the first step is opened. Later steps — including the CFO/CEO overbudget
      // escalation after the last tier — are opened one by one by executeApprovalDecision,
      // so the escalation can never be approved ahead of the normal tiers.
      const history = await tx.approval_history.create({
        data: { payment_request_id: payment.id, approver_id: employee.id, step_number: 1, status: 'PENDING' }
      });
      await queueMagicLink(tx, magicLinkQueue, {
        approvalHistoryId: history.id, role: approvalRules.length ? approvalRules[0].approver_role : 'CFO_CEO',
        stepNumber: 1, companyId: planItem.marketing_plan.company?.id,
        companyMasterId: planItem.marketing_plan.company?.company_master_id
      });
      return payment;
    });

    if (magicLinkQueue.length > 0) {
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: title, docAmount: itemAmt,
        companyName: planItem.marketing_plan.company?.name,
        requesterName: employee.name
      });
    }

    res.status(201).json(newPayment);
  } catch (err) { next(err); }
}

// GET /payments — list semua payment request dengan filter
async function getPayments(req, res, next) {
  try {
    const { status, request_type, plan_id, company_id, fiscal_year, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const employee = await resolveEmployee(req.user.email);

    const where = {};
    if (['PAYMENT', 'CLAIM'].includes(request_type)) where.request_type = request_type;
    const q = typeof search === 'string' ? search.trim() : '';
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { po_number: { contains: q, mode: 'insensitive' } },
        { creator: { name: { contains: q, mode: 'insensitive' } } },
        { marketing_plan_item: { marketing_plan: { title: { contains: q, mode: 'insensitive' } } } },
        { marketing_plan_item: { marketing_plan: { company: { name: { contains: q, mode: 'insensitive' } } } } }
      ];
    }

    // Marketing staff only see their own requests; managers, finance, GA and auditors see the whole scope.
    if (!seesAllMarketingDocs(req)) {
      where.creator_id = employee?.id || -1;
    }

    if (plan_id || company_id || fiscal_year || !req.companyScope.all) {
      where.marketing_plan_item = {
        marketing_plan: {}
      };
      if (plan_id) where.marketing_plan_item.marketing_plan_id = parseInt(plan_id, 10);
      if (company_id) {
        const cid = parseInt(company_id, 10);
        if (!req.companyScope.all && !req.companyScope.companyIds.includes(cid)) {
          return res.status(400).json({ error: 'Company outside your access scope.' });
        }
        where.marketing_plan_item.marketing_plan.company_id = cid;
      } else {
        applyCompanyScope(where.marketing_plan_item.marketing_plan, req.companyScope);
      }
      if (fiscal_year) where.marketing_plan_item.marketing_plan.fiscal_year = parseInt(fiscal_year, 10);
    }

    // Summary per status uses every filter except status, so status tabs can show counts.
    const listWhere = status ? { ...where, status } : where;
    const [payments, total, byStatus] = await Promise.all([
      prisma.payment_requests.findMany({
        where: listWhere,
        include: PAYMENT_INCLUDE,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.payment_requests.count({ where: listWhere }),
      prisma.payment_requests.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { amount: true } })
    ]);

    const summary = {};
    for (const row of byStatus) summary[row.status] = { count: row._count._all, amount: Number(row._sum.amount || 0) };
    res.json({ data: payments, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), summary });
  } catch (err) { next(err); }
}

// GET /payments/:id — detail satu payment request
async function getPaymentDetail(req, res, next) {
  try {
    const payment = await prisma.payment_requests.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        ...PAYMENT_INCLUDE,
        approval_history: {
          orderBy: { step_number: 'asc' },
          include: { approver: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    const paymentCompanyId = payment.marketing_plan_item.marketing_plan.company_id;
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(paymentCompanyId)) {
      return res.status(404).json({ error: 'Payment request not found.' });
    }
    res.json(payment);
  } catch (err) { next(err); }
}

// Edit/delete is only for the requester (or admin) while nothing has been approved yet.
async function editBlockReason(req, payment) {
  if (!['PENDING', 'OVERBUDGET_WARN'].includes(payment.status)) {
    return { status: 400, error: 'Only undecided requests can be {action}.' };
  }
  if (!isMarketingManager(req)) {
    const employee = await resolveEmployee(req.user.email);
    if (!employee || employee.id !== payment.creator_id) return { status: 403, error: 'Only the requester or a Marketing Manager can {verb} this request.' };
  }
  if ((payment.approval_history || []).some(h => h.status === 'APPROVED')) {
    return { status: 400, error: 'This request is partially approved and can no longer be {action}.' };
  }
  return null;
}

// PUT /payments/:id — update payment request (hanya jika PENDING/OVERBUDGET_WARN)
async function updatePayment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment_requests.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(payment.marketing_plan_item.marketing_plan.company_id)) {
      return res.status(404).json({ error: 'Payment request not found.' });
    }
    if (payment.request_type === 'CLAIM') {
      return res.status(400).json({ error: 'A submitted claim cannot be edited. Delete it and submit again.' });
    }

    const editBlock = await editBlockReason(req, payment);
    if (editBlock) return res.status(editBlock.status).json({ error: editBlock.error.replace('{action}', 'edited').replace('{verb}', 'edit') });

    const { notes, doc_url } = req.body;
    const title = req.body.title === undefined ? undefined : String(req.body.title).trim();
    if (title === '') return res.status(400).json({ error: 'Title cannot be empty.' });
    const updated = await prisma.payment_requests.update({
      where: { id },
      data: { title, notes, doc_url, updated_at: new Date() },
      include: PAYMENT_INCLUDE
    });
    res.json(updated);
  } catch (err) { next(err); }
}

// DELETE /payments/:id — hapus payment request (hanya jika PENDING)
async function deletePayment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment_requests.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(payment.marketing_plan_item.marketing_plan.company_id)) {
      return res.status(404).json({ error: 'Payment request not found.' });
    }

    const deleteBlock = await editBlockReason(req, payment);
    if (deleteBlock) return res.status(deleteBlock.status).json({ error: deleteBlock.error.replace('{action}', 'deleted').replace('{verb}', 'delete') });

    await prisma.$transaction([
      prisma.approval_history.deleteMany({ where: { payment_request_id: id } }),
      prisma.payment_requests.delete({ where: { id } })
    ]);
    res.status(204).end();
  } catch (err) { next(err); }
}

// POST /payments/:id/mark-paid — tandai payment sudah dibayar (admin only)
async function markPaymentPaid(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { paid_at, paid_notes } = req.body;

    const payment = await prisma.payment_requests.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE
    });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(payment.marketing_plan_item.marketing_plan.company_id)) {
      return res.status(404).json({ error: 'Payment request not found.' });
    }
    // Finance records claim payouts; vendor payments are recorded by GA (or admin).
    if (payment.request_type !== 'CLAIM' && !hasRole(req, 'admin', 'ga')) {
      return res.status(403).json({ error: 'Vendor payments are recorded by GA. Finance records reimbursement payouts.' });
    }

    if (payment.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only APPROVED payments can be marked as PAID.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment_requests.updateMany({
        where: { id, status: 'APPROVED' },
        data: {
          status: 'PAID', paid_at: paid_at ? new Date(paid_at) : new Date(), updated_at: new Date(),
          notes: paid_notes ? `${payment.notes || ''}\n[PAID] ${paid_notes}`.trim() : payment.notes
        }
      });
      if (claimed.count !== 1) throw new Error('This payment has already been processed.');
      await tx.marketing_plan_items.update({
        where: { id: payment.marketing_plan_item_id },
        data: { actual_amount: { increment: payment.amount } }
      });
      return tx.payment_requests.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    });

    res.json(updated);
  } catch (err) { next(err); }
}

// POST /payments/:id/set-po — simpan nomor PO ke payment (admin/ga)
async function setPoNumber(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { po_number } = req.body;
    const purchaseOrderId = req.body.purchase_order_id ? parseInt(req.body.purchase_order_id, 10) : null;
    if (!purchaseOrderId && (!po_number || !po_number.trim())) {
      return res.status(400).json({ error: 'PO number is required.' });
    }
    const payment = await prisma.payment_requests.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    if (!payment || !inScope(req, payment.marketing_plan_item.marketing_plan.company_id)) return res.status(404).json({ error: 'Payment request not found.' });
    if (!['APPROVED', 'PAID'].includes(payment.status)) {
      return res.status(400).json({ error: 'A PO can only be issued for APPROVED or PAID payments.' });
    }
    let data = { po_number: String(po_number || '').trim(), po_issued_at: new Date(), purchase_order_id: null, updated_at: new Date() };
    if (purchaseOrderId) {
      // Link to a GA purchase order: same company, contains this plan item, and the PO line
      // (incl. tax) still covers this payment together with the other payments on it.
      const po = await prisma.purchase_orders.findUnique({
        where: { id: purchaseOrderId },
        include: { lines: { where: { marketing_plan_item_id: payment.marketing_plan_item_id } }, payment_requests: { where: { id: { not: id }, marketing_plan_item_id: payment.marketing_plan_item_id, status: { not: 'REJECTED' } }, select: { amount: true } } }
      });
      if (!po || po.company_id !== payment.marketing_plan_item.marketing_plan.company_id) return res.status(400).json({ error: 'Purchase order not found for this company.' });
      if (po.status !== 'ISSUED') return res.status(400).json({ error: 'Only issued purchase orders can be linked.' });
      if (!po.lines.length) return res.status(400).json({ error: 'This purchase order has no line for the payment item.' });
      const lineTotal = po.lines.reduce((sum, line) => sum + Number(line.amount), 0) * (1 + Number(po.tax_rate) / 100);
      const used = po.payment_requests.reduce((sum, p) => sum + Number(p.amount), 0);
      if (Number(payment.amount) > Math.round((lineTotal - used) * 100) / 100 + 0.01) {
        return res.status(400).json({ error: `The PO line only has Rp ${Math.max(0, Math.round(lineTotal - used)).toLocaleString('id-ID')} left for this item.` });
      }
      data = { po_number: po.po_number, po_issued_at: po.issued_at || new Date(), purchase_order_id: po.id, updated_at: new Date() };
    }
    const updated = await prisma.payment_requests.update({
      where: { id },
      data,
      include: PAYMENT_INCLUDE
    });
    res.json(updated);
  } catch (err) { next(err); }
}

// PUT /payments/:id/verify — Finance memverifikasi invoice & dokumen pendukung (atau membatalkan verifikasi)
async function verifyPayment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { verified = true, note } = req.body || {};
    const payment = await prisma.payment_requests.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    if (!payment || !inScope(req, payment.marketing_plan_item.marketing_plan.company_id)) return res.status(404).json({ error: 'Payment request not found.' });
    if (verified && !['APPROVED', 'PAID'].includes(payment.status)) {
      return res.status(400).json({ error: 'Only APPROVED or PAID payments can be verified.' });
    }
    const updated = await prisma.payment_requests.update({
      where: { id },
      data: verified
        ? { finance_verified_at: new Date(), finance_verified_by: req.user?.full_name || req.user?.email || 'Finance', finance_note: note ? String(note).trim() || null : null }
        : { finance_verified_at: null, finance_verified_by: null, finance_note: note ? String(note).trim() || null : null },
      include: PAYMENT_INCLUDE
    });
    res.json(updated);
  } catch (err) { next(err); }
}

module.exports = {
  verifyPayment,
  createPaymentRequest,
  getPayments,
  getPaymentDetail,
  updatePayment,
  deletePayment,
  markPaymentPaid,
  setPoNumber
};
