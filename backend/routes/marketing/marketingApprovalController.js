const crypto = require('crypto');
const { linkRecipient, logLinkDecision } = require('../../api/magicLinkGuard');
const prisma = require('../../api/db');
const { rolesOf, hasRole } = require('../../api/roles');
const { tierStepsFor } = require('./marketingTiers');

// Login roles used for in-app approval matching. The login role marketing_manager shares its name
// with the approval role MARKETING_MANAGER, but that approval step belongs to the designated
// recipient (by email), so it is not granted through the login role.
const approvalRoles = req => rolesOf(req).map(r => r.toUpperCase()).filter(r => r !== 'MARKETING_MANAGER');
const {
  resolveEmployee,
  executeApprovalDecision,
  getDocContextForTask,
  dispatchMagicLinkEmails,
  dispatchPaymentStatusEmail,
  dispatchPlanStatusEmail,
  applyCompanyScope,
  MAGIC_LINK_EXPIRY_DAYS
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

// Admin overrides are exceptional actions: retain a separate audit record in addition
// to the approval history so an auditor can distinguish them from the assigned approver.
async function logAdminOverride(req, task, action, reason) {
  try {
    const actorId = Number(req.user?.id);
    const actor = actorId ? await prisma.m_user.findUnique({ where: { id: actorId }, select: { id: true } }) : null;
    await prisma.audit_log.create({
      data: {
        table_name: 'marketing_approval',
        record_id: task.id,
        action: 'OVERRIDE',
        user_id: actor?.id || null,
        old_data: { approval_history_id: task.id, status: task.status, step_number: task.step_number },
        new_data: {
          action,
          reason,
          marketing_plan_id: task.marketing_plan_id,
          payment_request_id: task.payment_request_id,
          actor_email: req.user?.email || null
        }
      }
    });
  } catch (err) {
    console.error('[marketing approval] failed to record admin override:', err.message);
  }
}

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
// Tier step for a task, taken from the tier set of the document's company (company → holding → general).
function tierRuleFor(task, rules) {
  const isPlan = !!task.marketing_plan_id;
  const company = isPlan ? task.marketing_plan?.company : task.payment_request?.marketing_plan_item?.marketing_plan?.company;
  const scope = { companyId: taskCompanyId(task), companyMasterId: company?.company_master_id ?? null, module: isPlan ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST' };
  return tierStepsFor(rules, scope, taskAmount(task)).find(r => r.step_number === task.step_number) || null;
}

// `roles` = all of the user's roles in upper case (primary + extra).
function canActOnTask(task, { roles, email }, rules) {
  if (task.payment_request?.request_type === 'CLAIM') return roles.includes('FINANCE') && task.step_number === 1;
  if (roles.includes('ADMIN')) return true;

  const isPlan = !!task.marketing_plan_id;
  const chainStep = isPlan ? (task.marketing_plan?.approvers || []).find(a => a.step_number === task.step_number) : null;
  if (chainStep) return normalizeEmail(chainStep.approver_email) === normalizeEmail(email);

  const rule = tierRuleFor(task, rules);
  if (rule) return roles.includes(rule.approver_role);
  const isOverbudgetEscalation = !isPlan && task.payment_request?.status === 'OVERBUDGET_WARN';
  return isOverbudgetEscalation && roles.includes('CFO_CEO');
}

// Who the task is waiting for, for display.
function waitingFor(task, rules) {
  const chainStep = (task.marketing_plan?.approvers || []).find(a => a.step_number === task.step_number);
  if (chainStep) return { name: chainStep.approver_name, email: chainStep.approver_email, role: chainStep.approver_role || null };
  if (task.payment_request?.request_type === 'CLAIM') return { name: null, email: null, role: 'FINANCE' };
  const rule = tierRuleFor(task, rules);
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

    const actor = { roles: approvalRoles(req), email: req.user.email };
    const pendingTasks = await prisma.approval_history.findMany({ where: { status: 'PENDING' }, include: TASK_INCLUDE, orderBy: { created_at: 'asc' } });
    // Claims are Finance-only and never consult the approval tiers.
    const rules = pendingTasks.some(t => t.payment_request?.request_type !== 'CLAIM') ? await prisma.approval_rules.findMany() : [];

    const tasks = pendingTasks
      .filter(task => (task.marketing_plan || task.payment_request) && (actor.roles.includes('ADMIN') || inScope(req, taskCompanyId(task)) || isDesignated(task, actor)))
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
    const { action, comment, signature, admin_override: adminOverrideRequested } = req.body;

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

    const actor = { roles: approvalRoles(req), email: req.user.email };
    const isAdminOverride = Boolean(adminOverrideRequested);
    if (isAdminOverride && !actor.roles.includes('ADMIN')) {
      return res.status(403).json({ error: 'Only an administrator can override an approval step.' });
    }
    if (isAdminOverride && !task.marketing_plan_id) {
      return res.status(400).json({ error: 'Admin override from Approval Control is limited to marketing plan approval steps.' });
    }
    if (isAdminOverride && (typeof comment !== 'string' || comment.trim().length < 8)) {
      return res.status(400).json({ error: 'Enter an override reason of at least 8 characters.' });
    }
    if (!actor.roles.includes('ADMIN') && !inScope(req, taskCompanyId(task)) && !isDesignated(task, actor)) {
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
      comment: isAdminOverride ? `[ADMIN OVERRIDE] ${comment.trim()}` : (typeof comment === 'string' ? comment.trim() || null : null),
      signature,
      actingApproverId: employee.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }
    await dispatchPaymentStatusEmail(result, task);
    await dispatchPlanStatusEmail(result, task, comment);

    if (isAdminOverride) await logAdminOverride(req, task, action, comment.trim());

    res.json({ ...result, admin_override: isAdminOverride });
  } catch (err) {
    next(err);
  }
}

// GET /history — decisions made by the current user; admins see every decision
// in their company scope. Limited to the latest 300.
async function getApprovalHistory(req, res, next) {
  try {
    const isAdminUser = hasRole(req, 'admin');
    const employee = await resolveEmployee(req.user.email);
    if (!isAdminUser && !employee) return res.json([]);

    const records = await prisma.approval_history.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] }, ...(isAdminUser ? {} : { approver_id: employee.id }) },
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
      .filter(r => (r.marketing_plan || r.payment_request) && (isAdminUser ? inScope(req, taskCompanyId(r)) : true))
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
                company: { select: { name: true } },
                creator: { select: { name: true, position: true } },
                approvers: { orderBy: { step_number: 'asc' } },
                items: {
                  orderBy: [{ period_month: 'asc' }, { id: 'asc' }],
                  include: {
                    m_coa: { select: { code: true, name: true } },
                    m_brand: { select: { name: true } },
                    m_line_business: { select: { name: true } },
                    m_branch: { select: { name: true } },
                    m_event_location: { select: { name: true } },
                    vendors: { select: { vendor_name: true } }
                  }
                }
              }
            },
            payment_request: {
              include: {
                creator: { select: { name: true, position: true } },
                marketing_plan_item: {
                  include: {
                    m_coa: { select: { code: true, name: true } },
                    vendors: { select: { vendor_name: true } },
                    marketing_plan: { select: { id: true, title: true, fiscal_year: true, company: { select: { name: true } } } }
                  }
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
    const task = link.approval_history;
    if (task.status !== 'PENDING') {
      return res.status(410).json({ error: 'Approval ini sudah diproses melalui jalur lain.' });
    }

    // Public endpoint: send only what the approval page shows (no vendor bank data,
    // no internal ids beyond the document number).
    const plan = task.marketing_plan;
    const pr = task.payment_request;
    let doc;
    let chain;
    if (plan) {
      doc = {
        kind: 'PLAN',
        id: plan.id,
        title: plan.title,
        company: plan.company?.name || null,
        requester: plan.creator ? { name: plan.creator.name, position: plan.creator.position } : null,
        amount: Number(plan.total_budget || 0),
        fiscal_year: plan.fiscal_year,
        description: plan.description,
        event_start_date: plan.event_start_date,
        event_end_date: plan.event_end_date,
        doc_url: plan.doc_url,
        late_reason: plan.is_late_submission ? (plan.late_submission_reason || '-') : null,
        submitted_at: task.created_at,
        items: plan.items.map(item => ({
          month: item.period_month,
          coa: item.m_coa ? `${item.m_coa.code} - ${item.m_coa.name}` : null,
          brand: item.m_brand?.name || null,
          lob: item.m_line_business?.name || null,
          branch: item.m_branch?.name || null,
          location: item.m_event_location?.name || null,
          vendor: item.vendors?.vendor_name || null,
          description: item.description,
          budget: Number(item.budget_amount || 0)
        }))
      };
      chain = plan.approvers.length
        ? plan.approvers.map(a => ({ step: a.step_number, name: a.approver_name, role: a.approver_role, status: a.status, action_at: a.action_at, comment: a.comment }))
        : null;
    } else {
      const item = pr.marketing_plan_item;
      const budget = Number(item?.budget_amount || 0);
      const realized = Number(item?.actual_amount || 0);
      doc = {
        kind: pr.request_type === 'CLAIM' ? 'CLAIM' : 'PAYMENT',
        id: pr.id,
        title: pr.title,
        company: item?.marketing_plan?.company?.name || null,
        requester: pr.creator ? { name: pr.creator.name, position: pr.creator.position } : null,
        amount: Number(pr.amount || 0),
        fiscal_year: item?.marketing_plan?.fiscal_year || null,
        plan_title: item?.marketing_plan?.title || null,
        coa: item?.m_coa ? `${item.m_coa.code} - ${item.m_coa.name}` : null,
        month: item?.period_month || null,
        vendor: pr.expense_vendor || item?.vendors?.vendor_name || null,
        payee: pr.reimbursement_payee || null,
        expense_date: pr.expense_date,
        notes: pr.notes,
        doc_url: pr.doc_url,
        overbudget: pr.status === 'OVERBUDGET_WARN',
        submitted_at: pr.created_at,
        budget: item ? { budget, realized, remaining: budget - realized } : null
      };
      chain = null;
    }
    if (!chain) {
      const steps = await prisma.approval_history.findMany({
        where: plan ? { marketing_plan_id: plan.id } : { payment_request_id: pr.id },
        orderBy: [{ step_number: 'asc' }, { created_at: 'desc' }],
        include: { approver: { select: { name: true, position: true } } }
      });
      // Latest record per step (a step can be re-opened after a rejection cycle).
      const latest = new Map();
      for (const h of steps) if (!latest.has(h.step_number)) latest.set(h.step_number, h);
      chain = [...latest.values()].map(h => ({ step: h.step_number, name: h.approver?.name || null, role: h.approver?.position || null, status: h.status, action_at: h.action_at, comment: h.comment }));
    }

    res.json({
      recipientEmail: link.recipient_email,
      expiresAt: link.expires_at,
      step: task.step_number,
      doc,
      chain
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
    const note = typeof comment === 'string' ? comment.trim() : '';
    if (action === 'REJECT' && !note) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
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

    const verifiedEmail = await linkRecipient('MKT', req.params.token);

    const approverEmployee = await resolveEmployee(link.recipient_email);
    const actingApproverId = approverEmployee ? approverEmployee.id : task.approver_id;

    const { result, magicLinkQueue } = await executeApprovalDecision({
      task,
      action,
      comment: note || null,
      signature,
      actingApproverId,
      consumeMagicLinkId: link.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }
    await dispatchPaymentStatusEmail(result, task);
    await dispatchPlanStatusEmail(result, task, note || null);
    await logLinkDecision('MKT', task.id, action, req, verifiedEmail);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /approvals/:historyId/resend-link — new approval link for a pending step (old links stop
// working), e-mailed to the same recipient.
async function resendApprovalLink(req, res, next) {
  try {
    const historyId = parseInt(req.params.historyId, 10);
    const task = Number.isInteger(historyId) ? await prisma.approval_history.findUnique({
      where: { id: historyId },
      include: {
        marketing_plan: { select: { company_id: true } },
        payment_request: { select: { request_type: true, marketing_plan_item: { select: { marketing_plan: { select: { company_id: true } } } } } },
        magic_links: { orderBy: { created_at: 'desc' }, take: 1 }
      }
    }) : null;
    const companyId = task?.marketing_plan?.company_id ?? task?.payment_request?.marketing_plan_item?.marketing_plan?.company_id;
    if (!task || (req.companyScope && !req.companyScope.all && !req.companyScope.companyIds.includes(companyId))) {
      return res.status(404).json({ error: 'Approval step not found.' });
    }
    if (task.status !== 'PENDING') return res.status(400).json({ error: 'Only a step waiting for approval can get a new link.' });
    const last = task.magic_links[0];
    if (!last) return res.status(400).json({ error: 'This step is decided in the app, not by e-mail link.' });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.$transaction([
      prisma.approval_magic_links.updateMany({ where: { approval_history_id: historyId, used_at: null }, data: { expires_at: new Date() } }),
      prisma.approval_magic_links.create({
        data: { token, approval_history_id: historyId, recipient_email: last.recipient_email, expires_at: new Date(Date.now() + MAGIC_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000) }
      })
    ]);
    await dispatchMagicLinkEmails([{ email: last.recipient_email, role: 'APPROVER', token, stepNumber: task.step_number }], await getDocContextForTask(task));
    res.json({ message: `A new approval link was sent to ${last.recipient_email}.`, sent_to: last.recipient_email });
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
            approval_history_id: record?.id || null,
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
        const tierSteps = tierStepsFor(allRules, { companyId: plan.company_id, companyMasterId: plan.company.company_master_id ?? null, module: 'MARKETING_PLAN' }, totalBudget);
        for (const rule of tierSteps) {
          const record = latestByStep[rule.step_number];
          const resolvedContact = resolveContactPreview(allContacts, rule.approver_role, plan.company_id, plan.company.company_master_id);
          const status = record ? record.status : 'WAITING';
          steps.push({
            approval_history_id: record?.id || null,
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
  resendApprovalLink,
  getPendingTasks,
  processApproval,
  getApprovalHistory,
  getMagicLinkDetail,
  processMagicLink,
  getApprovalsOverview
};
