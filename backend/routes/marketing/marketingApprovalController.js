const prisma = require('../../api/db');
const {
  resolveEmployee,
  executeApprovalDecision,
  getDocContextForTask,
  dispatchMagicLinkEmails
} = require('./marketingHelper');

// GET /tasks
async function getPendingTasks(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const userRole = req.user.role.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

    const pendingTasks = await prisma.approval_history.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        marketing_plan: {
          include: { company: true, creator: true }
        },
        payment_request: {
          include: {
            marketing_plan_item: {
              include: { marketing_plan: { include: { company: true } } }
            },
            creator: true
          }
        }
      }
    });

    if (isAdmin) {
      return res.json(pendingTasks);
    }

    const tasks = [];
    for (const t of pendingTasks) {
      const isPlan = !!t.marketing_plan_id;
      const amt = isPlan ? parseFloat(t.marketing_plan.total_budget) : parseFloat(t.payment_request.amount);
      const mod = isPlan ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';

      const rule = await prisma.approval_rules.findFirst({
        where: {
          module: mod,
          step_number: t.step_number,
          min_amount: { lte: amt },
          OR: [
            { max_amount: { gte: amt } },
            { max_amount: null }
          ]
        }
      });

      if (rule && rule.approver_role === userRole) {
        tasks.push(t);
      } else if (!rule && t.step_number > 1 && userRole === 'CFO_CEO') {
        tasks.push(t);
      }
    }

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
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const { id } = req.params;
    const { action, comment, signature } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }

    const task = await prisma.approval_history.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        marketing_plan: { include: { company: true } },
        payment_request: { include: { marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } } } }
      }
    });

    if (!task || task.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval task not found.' });
    }

    const userRole = req.user.role.toUpperCase();
    if (userRole !== 'ADMIN') {
      const isPlanAuth = !!task.marketing_plan_id;
      const amtAuth = isPlanAuth ? parseFloat(task.marketing_plan.total_budget) : parseFloat(task.payment_request.amount);
      const modAuth = isPlanAuth ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';

      const authRule = await prisma.approval_rules.findFirst({
        where: {
          module: modAuth,
          step_number: task.step_number,
          min_amount: { lte: amtAuth },
          OR: [
            { max_amount: { gte: amtAuth } },
            { max_amount: null }
          ]
        }
      });

      const isOverbudgetEscalation = !isPlanAuth && task.payment_request.status === 'OVERBUDGET_WARN' && !authRule && task.step_number > 1;
      const authorized = (authRule && authRule.approver_role === userRole) || (isOverbudgetEscalation && userRole === 'CFO_CEO');

      if (!authorized) {
        return res.status(403).json({ error: 'Anda tidak memiliki kewenangan untuk menyetujui tahap approval ini.' });
      }
    }

    const { result, magicLinkQueue } = await executeApprovalDecision({
      task,
      action,
      comment,
      signature,
      actingApproverId: employee.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /history
async function getApprovalHistory(req, res, next) {
  try {
    const records = await prisma.approval_history.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      include: {
        marketing_plan: { include: { company: true, creator: true } },
        payment_request: {
          include: {
            marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } },
            creator: true
          }
        }
      },
      orderBy: [{ action_at: 'desc' }, { created_at: 'desc' }],
      take: 100
    });

    const history = records.map(r => {
      const isPlan = !!r.marketing_plan_id;
      return {
        id: r.id,
        type: isPlan ? 'Marketing Plan' : 'Payment Request',
        title: isPlan ? r.marketing_plan.title : r.payment_request.title,
        creatorName: isPlan ? r.marketing_plan.creator?.name : r.payment_request.creator?.name,
        companyName: isPlan ? r.marketing_plan.company?.name : r.payment_request.marketing_plan_item?.marketing_plan?.company?.name,
        amount: isPlan ? r.marketing_plan.total_budget : r.payment_request.amount,
        action: r.status,
        comment: r.comment,
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
    if (company_id) where.company_id = parseInt(company_id, 10);
    if (fiscal_year) where.fiscal_year = parseInt(fiscal_year, 10);
    if (status) where.status = status;

    // Batch query: ambil semua rules dan contacts sekali, filter di JS (hindari N+1)
    const [plans, allRules, allContacts] = await Promise.all([
      prisma.marketing_plans.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, company_master_id: true } },
          creator: { select: { id: true, name: true, email: true } },
          approval_history: {
            include: {
              approver: { select: { id: true, name: true, email: true } },
              magic_links: true
            },
            orderBy: { step_number: 'asc' }
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

    const results = [];
    for (const plan of plans) {
      const totalBudget = parseFloat(plan.total_budget || 0);

      // Filter rules untuk plan ini di JS — fix duplicate OR key dan N+1
      const matchedRules = allRules.filter(r => {
        const amountOk = parseFloat(r.min_amount) <= totalBudget &&
          (r.max_amount === null || parseFloat(r.max_amount) >= totalBudget);
        const companyOk = r.company_id === null || r.company_id === plan.company_id;
        return amountOk && companyOk;
      });

      const stepRulesMap = {};
      for (const rule of matchedRules) {
        if (!stepRulesMap[rule.step_number] || rule.company_id !== null) {
          stepRulesMap[rule.step_number] = rule;
        }
      }
      const sortedRules = Object.values(stepRulesMap).sort((a, b) => a.step_number - b.step_number);

      const steps = [];
      let currentActiveStep = null;

      for (const rule of sortedRules) {
        const historyRecord = plan.approval_history.find(h => h.step_number === rule.step_number && h.status === 'PENDING')
          || plan.approval_history.find(h => h.step_number === rule.step_number);

        // Filter contacts di JS — hindari N+1 per rule
        const contacts = allContacts.filter(c =>
          c.role === rule.approver_role &&
          (c.company_master_id === null || c.company_master_id === plan.company.company_master_id)
        );
        const recipientEmails = contacts.map(c => c.email);

        const magicLinks = historyRecord ? historyRecord.magic_links.map(ml => ({
          email: ml.recipient_email,
          expires_at: ml.expires_at,
          used_at: ml.used_at
        })) : [];

        const stepStatus = historyRecord ? historyRecord.status : 'WAITING';

        if (stepStatus === 'PENDING' && !currentActiveStep) {
          currentActiveStep = rule.step_number;
        }

        steps.push({
          step_number: rule.step_number,
          role: rule.approver_role,
          status: stepStatus,
          approver_name: historyRecord?.approver?.name || null,
          action_at: historyRecord?.action_at || null,
          comment: historyRecord?.comment || null,
          recipients: recipientEmails,
          magic_links: magicLinks
        });
      }

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
        creator_name: plan.creator.name,
        created_at: plan.created_at,
        current_active_step: currentActiveStep,
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
