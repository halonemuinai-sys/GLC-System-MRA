const prisma = require('../../api/db');
const { resolveEmployee, queueMagicLink, dispatchMagicLinkEmails } = require('./marketingHelper');

const PAYMENT_INCLUDE = {
  marketing_plan_item: {
    include: {
      marketing_plan: {
        include: { company: true }
      }
    }
  },
  creator: { select: { id: true, name: true, email: true } }
};

// POST /payments — buat payment request baru
async function createPaymentRequest(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User email not registered in employee database.' });

    const { marketing_plan_item_id, title, amount, notes, doc_url } = req.body;
    if (!marketing_plan_item_id || !title || !amount) {
      return res.status(400).json({ error: 'marketing_plan_item_id, title, and amount are required.' });
    }

    const itemAmt = parseFloat(amount);

    const planItem = await prisma.marketing_plan_items.findUnique({
      where: { id: parseInt(marketing_plan_item_id, 10) },
      include: { marketing_plan: { include: { company: true } } }
    });

    if (!planItem) return res.status(404).json({ error: 'Marketing Plan Item not found.' });
    if (planItem.marketing_plan.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Cannot request payment on an unapproved marketing plan.' });
    }

    const remainingBudget = parseFloat(planItem.budget_amount) - parseFloat(planItem.actual_amount);
    let status = 'PENDING';
    const isOverbudget = itemAmt > remainingBudget;
    if (isOverbudget) status = 'OVERBUDGET_WARN';

    const duplicate = await prisma.payment_requests.findFirst({
      where: {
        marketing_plan_item_id: parseInt(marketing_plan_item_id, 10),
        amount: itemAmt,
        status: { in: ['APPROVED', 'PAID'] }
      }
    });
    if (duplicate) return res.status(400).json({ error: 'Potensi Tagihan Ganda dideteksi! Pengajuan dibatalkan.' });

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
        return res.status(400).json({ error: 'Pengajuan di atas Rp 50 Juta wajib memiliki lampiran Perjanjian Kerja Sama (PKS) aktif di modul Legal!' });
      }
    }

    const magicLinkQueue = [];
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment_requests.create({
        data: {
          marketing_plan_item_id: parseInt(marketing_plan_item_id, 10),
          title, amount: itemAmt, status, notes, doc_url,
          creator_id: employee.id
        }
      });

      let stepNum = 1;
      const approvalRules = await tx.approval_rules.findMany({
        where: {
          module: 'PAYMENT_REQUEST',
          min_amount: { lte: itemAmt },
          OR: [{ max_amount: { gte: itemAmt } }, { max_amount: null }]
        },
        orderBy: { step_number: 'asc' }
      });

      if (approvalRules.length > 0) {
        const history = await tx.approval_history.create({
          data: { payment_request_id: payment.id, approver_id: employee.id, step_number: stepNum, status: 'PENDING' }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: history.id, role: approvalRules[0].approver_role,
          stepNumber: stepNum, companyMasterId: planItem.marketing_plan.company?.company_master_id
        });
      }

      if (isOverbudget) {
        const lastStep = approvalRules.length > 0 ? approvalRules[approvalRules.length - 1].step_number : 1;
        const escHistory = await tx.approval_history.create({
          data: {
            payment_request_id: payment.id, approver_id: employee.id,
            step_number: lastStep + 1, status: 'PENDING',
            comment: 'Eskalasi Otomatis: Pengeluaran Melampaui Sisa Anggaran (Overbudget Warning)'
          }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: escHistory.id, role: 'CFO_CEO',
          stepNumber: lastStep + 1, companyMasterId: planItem.marketing_plan.company?.company_master_id
        });
      }
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
    const { status, plan_id, company_id, fiscal_year, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role.toUpperCase();
    const employee = await resolveEmployee(req.user.email);

    const where = {};
    if (status) where.status = status;

    // Non-admin hanya lihat payment milik sendiri atau dari plan yang mereka buat
    if (userRole !== 'ADMIN' && userRole !== 'AUDITOR') {
      if (employee) where.creator_id = employee.id;
    }

    if (plan_id || company_id || fiscal_year) {
      where.marketing_plan_item = {
        marketing_plan: {}
      };
      if (plan_id) where.marketing_plan_item.marketing_plan_id = parseInt(plan_id, 10);
      if (company_id) where.marketing_plan_item.marketing_plan.company_id = parseInt(company_id, 10);
      if (fiscal_year) where.marketing_plan_item.marketing_plan.fiscal_year = parseInt(fiscal_year, 10);
    }

    const [payments, total] = await Promise.all([
      prisma.payment_requests.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.payment_requests.count({ where })
    ]);

    res.json({ data: payments, total, page: parseInt(page), limit: parseInt(limit) });
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
    res.json(payment);
  } catch (err) { next(err); }
}

// PUT /payments/:id — update payment request (hanya jika PENDING/OVERBUDGET_WARN)
async function updatePayment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment_requests.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    if (!['PENDING', 'OVERBUDGET_WARN'].includes(payment.status)) {
      return res.status(400).json({ error: 'Hanya payment dengan status PENDING yang bisa diubah.' });
    }

    const { title, notes, doc_url } = req.body;
    const updated = await prisma.payment_requests.update({
      where: { id },
      data: { title, notes, doc_url },
      include: PAYMENT_INCLUDE
    });
    res.json(updated);
  } catch (err) { next(err); }
}

// DELETE /payments/:id — hapus payment request (hanya jika PENDING)
async function deletePayment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment_requests.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    if (!['PENDING', 'OVERBUDGET_WARN'].includes(payment.status)) {
      return res.status(400).json({ error: 'Hanya payment dengan status PENDING yang bisa dihapus.' });
    }

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
      include: { marketing_plan_item: true }
    });
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });
    if (payment.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Hanya payment yang sudah APPROVED yang bisa ditandai PAID.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update actual_amount di plan item
      const newActual = parseFloat(payment.marketing_plan_item.actual_amount || 0) + parseFloat(payment.amount);
      await tx.marketing_plan_items.update({
        where: { id: payment.marketing_plan_item_id },
        data: { actual_amount: newActual }
      });

      return tx.payment_requests.update({
        where: { id },
        data: {
          status: 'PAID',
          paid_at: paid_at ? new Date(paid_at) : new Date(),
          notes: paid_notes ? `${payment.notes || ''}\n[PAID] ${paid_notes}`.trim() : payment.notes
        },
        include: PAYMENT_INCLUDE
      });
    });

    res.json(updated);
  } catch (err) { next(err); }
}

module.exports = {
  createPaymentRequest,
  getPayments,
  getPaymentDetail,
  updatePayment,
  deletePayment,
  markPaymentPaid
};
