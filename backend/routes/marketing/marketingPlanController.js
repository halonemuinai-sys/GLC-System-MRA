const prisma = require('../../api/db');
const { sendMail } = require('../../api/mailer');
const { resolveEmployee, queueMagicLink, dispatchMagicLinkEmails } = require('./marketingHelper');

/**
 * Helper function to check if the proposed marketing plan items exceed the locked monthly budget.
 */
async function checkBudgetLimits(company_id, fiscal_year, items) {
  try {
    for (const item of items) {
      const brand_id = item.brand_id ? parseInt(item.brand_id, 10) : null;
      const lob_id = item.lob_id ? parseInt(item.lob_id, 10) : null;
      const month = item.period_month ? parseInt(item.period_month, 10) : null;
      const amount = parseFloat(item.budget_amount || 0);

      if (!brand_id || !lob_id || !month) continue;

      const budget = await prisma.m_marketing_budget.findUnique({
        where: {
          company_id_brand_id_lob_id_fiscal_year: {
            company_id: parseInt(company_id, 10),
            brand_id,
            lob_id,
            fiscal_year: parseInt(fiscal_year, 10)
          }
        },
        include: {
          monthly_limits: true
        }
      });

      if (budget && budget.is_locked) {
        const limitObj = budget.monthly_limits.find(ml => ml.period_month === month);
        const limit = limitObj ? parseFloat(limitObj.budget_limit || 0) : 0;

        const committedItems = await prisma.marketing_plan_items.findMany({
          where: {
            brand_id,
            lob_id,
            period_month: month,
            marketing_plan: {
              company_id: parseInt(company_id, 10),
              fiscal_year: parseInt(fiscal_year, 10),
              status: { in: ['APPROVED', 'PENDING_APPROVAL'] }
            }
          },
          select: {
            budget_amount: true
          }
        });

        const totalCommitted = committedItems.reduce((sum, ci) => sum + parseFloat(ci.budget_amount || 0), 0);
        if (totalCommitted + amount > limit) {
          return true; // Over budget detected
        }
      }
    }
  } catch (err) {
    console.error('Error in checkBudgetLimits:', err.message);
  }
  return false;
}

// POST /plans
async function createPlan(req, res, next) {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const { title, description, company_id, fiscal_year, start_date, end_date, event_start_date, event_end_date, cta_start_date, cta_end_date, items, doc_url, over_budget_reason, save_as_draft,
      target_sales, target_leads, target_reach, target_impressions, target_roi_pct, target_notes } = req.body;

    if (!title || !company_id || !fiscal_year || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title, company_id, fiscal_year, and budget items are required.' });
    }

    let totalBudget = 0;
    for (const item of items) {
      totalBudget += parseFloat(item.budget_amount || 0);
    }

    const isOverBudget = save_as_draft ? false : await checkBudgetLimits(company_id, fiscal_year, items);

    const magicLinkQueue = [];
    const newPlan = await prisma.$transaction(async (tx) => {
      const planStatus = save_as_draft ? 'DRAFT' : 'PENDING_APPROVAL';
      const plan = await tx.marketing_plans.create({
        data: {
          title,
          description,
          company_id: parseInt(company_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          event_start_date: event_start_date ? new Date(event_start_date) : (start_date ? new Date(start_date) : null),
          event_end_date: event_end_date ? new Date(event_end_date) : (end_date ? new Date(end_date) : null),
          cta_start_date: cta_start_date ? new Date(cta_start_date) : (start_date ? new Date(start_date) : null),
          cta_end_date: cta_end_date ? new Date(cta_end_date) : (end_date ? new Date(end_date) : null),
          total_budget: totalBudget,
          status: planStatus,
          creator_id: employee.id,
          doc_url,
          is_over_budget: isOverBudget,
          over_budget_reason: isOverBudget ? over_budget_reason : null,
          target_sales: target_sales ? parseFloat(target_sales) : null,
          target_leads: target_leads ? parseInt(target_leads, 10) : null,
          target_reach: target_reach ? parseInt(target_reach, 10) : null,
          target_impressions: target_impressions ? parseInt(target_impressions, 10) : null,
          target_roi_pct: target_roi_pct ? parseFloat(target_roi_pct) : null,
          target_notes: target_notes || null
        }
      });

      for (const item of items) {
        let resolvedVendorId = null;
        if (item.vendor_id) {
          const rawId = String(item.vendor_id).trim();
          if (/^\d+$/.test(rawId)) {
            resolvedVendorId = parseInt(rawId, 10);
          } else if (rawId) {
            const existingVendor = await tx.vendors.findFirst({
              where: { vendor_name: { equals: rawId, mode: 'insensitive' } }
            });
            if (existingVendor) {
              resolvedVendorId = existingVendor.id;
            } else {
              const count = await tx.vendors.count();
              const vendorCode = `VND-MKT-${1000 + count + 1}`;
              const newVendor = await tx.vendors.create({
                data: {
                  vendor_name: rawId,
                  vendor_code: vendorCode
                }
              });
              resolvedVendorId = newVendor.id;
            }
          }
        }

        await tx.marketing_plan_items.create({
          data: {
            marketing_plan_id: plan.id,
            coa_id: parseInt(item.coa_id, 10),
            brand_id: item.brand_id ? parseInt(item.brand_id, 10) : null,
            lob_id: item.lob_id ? parseInt(item.lob_id, 10) : null,
            branch_id: item.branch_id ? parseInt(item.branch_id, 10) : null,
            event_location_id: item.event_location_id ? parseInt(item.event_location_id, 10) : null,
            vendor_id: resolvedVendorId,
            period_month: parseInt(item.period_month, 10),
            budget_amount: parseFloat(item.budget_amount || 0),
            actual_amount: 0,
            description: item.description,
            qty: item.qty ? parseInt(item.qty, 10) : 1,
            unit_price: item.unit_price ? parseFloat(item.unit_price) : parseFloat(item.budget_amount || 0)
          }
        });
      }

      if (!save_as_draft) {
        const firstRules = await tx.approval_rules.findMany({
          where: {
            module: 'MARKETING_PLAN',
            min_amount: { lte: totalBudget },
            OR: [
              { max_amount: { gte: totalBudget } },
              { max_amount: null }
            ],
            step_number: 1
          }
        });

        const planCompany = await tx.m_company.findUnique({ where: { id: plan.company_id }, select: { company_master_id: true } });

        for (const rule of firstRules) {
          const history = await tx.approval_history.create({
            data: {
              marketing_plan_id: plan.id,
              approver_id: employee.id,
              step_number: rule.step_number,
              status: 'PENDING'
            }
          });
          await queueMagicLink(tx, magicLinkQueue, {
            approvalHistoryId: history.id,
            role: rule.approver_role,
            stepNumber: rule.step_number,
            companyMasterId: planCompany?.company_master_id
          });
        }
      }

      return plan;
    });

    if (!save_as_draft) {
      try {
        await sendMail({
          to: req.user.email,
          subject: `Rencana Pemasaran Diajukan: ${title}`,
          html: `<p>Halo ${employee.name},</p><p>Rencana Pemasaran <strong>${title}</strong> dengan nilai <strong>Rp ${totalBudget.toLocaleString('id-ID')}</strong> telah berhasil diajukan dan sedang menunggu persetujuan.</p>`
        });
      } catch (e) {
        console.error('Notification failed:', e.message);
      }

      if (magicLinkQueue.length > 0) {
        const company = await prisma.m_company.findUnique({ where: { id: parseInt(company_id, 10) } });
        await dispatchMagicLinkEmails(magicLinkQueue, {
          docTitle: title,
          docAmount: totalBudget,
          companyName: company?.name,
          requesterName: employee.name
        });
      }
    }

    res.status(201).json(newPlan);
  } catch (err) {
    next(err);
  }
}

// PUT /plans/:id
async function updatePlan(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User email not registered in employee database.' });

    const existingPlan = await prisma.marketing_plans.findUnique({ where: { id: planId } });
    if (!existingPlan) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (existingPlan.status !== 'DRAFT') return res.status(400).json({ error: 'Hanya rencana berstatus DRAFT yang dapat diperbarui melalui endpoint ini.' });

    const { title, description, company_id, fiscal_year, start_date, end_date, event_start_date, event_end_date, cta_start_date, cta_end_date, items, doc_url, over_budget_reason,
      target_sales, target_leads, target_reach, target_impressions, target_roi_pct, target_notes } = req.body;

    if (!title || !company_id || !fiscal_year || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title, company_id, fiscal_year, and budget items are required.' });
    }

    let totalBudget = 0;
    for (const item of items) totalBudget += parseFloat(item.budget_amount || 0);

    const updatedPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.marketing_plans.update({
        where: { id: planId },
        data: {
          title, description,
          company_id: parseInt(company_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          event_start_date: event_start_date ? new Date(event_start_date) : (start_date ? new Date(start_date) : null),
          event_end_date: event_end_date ? new Date(event_end_date) : (end_date ? new Date(end_date) : null),
          cta_start_date: cta_start_date ? new Date(cta_start_date) : (start_date ? new Date(start_date) : null),
          cta_end_date: cta_end_date ? new Date(cta_end_date) : (end_date ? new Date(end_date) : null),
          total_budget: totalBudget,
          doc_url, over_budget_reason: over_budget_reason || null,
          target_sales: target_sales ? parseFloat(target_sales) : null,
          target_leads: target_leads ? parseInt(target_leads, 10) : null,
          target_reach: target_reach ? parseInt(target_reach, 10) : null,
          target_impressions: target_impressions ? parseInt(target_impressions, 10) : null,
          target_roi_pct: target_roi_pct ? parseFloat(target_roi_pct) : null,
          target_notes: target_notes || null,
          updated_at: new Date()
        }
      });

      await tx.marketing_plan_items.deleteMany({ where: { marketing_plan_id: planId } });
      for (const item of items) {
        let resolvedVendorId = null;
        if (item.vendor_id) {
          const rawId = String(item.vendor_id).trim();
          if (/^\d+$/.test(rawId)) {
            resolvedVendorId = parseInt(rawId, 10);
          } else if (rawId) {
            const existing = await tx.vendors.findFirst({ where: { vendor_name: { equals: rawId, mode: 'insensitive' } } });
            if (existing) { resolvedVendorId = existing.id; }
            else {
              const count = await tx.vendors.count();
              const newV = await tx.vendors.create({ data: { vendor_name: rawId, vendor_code: `VND-MKT-${1000 + count + 1}` } });
              resolvedVendorId = newV.id;
            }
          }
        }
        await tx.marketing_plan_items.create({
          data: {
            marketing_plan_id: planId,
            coa_id: parseInt(item.coa_id, 10),
            brand_id: item.brand_id ? parseInt(item.brand_id, 10) : null,
            lob_id: item.lob_id ? parseInt(item.lob_id, 10) : null,
            branch_id: item.branch_id ? parseInt(item.branch_id, 10) : null,
            event_location_id: item.event_location_id ? parseInt(item.event_location_id, 10) : null,
            vendor_id: resolvedVendorId,
            period_month: parseInt(item.period_month, 10),
            budget_amount: parseFloat(item.budget_amount || 0),
            actual_amount: 0,
            description: item.description,
            qty: item.qty ? parseInt(item.qty, 10) : 1,
            unit_price: item.unit_price ? parseFloat(item.unit_price) : parseFloat(item.budget_amount || 0)
          }
        });
      }
      return plan;
    });

    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
}

// POST /plans/:id/submit
async function submitPlan(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User email not registered in employee database.' });

    const existingPlan = await prisma.marketing_plans.findUnique({
      where: { id: planId },
      include: { company: true, items: true }
    });
    if (!existingPlan) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (existingPlan.status !== 'DRAFT') return res.status(400).json({ error: 'Hanya rencana berstatus DRAFT yang dapat diajukan.' });

    const totalBudget = parseFloat(existingPlan.total_budget);
    const isOverBudget = await checkBudgetLimits(existingPlan.company_id, existingPlan.fiscal_year, existingPlan.items);

    const magicLinkQueue = [];
    await prisma.$transaction(async (tx) => {
      // Guard: invalidate any leftover PENDING histories (e.g. from aborted previous submissions)
      await tx.approval_history.updateMany({
        where: { marketing_plan_id: planId, status: 'PENDING' },
        data: { status: 'REJECTED', comment: '[SISTEM] Digantikan oleh pengajuan baru.', action_at: new Date() }
      });

      await tx.marketing_plans.update({
        where: { id: planId },
        data: { status: 'PENDING_APPROVAL', is_over_budget: isOverBudget, updated_at: new Date() }
      });

      const firstRules = await tx.approval_rules.findMany({
        where: {
          module: 'MARKETING_PLAN',
          min_amount: { lte: totalBudget },
          OR: [{ max_amount: { gte: totalBudget } }, { max_amount: null }],
          step_number: 1
        }
      });
      const planCompany = await tx.m_company.findUnique({ where: { id: existingPlan.company_id }, select: { company_master_id: true } });
      for (const rule of firstRules) {
        const history = await tx.approval_history.create({
          data: { marketing_plan_id: planId, approver_id: employee.id, step_number: rule.step_number, status: 'PENDING' }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: history.id, role: rule.approver_role, stepNumber: rule.step_number,
          companyMasterId: planCompany?.company_master_id
        });
      }
    });

    try {
      await sendMail({
        to: req.user.email,
        subject: `Rencana Pemasaran Diajukan: ${existingPlan.title}`,
        html: `<p>Halo ${employee.name},</p><p>Rencana Pemasaran <strong>${existingPlan.title}</strong> berhasil diajukan dan sedang menunggu persetujuan.</p>`
      });
    } catch (e) { console.error('Notification failed:', e.message); }

    if (magicLinkQueue.length > 0) {
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: existingPlan.title, docAmount: totalBudget,
        companyName: existingPlan.company?.name, requesterName: employee.name
      });
    }

    res.json({ message: 'Rencana Pemasaran berhasil diajukan ke rantai approval.', id: planId });
  } catch (err) {
    next(err);
  }
}

// POST /plans/:id/recall
async function recallPlan(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User email not registered in employee database.' });

    const existingPlan = await prisma.marketing_plans.findUnique({
      where: { id: planId },
      include: { approval_history: true }
    });
    if (!existingPlan) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (existingPlan.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Hanya rencana berstatus PENDING_APPROVAL yang dapat ditarik kembali.' });

    const hasApprovedStep = existingPlan.approval_history.some(h => h.status === 'APPROVED');
    if (hasApprovedStep) return res.status(400).json({ error: 'Rencana tidak dapat ditarik kembali karena sudah ada step approval yang disetujui.' });

    const userRole = (req.user.role || '').toUpperCase();
    if (userRole !== 'ADMIN' && existingPlan.creator_id !== employee.id) {
      return res.status(403).json({ error: 'Anda hanya dapat menarik kembali rencana yang Anda buat sendiri.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.approval_history.updateMany({
        where: { marketing_plan_id: planId, status: 'PENDING' },
        data: { status: 'REJECTED', comment: '[SISTEM] Ditarik kembali oleh pembuat rencana.', action_at: new Date() }
      });
      await tx.marketing_plans.update({ where: { id: planId }, data: { status: 'DRAFT', updated_at: new Date() } });
    });

    res.json({ message: 'Rencana berhasil ditarik kembali ke status DRAFT.', id: planId });
  } catch (err) {
    next(err);
  }
}

// PUT /plans/:id/actuals
async function updatePlanActuals(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User email not registered in employee database.' });

    const existingPlan = await prisma.marketing_plans.findUnique({ where: { id: planId } });
    if (!existingPlan) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (existingPlan.status !== 'APPROVED') return res.status(400).json({ error: 'Data aktual hanya dapat diinput pada rencana berstatus APPROVED.' });

    const { actual_sales, actual_leads, actual_reach, actual_impressions, actual_roi_pct, actual_notes } = req.body;

    const updated = await prisma.marketing_plans.update({
      where: { id: planId },
      data: {
        actual_sales: actual_sales !== undefined && actual_sales !== null && actual_sales !== '' ? parseFloat(actual_sales) : null,
        actual_leads: actual_leads !== undefined && actual_leads !== null && actual_leads !== '' ? parseInt(actual_leads, 10) : null,
        actual_reach: actual_reach !== undefined && actual_reach !== null && actual_reach !== '' ? parseInt(actual_reach, 10) : null,
        actual_impressions: actual_impressions !== undefined && actual_impressions !== null && actual_impressions !== '' ? parseInt(actual_impressions, 10) : null,
        actual_roi_pct: actual_roi_pct !== undefined && actual_roi_pct !== null && actual_roi_pct !== '' ? parseFloat(actual_roi_pct) : null,
        actual_notes: actual_notes || null,
        actuals_filled_at: new Date(),
        actuals_filled_by: employee.id,
        updated_at: new Date()
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /plans/:id/revise
async function revisePlan(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const existingPlan = await prisma.marketing_plans.findUnique({ where: { id: planId } });
    if (!existingPlan) {
      return res.status(404).json({ error: 'Marketing Plan not found.' });
    }
    if (existingPlan.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Hanya rencana yang berstatus REJECTED yang bisa direvisi.' });
    }

    const { title, description, company_id, fiscal_year, start_date, end_date, event_start_date, event_end_date, cta_start_date, cta_end_date, items, doc_url, over_budget_reason,
      target_sales, target_leads, target_reach, target_impressions, target_roi_pct, target_notes } = req.body;

    if (!title || !company_id || !fiscal_year || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title, company_id, fiscal_year, and budget items are required.' });
    }

    let totalBudget = 0;
    for (const item of items) {
      totalBudget += parseFloat(item.budget_amount || 0);
    }

    const isOverBudget = await checkBudgetLimits(company_id, fiscal_year, items);

    const magicLinkQueue = [];
    const updatedPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.marketing_plans.update({
        where: { id: planId },
        data: {
          title,
          description,
          company_id: parseInt(company_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          event_start_date: event_start_date ? new Date(event_start_date) : (start_date ? new Date(start_date) : null),
          event_end_date: event_end_date ? new Date(event_end_date) : (end_date ? new Date(end_date) : null),
          cta_start_date: cta_start_date ? new Date(cta_start_date) : (start_date ? new Date(start_date) : null),
          cta_end_date: cta_end_date ? new Date(cta_end_date) : (end_date ? new Date(end_date) : null),
          total_budget: totalBudget,
          status: 'PENDING_APPROVAL',
          doc_url,
          is_over_budget: isOverBudget,
          over_budget_reason: isOverBudget ? over_budget_reason : null,
          target_sales: target_sales ? parseFloat(target_sales) : null,
          target_leads: target_leads ? parseInt(target_leads, 10) : null,
          target_reach: target_reach ? parseInt(target_reach, 10) : null,
          target_impressions: target_impressions ? parseInt(target_impressions, 10) : null,
          target_roi_pct: target_roi_pct ? parseFloat(target_roi_pct) : null,
          target_notes: target_notes || null,
          updated_at: new Date()
        }
      });

      await tx.marketing_plan_items.deleteMany({ where: { marketing_plan_id: planId } });
      // Soft-delete: preserve rejection reason di history lama sebagai audit trail
      await tx.approval_history.updateMany({
        where: { marketing_plan_id: planId, status: 'PENDING' },
        data: { status: 'REJECTED', comment: '[SISTEM] Digantikan oleh revisi rencana.', action_at: new Date() }
      });

      for (const item of items) {
        let resolvedVendorId = null;
        if (item.vendor_id) {
          const rawId = String(item.vendor_id).trim();
          if (/^\d+$/.test(rawId)) {
            resolvedVendorId = parseInt(rawId, 10);
          } else if (rawId) {
            const existingVendor = await tx.vendors.findFirst({
              where: { vendor_name: { equals: rawId, mode: 'insensitive' } }
            });
            if (existingVendor) {
              resolvedVendorId = existingVendor.id;
            } else {
              const count = await tx.vendors.count();
              const vendorCode = `VND-MKT-${1000 + count + 1}`;
              const newVendor = await tx.vendors.create({
                data: { vendor_name: rawId, vendor_code: vendorCode }
              });
              resolvedVendorId = newVendor.id;
            }
          }
        }

        await tx.marketing_plan_items.create({
          data: {
            marketing_plan_id: planId,
            coa_id: parseInt(item.coa_id, 10),
            brand_id: item.brand_id ? parseInt(item.brand_id, 10) : null,
            lob_id: item.lob_id ? parseInt(item.lob_id, 10) : null,
            branch_id: item.branch_id ? parseInt(item.branch_id, 10) : null,
            event_location_id: item.event_location_id ? parseInt(item.event_location_id, 10) : null,
            vendor_id: resolvedVendorId,
            period_month: parseInt(item.period_month, 10),
            budget_amount: parseFloat(item.budget_amount || 0),
            actual_amount: 0,
            description: item.description,
            qty: item.qty ? parseInt(item.qty, 10) : 1,
            unit_price: item.unit_price ? parseFloat(item.unit_price) : parseFloat(item.budget_amount || 0)
          }
        });
      }

      const firstRules = await tx.approval_rules.findMany({
        where: {
          module: 'MARKETING_PLAN',
          min_amount: { lte: totalBudget },
          OR: [{ max_amount: { gte: totalBudget } }, { max_amount: null }],
          step_number: 1
        }
      });
      const planCompany = await tx.m_company.findUnique({ where: { id: parseInt(company_id, 10) }, select: { company_master_id: true } });
      for (const rule of firstRules) {
        const history = await tx.approval_history.create({
          data: { marketing_plan_id: planId, approver_id: employee.id, step_number: rule.step_number, status: 'PENDING' }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: history.id, role: rule.approver_role, stepNumber: rule.step_number,
          companyMasterId: planCompany?.company_master_id
        });
      }

      return plan;
    });

    try {
      await sendMail({
        to: req.user.email,
        subject: `[REVISI] Rencana Pemasaran "${title}" telah diajukan ulang`,
        html: `<p>Halo ${employee.name},</p><p>Revisi Rencana Pemasaran <strong>${title}</strong> (ID: ${planId}) dengan nilai <strong>Rp ${totalBudget.toLocaleString('id-ID')}</strong> telah berhasil diajukan ulang dan sedang menunggu persetujuan.</p>`
      });
    } catch (e) {
      console.error('Notification failed:', e.message);
    }

    if (magicLinkQueue.length > 0) {
      const company = await prisma.m_company.findUnique({ where: { id: parseInt(company_id, 10) } });
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: title,
        docAmount: totalBudget,
        companyName: company?.name,
        requesterName: employee.name
      });
    }

    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
}

// GET /plans — server-side pagination + search + summary
async function getPlans(req, res, next) {
  try {
    const { company_id, fiscal_year, status, search, page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const filters = {};
    if (company_id) filters.company_id = parseInt(company_id, 10);
    if (fiscal_year) filters.fiscal_year = parseInt(fiscal_year, 10);
    if (status) filters.status = status;
    if (search) {
      filters.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { creator: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [plans, total, summaryRaw, allRules] = await Promise.all([
      prisma.marketing_plans.findMany({
        where: filters,
        include: {
          company: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          approval_history: {
            where: { status: 'PENDING' },
            orderBy: { step_number: 'asc' },
            take: 1
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.marketing_plans.count({ where: filters }),
      // Summary selalu dihitung dari SEMUA filter (tanpa pagination) untuk KPI cards
      prisma.marketing_plans.groupBy({
        by: ['status'],
        where: { ...(company_id ? { company_id: parseInt(company_id, 10) } : {}), ...(fiscal_year ? { fiscal_year: parseInt(fiscal_year, 10) } : {}) },
        _sum: { total_budget: true },
        _count: { _all: true }
      }),
      prisma.approval_rules.findMany({ where: { module: 'MARKETING_PLAN' } })
    ]);

    const summary = { totalBudget: 0, approved: 0, pending: 0, draft: 0, rejected: 0, total: 0 };
    summaryRaw.forEach(g => {
      summary.total += g._count._all;
      summary.totalBudget += Number(g._sum.total_budget || 0);
      if (g.status === 'APPROVED') summary.approved = g._count._all;
      else if (g.status === 'PENDING_APPROVAL') summary.pending = g._count._all;
      else if (g.status === 'DRAFT') summary.draft = g._count._all;
      else if (g.status === 'REJECTED') summary.rejected = g._count._all;
    });

    const plansWithPipeline = plans.map(plan => {
      const { approval_history, ...rest } = plan;
      const pendingStep = approval_history[0];
      if (!pendingStep) return { ...rest, pipeline: null };
      const amt = parseFloat(plan.total_budget);
      const bracketRules = allRules.filter(r =>
        amt >= parseFloat(r.min_amount) && (r.max_amount === null || amt <= parseFloat(r.max_amount))
      );
      const currentRule = bracketRules.find(r => r.step_number === pendingStep.step_number);
      return {
        ...rest,
        pipeline: {
          currentStep: pendingStep.step_number,
          totalSteps: bracketRules.length,
          approverRole: currentRule?.approver_role || null
        }
      };
    });

    res.json({ data: plansWithPipeline, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), summary });
  } catch (err) {
    next(err);
  }
}

// GET /plans/:id
async function getPlanDetail(req, res, next) {
  try {
    const { id } = req.params;
    const plan = await prisma.marketing_plans.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        company: true,
        creator: true,
        items: {
          include: {
            m_coa: true,
            m_brand: true,
            m_line_business: true,
            m_branch: true,
            m_event_location: true,
            vendors: true,
            payment_requests: {
              include: { creator: true },
              orderBy: { created_at: 'desc' }
            }
          }
        },
        approval_history: {
          include: { approver: true },
          orderBy: { step_number: 'asc' }
        },
        // amendments di-include setelah migrasi — dihandle terpisah di bawah
      }
    });

    if (!plan) return res.status(404).json({ error: 'Marketing Plan not found.' });

    // Hitung committed_amount (PENDING+APPROVED payments) per item secara batch
    const itemIds = plan.items.map(i => i.id);
    const committedGroups = itemIds.length > 0 ? await prisma.payment_requests.groupBy({
      by: ['marketing_plan_item_id'],
      where: { marketing_plan_item_id: { in: itemIds }, status: { in: ['PENDING', 'APPROVED'] } },
      _sum: { amount: true }
    }) : [];
    const committedMap = Object.fromEntries(committedGroups.map(g => [g.marketing_plan_item_id, Number(g._sum.amount || 0)]));

    const itemsWithVariance = plan.items.map(item => ({
      ...item,
      committed_amount: committedMap[item.id] || 0
    }));

    // Fetch amendments secara terpisah — aman kalau tabel belum ada (migrasi belum dijalankan)
    let amendments = [];
    try {
      amendments = await prisma.marketing_plan_amendments.findMany({
        where: { marketing_plan_id: plan.id },
        include: { creator: { select: { id: true, name: true } }, change_items: true },
        orderBy: { created_at: 'desc' }
      });
    } catch (_) {
      // tabel belum ada — abaikan saja
    }

    res.json({ ...plan, items: itemsWithVariance, amendments });
  } catch (err) {
    next(err);
  }
}

// POST /plans/:id/complete — tutup plan (APPROVED → COMPLETED)
async function completePlan(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User not registered.' });

    const plan = await prisma.marketing_plans.findUnique({
      where: { id: planId },
      include: { items: { include: { payment_requests: true } } }
    });
    if (!plan) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (plan.status !== 'APPROVED') return res.status(400).json({ error: 'Hanya plan berstatus APPROVED yang bisa diselesaikan.' });

    // Guard: tidak boleh ada payment yang masih PENDING atau APPROVED (belum PAID/REJECTED)
    const pendingPayments = plan.items.flatMap(i => i.payment_requests).filter(pr => ['PENDING', 'APPROVED'].includes(pr.status));
    if (pendingPayments.length > 0) {
      return res.status(400).json({ error: `Masih ada ${pendingPayments.length} payment request yang belum selesai (PENDING/APPROVED). Selesaikan atau tolak terlebih dahulu.` });
    }

    // Guard: actuals harus sudah diisi
    if (!plan.actuals_filled_at) {
      return res.status(400).json({ error: 'Data aktual (post-campaign) harus diisi sebelum plan dapat diselesaikan.' });
    }

    const updated = await prisma.marketing_plans.update({
      where: { id: planId },
      data: { status: 'COMPLETED', updated_at: new Date() }
    });

    res.json({ message: 'Plan berhasil diselesaikan dan ditutup.', plan: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /plans/:id
async function deletePlan(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    
    const plan = await prisma.marketing_plans.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Marketing Plan not found.' });
    }

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const isCreator = employee && plan.creator_id === employee.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Forbidden. Only the creator or admin can delete this plan.' });
    }

    // Hapus payment_requests (dan approval_history terkait) sebelum delete plan
    // karena FK payment_requests -> marketing_plan_items tidak cascade otomatis
    await prisma.$transaction(async (tx) => {
      const items = await tx.marketing_plan_items.findMany({
        where: { marketing_plan_id: planId },
        select: { id: true }
      });
      const itemIds = items.map(i => i.id);

      if (itemIds.length > 0) {
        const payments = await tx.payment_requests.findMany({
          where: { marketing_plan_item_id: { in: itemIds } },
          select: { id: true }
        });
        const paymentIds = payments.map(p => p.id);

        if (paymentIds.length > 0) {
          await tx.approval_history.deleteMany({ where: { payment_request_id: { in: paymentIds } } });
          await tx.payment_requests.deleteMany({ where: { id: { in: paymentIds } } });
        }
      }

      await tx.marketing_plans.delete({ where: { id: planId } });
    });

    res.json({ message: 'Marketing Plan deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPlan,
  updatePlan,
  submitPlan,
  recallPlan,
  updatePlanActuals,
  revisePlan,
  getPlans,
  getPlanDetail,
  completePlan,
  deletePlan
};
