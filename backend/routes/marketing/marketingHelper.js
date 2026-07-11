const crypto = require('crypto');
const prisma = require('../../api/db');
const { sendApprovalMagicLinkEmail } = require('../../api/mailer');

const MAGIC_LINK_EXPIRY_DAYS = 7;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Helper: Resolve NIK from JWT req.user.email
async function resolveEmployee(email) {
  if (!email) return null;
  return prisma.helpdesk_user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { company: true }
  });
}

// Resolve email penerima untuk 1 role
async function resolveApproverContact(tx, role, companyMasterId) {
  if (companyMasterId) {
    const override = await tx.approval_role_contacts.findFirst({ where: { role, company_master_id: companyMasterId } });
    if (override) return override;
  }
  return tx.approval_role_contacts.findFirst({ where: { role, company_master_id: null } });
}

// Buat token magic-link untuk 1 step approval_history di dalam transaction, lalu catat ke queue
async function queueMagicLink(tx, queue, { approvalHistoryId, role, stepNumber, companyMasterId }) {
  const contact = await resolveApproverContact(tx, role, companyMasterId);
  if (!contact) return; 
  const email = contact.email;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await tx.approval_magic_links.create({
    data: { token, approval_history_id: approvalHistoryId, recipient_email: email, expires_at: expiresAt }
  });
  queue.push({ email, role, token, stepNumber });
}

async function dispatchMagicLinkEmails(queue, { docTitle, docAmount, companyName, requesterName }) {
  for (const item of queue) {
    try {
      await sendApprovalMagicLinkEmail({
        to: item.email,
        approverLabel: item.role.replace(/_/g, ' '),
        docTitle,
        docAmount: `Rp ${Number(docAmount).toLocaleString('id-ID')}`,
        companyName,
        requesterName,
        stepNumber: item.stepNumber,
        approveUrl: `${FRONTEND_URL}/approve/${item.token}`
      });
    } catch (e) {
      console.error('Magic link email failed:', e.message);
    }
  }
}

// Ambil info dokumen dari sebuah approval_history task
async function getDocContextForTask(task) {
  const isPlan = !!task.marketing_plan_id;
  if (isPlan) {
    const plan = await prisma.marketing_plans.findUnique({
      where: { id: task.marketing_plan_id },
      include: { company: true, creator: true }
    });
    return { docTitle: plan.title, docAmount: plan.total_budget, companyName: plan.company?.name, requesterName: plan.creator?.name };
  }
  const payment = await prisma.payment_requests.findUnique({
    where: { id: task.payment_request_id },
    include: { marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } }, creator: true }
  });
  return {
    docTitle: payment.title,
    docAmount: payment.amount,
    companyName: payment.marketing_plan_item?.marketing_plan?.company?.name,
    requesterName: payment.creator?.name
  };
}

// Ambil Holding Group (company_master_id) dari sebuah approval_history task
function getCompanyMasterIdForTask(task) {
  const isPlan = !!task.marketing_plan_id;
  if (isPlan) return task.marketing_plan?.company?.company_master_id || null;
  return task.payment_request?.marketing_plan_item?.marketing_plan?.company?.company_master_id || null;
}

// Logika inti eksekusi keputusan approve/reject
async function executeApprovalDecision({ task, action, comment, signature, actingApproverId, consumeMagicLinkId }) {
  const magicLinkQueue = [];

  const result = await prisma.$transaction(async (tx) => {
    if (consumeMagicLinkId) {
      await tx.approval_magic_links.update({
        where: { id: consumeMagicLinkId },
        data: { used_at: new Date() }
      });
    }

    await tx.approval_history.update({
      where: { id: task.id },
      data: {
        approver_id: actingApproverId,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        comment,
        signature_url: signature || null,
        action_at: new Date()
      }
    });

    const isPlan = !!task.marketing_plan_id;
    const docId = isPlan ? task.marketing_plan_id : task.payment_request_id;
    const amt = isPlan ? parseFloat(task.marketing_plan.total_budget) : parseFloat(task.payment_request.amount);
    const mod = isPlan ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';

    if (action === 'REJECT') {
      if (isPlan) {
        await tx.marketing_plans.update({ where: { id: docId }, data: { status: 'REJECTED' } });
      } else {
        await tx.payment_requests.update({ where: { id: docId }, data: { status: 'REJECTED' } });
      }
      return { message: 'Document successfully rejected and returned to draft.', action };
    }

    const nextStep = task.step_number + 1;
    const nextRule = await tx.approval_rules.findFirst({
      where: {
        module: mod,
        step_number: nextStep,
        min_amount: { lte: amt },
        OR: [{ max_amount: { gte: amt } }, { max_amount: null }]
      }
    });

    const isOverbudget = !isPlan && task.payment_request.status === 'OVERBUDGET_WARN';
    const maxNormalSteps = await tx.approval_rules.count({
      where: {
        module: mod,
        min_amount: { lte: amt },
        OR: [{ max_amount: { gte: amt } }, { max_amount: null }]
      }
    });

    const hasNextStep = nextRule || (isOverbudget && nextStep <= (maxNormalSteps + 1));

    if (hasNextStep) {
      const nextHistory = await tx.approval_history.create({
        data: {
          marketing_plan_id: task.marketing_plan_id,
          payment_request_id: task.payment_request_id,
          approver_id: actingApproverId,
          step_number: nextStep,
          status: 'PENDING'
        }
      });
      const nextRole = nextRule ? nextRule.approver_role : 'CFO_CEO';
      const companyMasterId = getCompanyMasterIdForTask(task);
      await queueMagicLink(tx, magicLinkQueue, { approvalHistoryId: nextHistory.id, role: nextRole, stepNumber: nextStep, companyMasterId });
      return { message: 'Approved. Forwarded to the next step approval chain.', action };
    } else {
      if (isPlan) {
        await tx.marketing_plans.update({ where: { id: docId }, data: { status: 'APPROVED' } });
      } else {
        // Final approval = persetujuan finansial → APPROVED
        // PAID = konfirmasi transfer sudah keluar, dilakukan manual via mark-paid endpoint
        await tx.payment_requests.update({ where: { id: docId }, data: { status: 'APPROVED' } });
      }
      return { message: 'Final approval complete. Document marked as APPROVED.', action };
    }
  });

  return { result, magicLinkQueue };
}

module.exports = {
  resolveEmployee,
  resolveApproverContact,
  queueMagicLink,
  dispatchMagicLinkEmails,
  getDocContextForTask,
  getCompanyMasterIdForTask,
  executeApprovalDecision,
  FRONTEND_URL
};
