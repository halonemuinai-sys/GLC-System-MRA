const prisma = require('../../api/db');
const {
  resolveEmployee,
  executeApprovalDecision,
  getDocContextForTask,
  dispatchMagicLinkEmails,
  dispatchPaymentStatusEmail,
  dispatchPlanStatusEmail,
  applyCompanyScope
} = require('./marketingHelper');

// Versi in-memory dari resolveApproverContact (marketingHelper.js) — dipakai untuk PREVIEW
// "siapa penerima approval" di getApprovalsOverview, jalan terhadap array approval_role_contacts
// yang sudah di-batch-fetch sekali (hindari N+1 query per step per plan). Harus tetap sinkron
// dengan urutan tingkatan resolusi asli: PT spesifik > Holding Group > Default Global.
function resolveContactPreview(allContacts, role, companyId, companyMasterId) {
  const ptMatch = allContacts.find(c => c.role === role && c.company_id === companyId);
  if (ptMatch) return ptMatch;
  const holdingMatch = allContacts.find(c => c.role === role && c.company_id === null && c.company_master_id === companyMasterId);
  if (holdingMatch) return holdingMatch;
  return allContacts.find(c => c.role === role && c.company_id === null && c.company_master_id === null) || null;
}

const normalizeEmail = email => String(email || '').trim().toLowerCase();

const TASK_INCLUDE = {
  marketing_plan: {
    include: {
      company: true,
      creator: true,
      items: { include: { m_coa: true, m_brand: true, m_line_business: true }, orderBy: [{ period_month: 'asc' }, { id: 'asc' }] },
      approvers: { orderBy: { step_number: 'asc' } }
    }
  },
  payment_request: {
    include: {
      marketing_plan_item: { include: { m_coa: true, marketing_plan: { include: { company: true } } } },
      creator: true
    }
  }
};

const taskCompanyId = task => task.marketing_plan?.company_id ?? task.payment_request?.marketing_plan_item?.marketing_plan?.company_id ?? null;
const taskAmount = task => parseFloat(task.marketing_plan_id ? task.marketing_plan?.total_budget : task.payment_request?.amount) || 0;

// The single authorization rule shared by the task list and the decision endpoint,
// so a user never sees a task they cannot act on (or acts on one they cannot see).
//  - Claim: Finance only, step 1.
//  - Plan with a named approver chain (marketing_plan_approvers): only the person
//    whose email is assigned to that step.
//  - Otherwise: the approval_rules tier for the amount/step, or CFO/CEO for an
//    overbudget payment escalation step without a tier.
// Admin may act on everything except claims.
function canActOnTask(task, { role, email }, rules) {
  if (task.payment_request?.request_type === 'CLAIM') return role === 'FINANCE' && task.step_number === 1;
  if (role === 'ADMIN') return true;

  const isPlan = !!task.marketing_plan_id;
  const chainStep = isPlan ? (task.marketing_plan?.approvers || []).find(a => a.step_number === task.step_number) : null;
  if (chainStep) return normalizeEmail(chainStep.approver_email) === normalizeEmail(email);

  const amount = taskAmount(task);
  const module = isPlan ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';
  const rule = rules.find(r => r.module === module && r.step_number === task.step_number && Number(r.min_amount) <= amount && (r.max_amount === null || Number(r.max_amount) >= amount));
  if (rule) return rule.approver_role === role;
  const isOverbudgetEscalation = !isPlan && task.payment_request?.status === 'OVERBUDGET_WARN';
  return isOverbudgetEscalation && role === 'CFO_CEO';
}

// Who the task is waiting for, for display.
function waitingFor(task, rules) {
  const chainStep = (task.marketing_plan?.approvers || []).find(a => a.step_number === task.step_number);
  if (chainStep) return { name: chainStep.approver_name, email: chainStep.approver_email, role: chainStep.approver_role || null };
  if (task.payment_request?.request_type === 'CLAIM') return { name: null, email: null, role: 'FINANCE' };
  const amount = taskAmount(task);
  const module = task.marketing_plan_id ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';
  const rule = rules.find(r => r.module === module && r.step_number === task.step_number && Number(r.min_amount) <= amount && (r.max_amount === null || Number(r.max_amount) >= amount));
  return { name: null, email: null, role: rule?.approver_role || (task.payment_request?.status === 'OVERBUDGET_WARN' ? 'CFO_CEO' : null) };
}

const isDesignated = (task, { email }) => (task.marketing_plan?.approvers || []).some(a => a.step_number === task.step_number && normalizeEmail(a.approver_email) === normalizeEmail(email));

const inScope = (req, companyId) => req.companyScope?.all || (req.companyScope?.companyIds || []).includes(companyId);

// GET /tasks
async function getPendingTasks(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'Your email is not registered as a Master Signer.' });
    }

    const actor = { role: req.user.role.toUpperCase(), email: req.user.email };
    const pendingTasks = await prisma.approval_history.findMany({ where: { status: 'PENDING' }, include: TASK_INCLUDE, orderBy: { created_at: 'asc' } });
    // Claims are Finance-only and never consult the approval tiers.
    const rules = pendingTasks.some(t => t.payment_request?.request_type !== 'CLAIM') ? await prisma.approval_rules.findMany() : [];

    const tasks = pendingTasks
      .filter(task => (task.marketing_plan || task.payment_request) && (actor.role === 'ADMIN' || inScope(req, taskCompanyId(task)) || isDesignated(task, actor)))
      .filter(task => canActOnTask(task, actor, rules))
      .map(task => ({ ...task, waiting_for: waitingFor(task, rules) }));

    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

// POST /approvals/:id
async function processApproval(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'Your email is not registered as a Master Signer.' });
    }

    const { id } = req.params;
    const { action, comment, signature } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }
    if (action === 'REJECT' && (typeof comment !== 'string' || !comment.trim())) {
      return res.status(400).json({ error: 'Enter a reason for rejecting.' });
    }

    const task = await prisma.approval_history.findUnique({ where: { id: parseInt(id, 10) }, include: TASK_INCLUDE });
    if (!task || task.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval task not found.' });
    }

    const actor = { role: req.user.role.toUpperCase(), email: req.user.email };
    if (actor.role !== 'ADMIN' && !inScope(req, taskCompanyId(task)) && !isDesignated(task, actor)) {
      return res.status(403).json({ error: 'Company outside your access scope.' });
    }
    const rules = task.payment_request?.request_type === 'CLAIM' ? [] : await prisma.approval_rules.findMany();
    if (!canActOnTask(task, actor, rules)) {
      const isClaim = task.payment_request?.request_type === 'CLAIM';
      return res.status(403).json({ error: isClaim ? 'Claims can only be approved or rejected by Finance.' : 'You are not authorized to act on this approval step.' });
    }

    const { result, magicLinkQueue } = await executeApprovalDecision({
      task,
      action,
      comment: typeof comment === 'string' ? comment.trim() || null : null,
      signature,
      actingApproverId: employee.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }
    await dispatchPaymentStatusEmail(result, task);
    await dispatchPlanStatusEmail(result, task, comment);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /history — decisions made by the current user; admins see every decision
// in their company scope. Limited to the latest 300.
async function getApprovalHistory(req, res, next) {
  try {
    const role = req.user.role.toUpperCase();
    const employee = await resolveEmployee(req.user.email);
    if (role !== 'ADMIN' && !employee) return res.json([]);

    const records = await prisma.approval_history.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] }, ...(role === 'ADMIN' ? {} : { approver_id: employee.id }) },
      include: {
        approver: { select: { name: true } },
        marketing_plan: { include: { company: true, creator: true } },
        payment_request: {
          include: {
            marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } },
            creator: true
          }
        }
      },
      orderBy: [{ action_at: 'desc' }, { created_at: 'desc' }],
      take: 300
    });

    const history = records
      .filter(r => (r.marketing_plan || r.payment_request) && (role === 'ADMIN' ? inScope(req, taskCompanyId(r)) : true))
      .map(r => {
        const isPlan = !!r.marketing_plan_id;
        return {
          id: r.id,
          type: isPlan ? 'Marketing Plan' : r.payment_request.request_type === 'CLAIM' ? 'Claim' : 'Payment Request',
          title: isPlan ? r.marketing_plan.title : r.payment_request.title,
          creatorName: isPlan ? r.marketing_plan.creator?.name : r.payment_request.creator?.name,
          companyName: isPlan ? r.marketing_plan.company?.name : r.payment_request.marketing_plan_item?.marketing_plan?.company?.name,
          amount: isPlan ? r.marketing_plan.total_budget : r.payment_request.amount,
          step: r.step_number,
          action: r.status,
          comment: r.comment,
          approverName: r.approver?.name || null,
          mine: employee ? r.approver_id === employee.id : false,
          date: r.action_at || r.created_at
        };
      });

    res.json(history);
  } catch (err) {
    next(err);
  }
}

// GET /magic/:token
async function getMagicLinkDetail(req, res, next) {
  try {
    const { token } = req.params;

    const link = await prisma.approval_magic_links.findUnique({
      where: { token },
      include: {
        approval_history: {
          include: {
            marketing_plan: {
              include: {
                company: true,
                creator: true,
                items: { include: { m_coa: true, m_brand: true, m_line_business: true, m_branch: true, m_event_location: true, vendors: true } }
              }
            },
            payment_request: {
              include: {
                creator: true,
                marketing_plan_item: {
                  include: { m_coa: true, vendors: true, marketing_plan: { include: { company: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!link) {
      return res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' });
    }
    if (link.used_at) {
      return res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' });
    }
    if (new Date() > link.expires_at) {
      return res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' });
    }
    if (link.approval_history.status !== 'PENDING') {
      return res.status(410).json({ error: 'Approval ini sudah diproses melalui jalur lain.' });
    }

    res.json({
      recipientEmail: link.recipient_email,
      expiresAt: link.expires_at,
      task: link.approval_history
    });
  } catch (err) {
    next(err);
  }
}

// POST /magic/:token
async function processMagicLink(req, res, next) {
  try {
    const { token } = req.params;
    const { action, comment, signature } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }
    if (action === 'REJECT' && !comment) {
      return res.status(400).json({ error: 'Komentar wajib diisi untuk penolakan.' });
    }

    const link = await prisma.approval_magic_links.findUnique({ where: { token } });
    if (!link) {
      return res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' });
    }
    if (link.used_at) {
      return res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' });
    }
    if (new Date() > link.expires_at) {
      return res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' });
    }

    const task = await prisma.approval_history.findUnique({
      where: { id: link.approval_history_id },
      include: {
        marketing_plan: { include: { company: true } },
        payment_request: { include: { marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } } } }
      }
    });

    if (!task || task.status !== 'PENDING') {
      return res.status(410).json({ error: 'Approval ini sudah diproses melalui jalur lain.' });
    }

    const approverEmployee = await resolveEmployee(link.recipient_email);
    const actingApproverId = approverEmployee ? approverEmployee.id : task.approver_id;

    const { result, magicLinkQueue } = await executeApprovalDecision({
      task,
      action,
      comment,
      signature,
      actingApproverId,
      consumeMagicLinkId: link.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }
    await dispatchPaymentStatusEmail(result, task);
    await dispatchPlanStatusEmail(result, task, comment);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /approvals-overview
async function getApprovalsOverview(req, res, next) {
  try {
    const { company_id, fiscal_year, status } = req.query;

    const where = {};
    if (company_id) {
      const cid = parseInt(company_id, 10);
      if (!req.companyScope.all && !req.companyScope.companyIds.includes(cid)) {
        return res.status(400).json({ error: 'Company outside your access scope.' });
      }
      where.company_id = cid;
    } else {
      applyCompanyScope(where, req.companyScope);
    }
    if (fiscal_year) where.fiscal_year = parseInt(fiscal_year, 10);
    if (status) where.status = status;

    // Batch query: ambil semua rules dan contacts sekali, filter di JS (hindari N+1)
    const [plans, allRules, allContacts] = await Promise.all([
      prisma.marketing_plans.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, company_master_id: true } },
          creator: { select: { id: true, name: true, email: true } },
          approvers: { orderBy: { step_number: 'asc' } },
          items: { select: { period_month: true } },
          approval_history: {
            include: {
              approver: { select: { id: true, name: true, email: true } },
              magic_links: true
            },
            orderBy: [{ step_number: 'asc' }, { created_at: 'desc' }, { id: 'desc' }]
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.approval_rules.findMany({
        where: { module: 'MARKETING_PLAN' },
        orderBy: { step_number: 'asc' }
      }),
      prisma.approval_role_contacts.findMany({ orderBy: { company_master_id: 'desc' } })
    ]);

    const now = new Date();
    const mapLinks = record => (record?.magic_links || []).map(ml => ({
      email: ml.recipient_email,
      expires_at: ml.expires_at,
      used_at: ml.used_at,
      expired: !ml.used_at && new Date(ml.expires_at) < now
    }));

    const results = [];
    for (const plan of plans) {
      const totalBudget = parseFloat(plan.total_budget || 0);
      // Latest record per step — a plan that was rejected and resubmitted keeps its
      // older rows; only the newest round reflects the current state.
      const latestByStep = {};
      for (const h of plan.approval_history) {
        if (!latestByStep[h.step_number]) latestByStep[h.step_number] = h;
      }

      const steps = [];
      if (plan.approvers.length > 0) {
        // Named approver chain chosen at submission — this is what the approval
        // engine actually follows (see executeApprovalDecision).
        for (const a of plan.approvers) {
          const record = latestByStep[a.step_number];
          steps.push({
            step_number: a.step_number,
            role: a.approver_role || null,
            status: a.status === 'WAITING' ? 'WAITING' : a.status,
            approver_name: a.approver_name,
            approver_email: a.approver_email,
            action_at: a.action_at || null,
            comment: a.comment || null,
            pending_since: a.status === 'PENDING' ? (record?.created_at || null) : null,
            recipients: [a.approver_email],
            magic_links: mapLinks(record)
          });
        }
      } else {
        // Legacy plans without a named chain: steps follow the approval tier.
        const matchedRules = allRules.filter(r => {
          const amountOk = parseFloat(r.min_amount) <= totalBudget &&
            (r.max_amount === null || parseFloat(r.max_amount) >= totalBudget);
          const companyOk = r.company_id === null || r.company_id === plan.company_id;
          return amountOk && companyOk;
        });
        const stepRulesMap = {};
        for (const rule of matchedRules) {
          if (!stepRulesMap[rule.step_number] || rule.company_id !== null) stepRulesMap[rule.step_number] = rule;
        }
        for (const rule of Object.values(stepRulesMap).sort((a, b) => a.step_number - b.step_number)) {
          const record = latestByStep[rule.step_number];
          const resolvedContact = resolveContactPreview(allContacts, rule.approver_role, plan.company_id, plan.company.company_master_id);
          const status = record ? record.status : 'WAITING';
          steps.push({
            step_number: rule.step_number,
            role: rule.approver_role,
            status,
            approver_name: status === 'PENDING' ? null : record?.approver?.name || null,
            approver_email: resolvedContact?.email || null,
            action_at: record?.action_at || null,
            comment: record?.comment || null,
            pending_since: status === 'PENDING' ? record.created_at : null,
            recipients: resolvedContact ? [resolvedContact.email] : [],
            magic_links: mapLinks(record)
          });
        }
      }

      const activeStep = steps.find(s => s.status === 'PENDING') || null;
      results.push({
        id: plan.id,
        title: plan.title,
        company_id: plan.company_id,
        company_name: plan.company.name,
        fiscal_year: plan.fiscal_year,
        total_budget: totalBudget,
        status: plan.status,
        is_over_budget: plan.is_over_budget,
        over_budget_reason: plan.over_budget_reason,
        is_late_submission: plan.is_late_submission,
        late_submission_reason: plan.late_submission_reason,
        creator_name: plan.creator?.name || 'Tidak diketahui',
        created_at: plan.created_at,
        submitted_at: plan.submitted_at || null,
        chain_source: plan.approvers.length > 0 ? 'NAMED' : 'TIER',
        // Campaign months covered by the plan items (1-12), used for month/quarter filters.
        months: [...new Set(plan.items.map(i => i.period_month))].sort((a, b) => a - b),
        current_active_step: activeStep?.step_number || null,
        waiting_on: activeStep ? { name: activeStep.approver_name, email: activeStep.approver_email, role: activeStep.role, since: activeStep.pending_since } : null,
        steps
      });
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingTasks,
  processApproval,
  getApprovalHistory,
  getMagicLinkDetail,
  processMagicLink,
  getApprovalsOverview
};
