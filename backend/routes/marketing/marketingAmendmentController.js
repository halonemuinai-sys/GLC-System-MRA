const prisma = require('../../api/db');
const { resolveEmployee } = require('./marketingHelper');

const AMENDMENT_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  change_items: true
};

// POST /plans/:id/amendments — buat draft amendment untuk plan APPROVED/COMPLETED
async function createAmendment(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User email not registered in employee database.' });

    const plan = await prisma.marketing_plans.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Marketing Plan not found.' });
    if (!['APPROVED', 'COMPLETED'].includes(plan.status)) {
      return res.status(400).json({ error: 'Amendment hanya bisa dibuat untuk plan berstatus APPROVED atau COMPLETED.' });
    }

    const { title, justification, changes } = req.body;
    if (!title || !justification || !changes || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'Title, justification, dan minimal satu perubahan (changes) wajib diisi.' });
    }

    // Validate each change item
    for (const c of changes) {
      if (!['CHANGE_VENDOR', 'CHANGE_BUDGET', 'ADD_ITEM', 'REMOVE_ITEM'].includes(c.action)) {
        return res.status(400).json({ error: `Action tidak valid: ${c.action}` });
      }
      if (c.action !== 'ADD_ITEM' && !c.plan_item_id) {
        return res.status(400).json({ error: `plan_item_id wajib untuk action ${c.action}` });
      }
      if (c.action === 'CHANGE_BUDGET' && (c.budget_delta === undefined || c.budget_delta === null)) {
        return res.status(400).json({ error: 'budget_delta wajib untuk CHANGE_BUDGET' });
      }
      if (c.action === 'ADD_ITEM' && !c.new_item) {
        return res.status(400).json({ error: 'new_item wajib untuk ADD_ITEM' });
      }
    }

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
  } catch (err) { next(err); }
}

// GET /plans/:id/amendments — list semua amendments untuk satu plan
async function listAmendments(req, res, next) {
  try {
    const planId = parseInt(req.params.id, 10);
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
          select: { id: true, title: true, status: true, total_budget: true,
            items: { include: { m_coa: true, vendors: true, m_brand: true } } }
        }
      }
    });
    if (!amendment) return res.status(404).json({ error: 'Amendment not found.' });
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
    if (amendment.creator_id !== employee.id && req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Hanya pembuat amendment atau admin yang bisa mengajukan.' });
    }
    if (amendment.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Hanya amendment berstatus DRAFT yang bisa diajukan.' });
    }

    const updated = await prisma.marketing_plan_amendments.update({
      where: { id },
      data: { status: 'PENDING_REVIEW', updated_at: new Date() },
      include: AMENDMENT_INCLUDE
    });
    res.json(updated);
  } catch (err) { next(err); }
}

// POST /amendments/:id/review — admin/manager approve atau reject
async function reviewAmendment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { action, review_comment } = req.body; // action: APPROVE | REJECT
    const employee = await resolveEmployee(req.user.email);
    if (!employee) return res.status(403).json({ error: 'User not found.' });

    const userRole = (req.user.role || '').toLowerCase();
    if (!['admin', 'manager', 'finance'].includes(userRole)) {
      return res.status(403).json({ error: 'Hanya admin/manager/finance yang bisa me-review amendment.' });
    }
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action harus APPROVE atau REJECT.' });
    }
    if (action === 'REJECT' && !review_comment) {
      return res.status(400).json({ error: 'Komentar wajib diisi saat menolak amendment.' });
    }

    const amendment = await prisma.marketing_plan_amendments.findUnique({
      where: { id },
      include: { change_items: true, marketing_plan: { include: { items: true } } }
    });
    if (!amendment) return res.status(404).json({ error: 'Amendment not found.' });
    if (amendment.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ error: 'Hanya amendment berstatus PENDING_REVIEW yang bisa di-review.' });
    }

    if (action === 'REJECT') {
      const updated = await prisma.marketing_plan_amendments.update({
        where: { id },
        data: { status: 'REJECTED', reviewed_by: employee.id, reviewed_at: new Date(), review_comment, updated_at: new Date() },
        include: AMENDMENT_INCLUDE
      });
      return res.json({ message: 'Amendment ditolak.', amendment: updated });
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
        data: { status: 'APPROVED', reviewed_by: employee.id, reviewed_at: new Date(), review_comment: review_comment || null, updated_at: new Date() },
        include: AMENDMENT_INCLUDE
      });
    });

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

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    if (!isAdmin && amendment.creator_id !== employee.id) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menghapus amendment ini.' });
    }

    await prisma.marketing_plan_amendments.delete({ where: { id } });
    res.json({ message: 'Amendment berhasil dihapus.' });
  } catch (err) { next(err); }
}

module.exports = { createAmendment, listAmendments, getAmendmentDetail, submitAmendment, reviewAmendment, deleteAmendment };
