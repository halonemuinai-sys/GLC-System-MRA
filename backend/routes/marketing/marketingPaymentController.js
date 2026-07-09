const prisma = require('../../api/db');
const { resolveEmployee, queueMagicLink, dispatchMagicLinkEmails } = require('./marketingHelper');

// POST /payments
async function createPaymentRequest(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const { marketing_plan_item_id, title, amount, notes, doc_url } = req.body;

    if (!marketing_plan_item_id || !title || !amount) {
      return res.status(400).json({ error: 'marketing_plan_item_id, title, and amount are required.' });
    }

    const itemAmt = parseFloat(amount);

    // 1. Verifikasi sisa anggaran item plan
    const planItem = await prisma.marketing_plan_items.findUnique({
      where: { id: parseInt(marketing_plan_item_id, 10) },
      include: { marketing_plan: { include: { company: true } } }
    });

    if (!planItem) {
      return res.status(404).json({ error: 'Marketing Plan Item not found.' });
    }

    if (planItem.marketing_plan.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Cannot request payment on an unapproved marketing plan.' });
    }

    // Sisa budget = Budget - Actual
    const remainingBudget = parseFloat(planItem.budget_amount) - parseFloat(planItem.actual_amount);
    let status = 'PENDING';
    
    // Pengecekan Overbudget: jika melebihi budget, set warning
    const isOverbudget = itemAmt > remainingBudget;
    if (isOverbudget) {
      status = 'OVERBUDGET_WARN';
    }

    // 2. Proteksi Invoice Ganda (Anti-Duplicate Invoice)
    const duplicate = await prisma.payment_requests.findFirst({
      where: {
        marketing_plan_item_id: parseInt(marketing_plan_item_id, 10),
        amount: itemAmt,
        status: { in: ['APPROVED', 'PAID'] }
      }
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Potensi Tagihan Ganda dideteksi! Pengajuan dibatalkan.' });
    }

    // 3. Validasi Kepatuhan Lintas Modul: Validasi PKS Kontrak (Legal) & Vendor (GA)
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

    // 4. Create Payment Request & workflow approval
    const magicLinkQueue = [];
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment_requests.create({
        data: {
          marketing_plan_item_id: parseInt(marketing_plan_item_id, 10),
          title,
          amount: itemAmt,
          status,
          notes,
          doc_url,
          creator_id: employee.id
        }
      });

      let stepNum = 1;
      const approvalRules = await tx.approval_rules.findMany({
        where: {
          module: 'PAYMENT_REQUEST',
          min_amount: { lte: itemAmt },
          OR: [
            { max_amount: { gte: itemAmt } },
            { max_amount: null }
          ]
        },
        orderBy: { step_number: 'asc' }
      });

      if (approvalRules.length > 0) {
        const history = await tx.approval_history.create({
          data: {
            payment_request_id: payment.id,
            approver_id: employee.id, // placeholder
            step_number: stepNum,
            status: 'PENDING'
          }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: history.id,
          role: approvalRules[0].approver_role,
          stepNumber: stepNum,
          companyMasterId: planItem.marketing_plan.company?.company_master_id
        });
      }

      if (isOverbudget) {
        const lastStep = approvalRules.length > 0 ? approvalRules[approvalRules.length - 1].step_number : 1;
        const escHistory = await tx.approval_history.create({
          data: {
            payment_request_id: payment.id,
            approver_id: employee.id, // placeholder
            step_number: lastStep + 1,
            status: 'PENDING',
            comment: 'Eskalasi Otomatis: Pengeluaran Melampaui Sisa Anggaran (Overbudget Warning)'
          }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: escHistory.id,
          role: 'CFO_CEO',
          stepNumber: lastStep + 1,
          companyMasterId: planItem.marketing_plan.company?.company_master_id
        });
      }

      return payment;
    });

    if (magicLinkQueue.length > 0) {
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: title,
        docAmount: itemAmt,
        companyName: planItem.marketing_plan.company?.name,
        requesterName: employee.name
      });
    }

    res.status(201).json(newPayment);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPaymentRequest
};
