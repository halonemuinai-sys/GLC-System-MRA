const prisma = require('../../api/db');
const { resolveEmployee, resolveApproverContact, FRONTEND_URL, canManageDoc, hasRole, seesAllMarketingDocs } = require('./marketingHelper');

const planInScope = (req, plan) => !req.companyScope || req.companyScope.all || req.companyScope.companyIds.includes(plan.company_id);
const { sendAmendmentNotifEmail } = require('../../api/mailer');

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const money = v => Math.round(Number(v || 0) * 100) / 100;
const ACTIVE_VENDOR = s => !s || ['active', 'aktif'].includes(String(s).toLowerCase());
const OPEN_PR = ['PENDING', 'OVERBUDGET_WARN', 'APPROVED'];

// Amendments change an APPROVED plan whose closing is not submitted yet. Every change is checked
// against what already happened on the item (POs, payment requests, payments) and, for budget
// increases, against Budget Control. Used when the draft is created and again when it is approved.
async function validateChanges(db, plan, changes) {
  if (plan.status !== 'APPROVED') throw httpError(400, 'Amendments are only possible while the plan is APPROVED.');
  const closing = await db.marketing_plan_closings.findUnique({ where: { marketing_plan_id: plan.id }, select: { status: true } });
  if (['PENDING_APPROVAL', 'APPROVED'].includes(closing?.status)) throw httpError(400, 'The closing is already submitted or approved; the plan can no longer be amended.');
  if (!Array.isArray(changes) || !changes.length) throw httpError(400, 'Add at least one change.');

  const itemIds = [...new Set(changes.filter(c => c.action !== 'ADD_ITEM').map(c => parseInt(c.plan_item_id, 10)))];
  const items = await db.marketing_plan_items.findMany({
    where: { id: { in: itemIds.length ? itemIds : [-1] } },
    include: {
      payment_requests: { select: { amount: true, status: true } },
      po_lines: { select: { amount: true, purchase_order: { select: { po_number: true, status: true, vendor_id: true } } } }
    }
  });
  const byId = new Map(items.map(i => [i.id, i]));
  const touched = new Set();
  const deltas = new Map(); // brand|lob|month -> budget increase
  const addDelta = (brand, lob, month, value) => {
    if (!brand || !lob || !month || !value) return;
    const key = `${brand}|${lob}|${month}`;
    deltas.set(key, (deltas.get(key) || 0) + value);
  };

  for (const [index, c] of changes.entries()) {
    const n = `Change ${index + 1}`;
    if (!['CHANGE_VENDOR', 'CHANGE_BUDGET', 'ADD_ITEM', 'REMOVE_ITEM'].includes(c.action)) throw httpError(400, `${n}: unknown action.`);
    if (c.action === 'ADD_ITEM') {
      const spec = c.new_item || (c.new_item_json ? JSON.parse(c.new_item_json) : null);
      const amount = money(spec?.budget_amount);
      const month = parseInt(spec?.period_month, 10);
      if (!spec || !parseInt(spec.coa_id, 10) || !(month >= 1 && month <= 12) || !(amount > 0)) throw httpError(400, `${n}: a new item needs a cost account, month (1-12) and a budget above 0.`);
      if (!(await db.m_coa.findUnique({ where: { id: parseInt(spec.coa_id, 10) }, select: { id: true } }))) throw httpError(400, `${n}: cost account not found.`);
      if (spec.vendor_id) {
        const v = await db.vendors.findUnique({ where: { id: parseInt(spec.vendor_id, 10) }, select: { status: true, vendor_name: true } });
        if (!v || !ACTIVE_VENDOR(v.status)) throw httpError(400, `${n}: the vendor is not an active vendor.`);
      }
      addDelta(parseInt(spec.brand_id, 10), parseInt(spec.lob_id, 10), month, amount);
      continue;
    }
    const item = byId.get(parseInt(c.plan_item_id, 10));
    if (!item || item.marketing_plan_id !== plan.id) throw httpError(400, `${n}: the item does not belong to this plan.`);
    if (touched.has(item.id)) throw httpError(400, `${n}: the same item is changed twice; combine the changes.`);
    touched.add(item.id);
    const label = item.description || `item #${item.id}`;
    const activePos = item.po_lines.filter(l => l.purchase_order && l.purchase_order.status !== 'CANCELLED');
    const prs = item.payment_requests.filter(pr => pr.status !== 'REJECTED');

    if (c.action === 'CHANGE_VENDOR') {
      const vendorId = parseInt(c.new_vendor_id, 10);
      const v = Number.isInteger(vendorId) ? await db.vendors.findUnique({ where: { id: vendorId }, select: { status: true } }) : null;
      if (!v || !ACTIVE_VENDOR(v.status)) throw httpError(400, `${n}: select an active vendor.`);
      if (vendorId === item.vendor_id) throw httpError(400, `${n}: this is already the vendor of ${label}.`);
      if (activePos.length) throw httpError(400, `${n}: ${label} already has GA PO ${activePos.map(l => l.purchase_order.po_number).join(', ')}. Ask GA to cancel it before changing the vendor.`);
    }
    if (c.action === 'CHANGE_BUDGET') {
      const delta = money(c.budget_delta);
      if (!delta) throw httpError(400, `${n}: enter the budget increase or decrease.`);
      const newBudget = money(Number(item.budget_amount) + delta);
      const ordered = money(activePos.reduce((sum, l) => sum + Number(l.amount), 0));
      const used = money(prs.reduce((sum, pr) => sum + Number(pr.amount), 0));
      const floor = Math.max(ordered, used);
      if (newBudget < floor) throw httpError(400, `${n}: ${label} cannot go below Rp ${floor.toLocaleString('id-ID')} (already ${ordered >= used ? 'ordered on a GA PO' : 'requested or paid'}).`);
      if (delta > 0) addDelta(item.brand_id, item.lob_id, item.period_month, delta);
    }
    if (c.action === 'REMOVE_ITEM') {
      if (item.po_lines.length) throw httpError(400, `${n}: ${label} is on GA PO ${item.po_lines.map(l => l.purchase_order?.po_number).join(', ')} and cannot be removed. Reduce its budget instead.`);
      if (item.payment_requests.length) throw httpError(400, `${n}: ${label} has payment requests and cannot be removed.`);
    }
  }

  // Budget Control: increases must fit the locked monthly limit of that brand / LOB / month.
  const overBudget = [];
  for (const [key, increase] of deltas) {
    if (increase <= 0) continue;
    const [brand, lob, month] = key.split('|').map(Number);
    const budget = await db.m_marketing_budget.findUnique({
      where: { company_id_brand_id_lob_id_fiscal_year: { company_id: plan.company_id, brand_id: brand, lob_id: lob, fiscal_year: plan.fiscal_year } },
      include: { monthly_limits: true }
    });
    if (!budget || !budget.is_locked) continue;
    const limit = money(budget.monthly_limits.find(m => m.period_month === month)?.budget_limit);
    const committed = await db.marketing_plan_items.aggregate({
      where: { brand_id: brand, lob_id: lob, period_month: month, marketing_plan: { company_id: plan.company_id, fiscal_year: plan.fiscal_year, status: { in: ['APPROVED', 'PENDING_APPROVAL'] } } },
      _sum: { budget_amount: true }
    });
    const after = money(Number(committed._sum.budget_amount || 0) + increase);
    if (after > limit) overBudget.push({ month, limit, after });
  }
  return { overBudget };
}

const AMENDMENT_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  change_items: true
};

// POST /plans/:id/amendments — buat draft amendment untuk plan APPROVED/COMPLETED
async function createAmendment(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'Your email is not registered as a Master Signer.' });

    const plan = await prisma.marketing_plans.findUnique({ where: { id: planId } });
    if (!plan || !planInScope(req, plan)) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (!canManageDoc(req, plan.creator_id, employee)) return res.status(403).json({ error: 'Only the plan creator or a Marketing Manager can propose an amendment.' });

    const { changes } = req.body;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const justification = typeof req.body.justification === 'string' ? req.body.justification.trim() : '';
    if (!title || !justification) return res.status(400).json({ error: 'Title and justification are required.' });
    await validateChanges(prisma, plan, changes);

    const amendment = await prisma.$transaction(async (tx) => {
      const newAmendment = await tx.marketing_plan_amendments.create({
        data: {
          marketing_plan_id: planId,
          title,
          justification,
          status: 'DRAFT',
          creator_id: employee.id,
          updated_at: new Date()
        }
      });

      for (const c of changes) {
        await tx.marketing_plan_amendment_items.create({
          data: {
            amendment_id: newAmendment.id,
            action: c.action,
            plan_item_id: c.plan_item_id ? parseInt(c.plan_item_id, 10) : null,
            new_vendor_id: c.new_vendor_id ? parseInt(c.new_vendor_id, 10) : null,
            budget_delta: c.budget_delta !== undefined && c.budget_delta !== null ? parseFloat(c.budget_delta) : null,
            new_item_json: c.new_item ? JSON.stringify(c.new_item) : null,
            change_reason: c.change_reason || null
          }
        });
      }

      return tx.marketing_plan_amendments.findUnique({
        where: { id: newAmendment.id },
        include: AMENDMENT_INCLUDE
      });
    });

    res.status(201).json(amendment);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// GET /plans/:id/amendments — list semua amendments untuk satu plan
async function listAmendments(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const plan = await prisma.marketing_plans.findUnique({ where: { id: planId }, select: { company_id: true, creator_id: true } });
    if (!plan || !planInScope(req, plan)) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (!seesAllMarketingDocs(req)) {
      const employee = await resolveEmployee(req.user.email);
      if (!employee || employee.id !== plan.creator_id) return res.status(404).json({ error: 'Marketing Plan not found.' });
    }
    const amendments = await prisma.marketing_plan_amendments.findMany({
      where: { marketing_plan_id: planId },
      include: AMENDMENT_INCLUDE,
      orderBy: { created_at: 'desc' }
    });
    res.json(amendments);
  } catch (err) { next(err); }
}

// GET /amendments/:id — detail satu amendment dengan konteks item plan
async function getAmendmentDetail(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const amendment = await prisma.marketing_plan_amendments.findUnique({
      where: { id },
      include: {
        ...AMENDMENT_INCLUDE,
        marketing_plan: {
          select: { id: true, title: true, status: true, total_budget: true, company_id: true,
            items: { include: { m_coa: true, vendors: true, m_brand: true } } }
        }
      }
    });
    if (!amendment) return res.status(404).json({ error: 'Amendment not found.' });
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(amendment.marketing_plan.company_id)) {
      return res.status(404).json({ error: 'Amendment not found.' });
    }
    res.json(amendment);
  } catch (err) { next(err); }
}

// POST /amendments/:id/submit — DRAFT → PENDING_REVIEW
async function submitAmendment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User not found.' });

    const amendment = await prisma.marketing_plan_amendments.findUnique({ where: { id } });
    if (!amendment) return res.status(404).json({ error: 'Amendment not found.' });
    if (!canManageDoc(req, amendment.creator_id, employee)) {
      return res.status(403).json({ error: 'Only the amendment creator or a Marketing Manager can submit it.' });
    }
    if (amendment.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft amendments can be submitted.' });
    }
    const plan = await prisma.marketing_plans.findUnique({ where: { id: amendment.marketing_plan_id }, include: { company: true } });
    if (!plan || !planInScope(req, plan)) return res.status(404).json({ error: 'Amendment not found.' });
    const changes = await prisma.marketing_plan_amendment_items.findMany({ where: { amendment_id: id } });
    await validateChanges(prisma, plan, changes);

    const updated = await prisma.marketing_plan_amendments.update({
      where: { id },
      data: { status: 'PENDING_REVIEW', updated_at: new Date() },
      include: { ...AMENDMENT_INCLUDE, marketing_plan: { select: { title: true } } }
    });

    // Notify the reviewers of this company (Marketing Manager and Finance Controller recipients).
    try {
      const reviewerContacts = (await Promise.all(['MARKETING_MANAGER', 'FINANCE_CONTROLLER'].map(role =>
        resolveApproverContact(prisma, role, plan.company_id, plan.company?.company_master_id).then(c => c && { ...c, role }))))
        .filter(Boolean)
        .filter((c, i, all) => all.findIndex(x => x.email === c.email) === i);
      for (const contact of reviewerContacts) {
        await sendAmendmentNotifEmail({
          to: contact.email,
          recipientLabel: contact.role,
          docTitle: updated.title,
          planTitle: updated.marketing_plan?.title || '',
          justification: updated.justification,
          frontendUrl: FRONTEND_URL
        });
      }
    } catch (e) {
      console.error('Amendment submit notif email failed:', e.message);
    }

    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// POST /amendments/:id/review — admin/manager approve atau reject
async function reviewAmendment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { action, review_comment } = req.body; // action: APPROVE | REJECT
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User not found.' });

    if (!hasRole(req, 'admin', 'manager', 'marketing_manager', 'finance')) {
      return res.status(403).json({ error: 'Only an admin, manager, Marketing Manager or Finance can review amendments.' });
    }
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }
    if (action === 'REJECT' && !String(review_comment || '').trim()) {
      return res.status(400).json({ error: 'A reason is required to reject the amendment.' });
    }

    const amendment = await prisma.marketing_plan_amendments.findUnique({
      where: { id },
      include: { change_items: true, marketing_plan: { include: { items: true } } }
    });
    if (!amendment || !planInScope(req, amendment.marketing_plan)) return res.status(404).json({ error: 'Amendment not found.' });
    if (amendment.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ error: 'Only amendments waiting for review can be reviewed.' });
    }
    if (amendment.creator_id === employee.id && !hasRole(req, 'admin')) {
      return res.status(403).json({ error: 'You cannot review your own amendment.' });
    }
    if (action === 'APPROVE') {
      // The plan may have moved on since the draft (new POs, payments, closing); check again.
      const { overBudget } = await validateChanges(prisma, amendment.marketing_plan, amendment.change_items);
      if (overBudget.length && req.body.acknowledge_overbudget !== true) {
        return res.status(409).json({
          code: 'OVERBUDGET',
          error: `This amendment takes month ${overBudget.map(o => `${o.month} to Rp ${o.after.toLocaleString('id-ID')} (limit Rp ${o.limit.toLocaleString('id-ID')})`).join(', ')} above Budget Control.`,
          over_budget: overBudget
        });
      }
    }

    if (action === 'REJECT') {
      const updated = await prisma.marketing_plan_amendments.update({
        where: { id },
        data: { status: 'REJECTED', reviewed_by: String(employee.id), reviewed_at: new Date(), review_comment, updated_at: new Date() },
        include: { ...AMENDMENT_INCLUDE, marketing_plan: { select: { title: true } } }
      });
      try {
        const creator = await prisma.m_approval_signer.findUnique({ where: { id: amendment.creator_id }, select: { email: true, name: true } });
        if (creator?.email) {
          await sendAmendmentNotifEmail({
            to: creator.email, recipientLabel: creator.name || 'Tim Marketing',
            docTitle: updated.title, planTitle: updated.marketing_plan?.title || '',
            action: 'REJECTED', reviewComment: review_comment, frontendUrl: FRONTEND_URL
          });
        }
      } catch (e) { console.error('Amendment reject notif email failed:', e.message); }
      return res.json({ message: 'Amendment rejected.', amendment: updated });
    }

    // APPROVE: apply semua changes ke plan items
    const result = await prisma.$transaction(async (tx) => {
      let budgetDelta = 0;

      for (const change of amendment.change_items) {
        if (change.action === 'CHANGE_VENDOR') {
          await tx.marketing_plan_items.update({
            where: { id: change.plan_item_id },
            data: { vendor_id: change.new_vendor_id }
          });

        } else if (change.action === 'CHANGE_BUDGET') {
          const delta = parseFloat(change.budget_delta || 0);
          const item = amendment.marketing_plan.items.find(i => i.id === change.plan_item_id);
          if (item) {
            const newBudget = Math.max(0, parseFloat(item.budget_amount) + delta);
            await tx.marketing_plan_items.update({
              where: { id: change.plan_item_id },
              data: { budget_amount: newBudget, unit_price: newBudget }
            });
            budgetDelta += delta;
          }

        } else if (change.action === 'ADD_ITEM') {
          const spec = JSON.parse(change.new_item_json || '{}');
          await tx.marketing_plan_items.create({
            data: {
              marketing_plan_id: amendment.marketing_plan_id,
              coa_id: parseInt(spec.coa_id, 10),
              brand_id: spec.brand_id ? parseInt(spec.brand_id, 10) : null,
              lob_id: spec.lob_id ? parseInt(spec.lob_id, 10) : null,
              branch_id: spec.branch_id ? parseInt(spec.branch_id, 10) : null,
              event_location_id: spec.event_location_id ? parseInt(spec.event_location_id, 10) : null,
              vendor_id: spec.vendor_id ? parseInt(spec.vendor_id, 10) : null,
              period_month: parseInt(spec.period_month, 10),
              budget_amount: parseFloat(spec.budget_amount || 0),
              actual_amount: 0,
              description: spec.description || null,
              qty: spec.qty ? parseInt(spec.qty, 10) : 1,
              unit_price: spec.unit_price ? parseFloat(spec.unit_price) : parseFloat(spec.budget_amount || 0)
            }
          });
          budgetDelta += parseFloat(spec.budget_amount || 0);

        } else if (change.action === 'REMOVE_ITEM') {
          const item = amendment.marketing_plan.items.find(i => i.id === change.plan_item_id);
          if (item) budgetDelta -= parseFloat(item.budget_amount);
          await tx.marketing_plan_items.delete({ where: { id: change.plan_item_id } });
        }
      }

      // Recalculate total_budget dari semua items setelah perubahan
      const updatedItems = await tx.marketing_plan_items.findMany({
        where: { marketing_plan_id: amendment.marketing_plan_id },
        select: { budget_amount: true }
      });
      const newTotal = updatedItems.reduce((sum, i) => sum + parseFloat(i.budget_amount), 0);

      await tx.marketing_plans.update({
        where: { id: amendment.marketing_plan_id },
        data: { total_budget: newTotal, updated_at: new Date() }
      });

      return tx.marketing_plan_amendments.update({
        where: { id },
        data: { status: 'APPROVED', reviewed_by: String(employee.id), reviewed_at: new Date(), review_comment: review_comment || null, updated_at: new Date() },
        include: { ...AMENDMENT_INCLUDE, marketing_plan: { select: { title: true } } }
      });
    });

    try {
      const creator = await prisma.m_approval_signer.findUnique({ where: { id: amendment.creator_id }, select: { email: true, name: true } });
      if (creator?.email) {
        await sendAmendmentNotifEmail({
          to: creator.email, recipientLabel: creator.name || 'Tim Marketing',
          docTitle: result.title, planTitle: result.marketing_plan?.title || '',
          action: 'APPROVED', reviewComment: review_comment, frontendUrl: FRONTEND_URL
        });
      }
    } catch (e) { console.error('Amendment approve notif email failed:', e.message); }

    res.json({ message: 'Amendment disetujui dan perubahan telah diterapkan ke plan.', amendment: result });
  } catch (err) { next(err); }
}

// DELETE /amendments/:id — hapus amendment DRAFT
async function deleteAmendment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User not found.' });

    const amendment = await prisma.marketing_plan_amendments.findUnique({ where: { id } });
    if (!amendment) return res.status(404).json({ error: 'Amendment not found.' });
    if (amendment.status !== 'DRAFT') return res.status(400).json({ error: 'Hanya amendment DRAFT yang bisa dihapus.' });

    if (!canManageDoc(req, amendment.creator_id, employee)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menghapus amendment ini.' });
    }

    await prisma.marketing_plan_amendments.delete({ where: { id } });
    res.json({ message: 'Amendment berhasil dihapus.' });
  } catch (err) { next(err); }
}

module.exports = { createAmendment, listAmendments, getAmendmentDetail, submitAmendment, reviewAmendment, deleteAmendment, validateChanges };
