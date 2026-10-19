const prisma = require('../../api/db');
const { nextDocNumber } = require('./gaDocNumber');

// GA purchase orders for Marketing: built from approved Marketing Plan items and used as the
// basis for the vendor PO in NetSuite. One PO = one vendor + one company (NetSuite subsidiary);
// lines may come from several plans. The PO subtotal (before tax) counts against item budgets.

const TAX_OPTIONS = {
  NONE: { rate: 0, kind: 'NONE' },
  PPN_11: { rate: 11, kind: 'PPN' },
  PPN_12: { rate: 12, kind: 'PPN' },
  PPH21_INDIVIDUAL: { rate: 2.5, kind: 'WITHHOLDING' }
};
const TAX_RATES = Object.values(TAX_OPTIONS).map(option => option.rate);
const OPEN_PO_STATUSES = ['DRAFT', 'ISSUED', 'CLOSED']; // everything except CANCELLED commits budget
const PO_PREFIX = 'PO-MKT';
const MAX_LINES = 100;
// The vendor master uses both spellings; anything else (Pending, Inactive, Evaluasi) cannot take a PO.
const ACTIVE_VENDOR_STATUSES = ['Active', 'Aktif'];
const isActiveVendor = status => !status || ACTIVE_VENDOR_STATUSES.some(s => s.toLowerCase() === String(status).toLowerCase());

const toMoney = value => Math.round(Number(value || 0) * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const actor = req => req.user?.email || req.user?.full_name || null;
const inScope = (req, companyId) => !req.companyScope || req.companyScope.all || req.companyScope.companyIds.includes(Number(companyId));
const scopeWhere = (req, field = 'company_id') => (!req.companyScope || req.companyScope.all ? {} : { [field]: { in: req.companyScope.companyIds.length ? req.companyScope.companyIds : [-1] } });

function taxTypeForLegacyRate(taxRate) {
  if (Number(taxRate) === 11) return 'PPN_11';
  if (Number(taxRate) === 12) return 'PPN_12';
  if (Number(taxRate) === 2.5) return 'PPH21_INDIVIDUAL';
  return 'NONE';
}

function resolveTax(body) {
  const requestedType = String(body.tax_type || '').trim().toUpperCase();
  const legacyRate = Number(body.tax_rate ?? 0);
  const taxType = requestedType || taxTypeForLegacyRate(legacyRate);
  const tax = TAX_OPTIONS[taxType];
  if (!tax) throw httpError(400, 'Select a supported tax type: none, PPN 11%, PPN 12%, or PPh 21 individual 2.5%.');
  if (!requestedType && !TAX_RATES.includes(legacyRate)) throw httpError(400, 'Tax rate must be 0%, 2.5%, 11% or 12%.');
  if (requestedType && body.tax_rate !== undefined && Number(body.tax_rate) !== tax.rate) throw httpError(400, 'Tax type and tax rate do not match.');
  return { tax_type: taxType, tax_rate: tax.rate, tax_kind: tax.kind };
}

function computeTotals(lines, taxRate, taxType = null) {
  const subtotal = toMoney(lines.reduce((sum, line) => sum + toMoney(Number(line.qty) * Number(line.unit_price)), 0));
  const taxAmount = toMoney(subtotal * Number(taxRate) / 100);
  const isWithholding = (taxType || taxTypeForLegacyRate(taxRate)) === 'PPH21_INDIVIDUAL';
  return { subtotal, tax_amount: taxAmount, total: toMoney(isWithholding ? subtotal - taxAmount : subtotal + taxAmount) };
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Amount already committed per plan item by POs that are not cancelled (optionally excluding one PO).
async function committedByItem(db, itemIds, excludePoId = null) {
  if (!itemIds.length) return new Map();
  const rows = await db.purchase_order_lines.groupBy({
    by: ['marketing_plan_item_id'],
    where: {
      marketing_plan_item_id: { in: itemIds },
      purchase_order: { status: { in: OPEN_PO_STATUSES }, ...(excludePoId ? { id: { not: excludePoId } } : {}) }
    },
    _sum: { amount: true }
  });
  return new Map(rows.map(row => [row.marketing_plan_item_id, toMoney(row._sum.amount)]));
}

// Validates header + lines against vendors, plan items and remaining item budget.
async function validatePayload(db, req, body, excludePoId = null) {
  const companyId = parseInt(body.company_id, 10);
  const vendorId = parseInt(body.vendor_id, 10);
  const tax = resolveTax(body);
  const taxRate = tax.tax_rate;
  const taxInclusive = tax.tax_kind === 'PPN' && body.tax_inclusive === true;
  if (!Number.isInteger(companyId) || !inScope(req, companyId)) throw httpError(400, 'Select a company you have access to.');
  if (!Number.isInteger(vendorId)) throw httpError(400, 'Select a vendor.');
  const orderDate = parseDate(body.order_date) ?? new Date(new Date().toISOString().slice(0, 10));
  const deliveryDate = parseDate(body.delivery_date);
  if (orderDate === undefined || deliveryDate === undefined) throw httpError(400, 'Invalid order or delivery date.');
  if (deliveryDate && deliveryDate < orderDate) throw httpError(400, 'Delivery date cannot be before the order date.');
  const terms = body.payment_terms_days === '' || body.payment_terms_days == null ? null : parseInt(body.payment_terms_days, 10);
  if (terms !== null && (!Number.isInteger(terms) || terms < 0 || terms > 365)) throw httpError(400, 'Payment terms must be between 0 and 365 days.');

  const vendor = await db.vendors.findUnique({ where: { id: vendorId }, select: { id: true, vendor_name: true, status: true, top_days: true } });
  if (!vendor) throw httpError(400, 'Vendor not found.');
  if (!isActiveVendor(vendor.status)) throw httpError(400, `Vendor "${vendor.vendor_name}" is ${vendor.status === 'Pending' ? 'waiting for GA registration' : 'not active'}. Complete it in the vendor master first.`);

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  if (!rawLines.length) throw httpError(400, 'Add at least one line.');
  if (rawLines.length > MAX_LINES) throw httpError(400, `A PO can have at most ${MAX_LINES} lines.`);
  const lines = rawLines.map((line, index) => {
    const itemId = parseInt(line.marketing_plan_item_id, 10);
    const qty = Number(line.qty);
    const quotedUnitPrice = Number(line.unit_price);
    const description = typeof line.description === 'string' ? line.description.trim().replace(/\s+/g, ' ') : '';
    if (!Number.isInteger(itemId)) throw httpError(400, `Line ${index + 1}: select a plan item.`);
    if (!description || description.length > 255) throw httpError(400, `Line ${index + 1}: description is required (max 255 characters).`);
    if (!Number.isFinite(qty) || qty <= 0) throw httpError(400, `Line ${index + 1}: quantity must be greater than 0.`);
    if (!Number.isFinite(quotedUnitPrice) || quotedUnitPrice < 0) throw httpError(400, `Line ${index + 1}: unit price cannot be negative.`);
    // When the vendor quote already includes PPN, persist only the pre-tax base so
    // plan budget checks and campaign realization always use the same net value.
    const unitPrice = taxInclusive ? toMoney(quotedUnitPrice / (1 + taxRate / 100)) : quotedUnitPrice;
    const amount = toMoney(qty * unitPrice);
    if (amount <= 0) throw httpError(400, `Line ${index + 1}: amount must be greater than 0.`);
    return { marketing_plan_item_id: itemId, description, qty: toMoney(qty), unit_price: toMoney(unitPrice), amount };
  });
  const itemIds = [...new Set(lines.map(line => line.marketing_plan_item_id))];
  if (itemIds.length !== lines.length) throw httpError(400, 'Each plan item can appear only once per PO.');

  const items = await db.marketing_plan_items.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, budget_amount: true, description: true, marketing_plan: { select: { title: true, status: true, company_id: true } } }
  });
  const itemMap = new Map(items.map(item => [item.id, item]));
  const committed = await committedByItem(db, itemIds, excludePoId);
  for (const line of lines) {
    const item = itemMap.get(line.marketing_plan_item_id);
    if (!item) throw httpError(400, `Plan item #${line.marketing_plan_item_id} not found.`);
    if (item.marketing_plan.status !== 'APPROVED') throw httpError(400, `Plan "${item.marketing_plan.title}" is not approved.`);
    if (item.marketing_plan.company_id !== companyId) throw httpError(400, `Plan "${item.marketing_plan.title}" belongs to a different company.`);
    const remaining = toMoney(Number(item.budget_amount) - (committed.get(item.id) || 0));
    if (line.amount > remaining) {
      throw httpError(400, `"${line.description}" exceeds the remaining item budget of Rp ${Math.max(0, remaining).toLocaleString('id-ID')}.`);
    }
  }

  return {
    header: {
      company_id: companyId,
      vendor_id: vendorId,
      tax_type: tax.tax_type,
      tax_inclusive: taxInclusive,
      tax_rate: taxRate,
      order_date: orderDate,
      delivery_date: deliveryDate,
      payment_terms_days: terms ?? vendor.top_days ?? null,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null,
      ...computeTotals(lines, taxRate, tax.tax_type)
    },
    lines
  };
}

const LIST_INCLUDE = {
  company: { select: { id: true, name: true } },
  vendor: { select: { id: true, vendor_code: true, vendor_name: true } },
  lines: { select: { amount: true, marketing_plan_item: { select: { marketing_plan: { select: { id: true, title: true } } } } } },
  _count: { select: { payment_requests: true } }
};

const DETAIL_INCLUDE = {
  company: { select: { id: true, name: true } },
  vendor: { select: { id: true, vendor_code: true, vendor_name: true, npwp: true, address: true, pic_name: true, phone: true, email: true, top_days: true } },
  lines: {
    orderBy: { id: 'asc' },
    include: {
      marketing_plan_item: {
        select: {
          id: true, period_month: true, budget_amount: true, description: true,
          m_coa: { select: { code: true, name: true } },
          m_brand: { select: { name: true } },
          m_line_business: { select: { name: true } },
          marketing_plan: { select: { id: true, title: true, fiscal_year: true, event_start_date: true } }
        }
      }
    }
  },
  payment_requests: { orderBy: { id: 'asc' }, select: { id: true, title: true, amount: true, status: true, paid_at: true, marketing_plan_item_id: true } }
};

function summarizeListRow(po) {
  const plans = new Map();
  for (const line of po.lines) {
    const plan = line.marketing_plan_item?.marketing_plan;
    if (plan) plans.set(plan.id, plan.title);
  }
  const { lines, _count, ...rest } = po;
  return { ...rest, line_count: lines.length, plan_titles: [...plans.values()], payment_count: _count.payment_requests };
}

// GET /marketing-po/queue — approved plan items that still have budget left to order.
async function getQueue(req, res, next) {
  try {
    const companyId = req.query.company_id ? parseInt(req.query.company_id, 10) : null;
    const search = String(req.query.search || '').trim();
    const items = await prisma.marketing_plan_items.findMany({
      where: {
        budget_amount: { gt: 0 },
        marketing_plan: {
          status: 'APPROVED',
          ...scopeWhere(req),
          ...(companyId ? { company_id: companyId } : {}),
          ...(search ? { title: { contains: search, mode: 'insensitive' } } : {})
        }
      },
      orderBy: [{ marketing_plan_id: 'desc' }, { period_month: 'asc' }, { id: 'asc' }],
      take: 1000,
      select: {
        id: true, period_month: true, budget_amount: true, description: true, qty: true, unit_price: true,
        m_coa: { select: { code: true, name: true } },
        m_brand: { select: { name: true } },
        m_line_business: { select: { name: true } },
        m_branch: { select: { name: true } },
        m_event_location: { select: { name: true } },
        vendors: { select: { id: true, vendor_name: true, vendor_code: true, status: true } },
        marketing_plan: { select: { id: true, title: true, fiscal_year: true, event_start_date: true, company: { select: { id: true, name: true } } } }
      }
    });
    const committed = await committedByItem(prisma, items.map(item => item.id));
    const rows = items.map(item => {
      const budget = toMoney(item.budget_amount);
      const ordered = committed.get(item.id) || 0;
      const vendor = item.vendors ? { ...item.vendors, active: isActiveVendor(item.vendors.status) } : null;
      return { ...item, vendors: vendor, budget_amount: budget, ordered, remaining: toMoney(budget - ordered) };
    }).filter(item => item.remaining > 0);
    res.json({ data: rows });
  } catch (err) { next(err); }
}

// GET /marketing-po — paginated list with status summary.
async function getPurchaseOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const search = String(req.query.search || '').trim();
    const base = {
      ...scopeWhere(req),
      ...(req.query.company_id ? { company_id: parseInt(req.query.company_id, 10) } : {}),
      ...(req.query.vendor_id ? { vendor_id: parseInt(req.query.vendor_id, 10) } : {}),
      ...(search ? { OR: [
        { po_number: { contains: search, mode: 'insensitive' } },
        { vendor: { vendor_name: { contains: search, mode: 'insensitive' } } },
        { lines: { some: { marketing_plan_item: { marketing_plan: { title: { contains: search, mode: 'insensitive' } } } } } }
      ] } : {})
    };
    const where = { ...base, ...(req.query.status ? { status: String(req.query.status) } : {}) };
    const [total, rows, grouped] = await Promise.all([
      prisma.purchase_orders.count({ where }),
      prisma.purchase_orders.findMany({ where, include: LIST_INCLUDE, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.purchase_orders.groupBy({ by: ['status'], where: base, _count: { _all: true }, _sum: { total: true } })
    ]);
    const summary = Object.fromEntries(grouped.map(g => [g.status, { count: g._count._all, total: toMoney(g._sum.total) }]));
    const notExported = await prisma.purchase_orders.count({ where: { ...base, status: 'ISSUED', netsuite_status: 'NOT_SENT' } });
    res.json({ data: rows.map(summarizeListRow), total, page, totalPages: Math.max(1, Math.ceil(total / limit)), summary, not_exported: notExported });
  } catch (err) { next(err); }
}

async function loadPo(req, id) {
  const po = Number.isInteger(id) ? await prisma.purchase_orders.findUnique({ where: { id }, include: DETAIL_INCLUDE }) : null;
  if (!po || !inScope(req, po.company_id)) throw httpError(404, 'Purchase order not found.');
  return po;
}

// GET /marketing-po/:id
async function getPurchaseOrder(req, res, next) {
  try {
    res.json(await loadPo(req, parseInt(req.params.id, 10)));
  } catch (err) { next(err); }
}

// POST /marketing-po — create a draft (or issue right away with { issue: true }).
async function createPurchaseOrder(req, res, next) {
  try {
    const po = await prisma.$transaction(async tx => {
      const { header, lines } = await validatePayload(tx, req, req.body);
      const issue = req.body.issue === true;
      const poNumber = await nextDocNumber(tx.purchase_orders, 'po_number', PO_PREFIX);
      return tx.purchase_orders.create({
        data: {
          ...header,
          po_number: poNumber,
          status: issue ? 'ISSUED' : 'DRAFT',
          created_by: actor(req),
          ...(issue ? { issued_at: new Date(), issued_by: actor(req) } : {}),
          lines: { create: lines }
        },
        include: DETAIL_INCLUDE
      });
    }, { isolationLevel: 'Serializable' });
    res.status(201).json(po);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Another PO was created at the same time. Please save again.' });
    if (err.code === 'P2034') return res.status(409).json({ error: 'Budget data changed while saving. Please try again.' });
    next(err);
  }
}

// PUT /marketing-po/:id — drafts only; replaces header and lines.
async function updatePurchaseOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await loadPo(req, id);
    if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft POs can be edited.' });
    const po = await prisma.$transaction(async tx => {
      const { header, lines } = await validatePayload(tx, req, req.body, id);
      await tx.purchase_order_lines.deleteMany({ where: { purchase_order_id: id } });
      return tx.purchase_orders.update({
        where: { id },
        data: { ...header, updated_at: new Date(), lines: { create: lines } },
        include: DETAIL_INCLUDE
      });
    }, { isolationLevel: 'Serializable' });
    res.json(po);
  } catch (err) {
    if (err.code === 'P2034') return res.status(409).json({ error: 'Budget data changed while saving. Please try again.' });
    next(err);
  }
}

// POST /marketing-po/:id/issue — DRAFT → ISSUED after re-checking budgets.
async function issuePurchaseOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await loadPo(req, id);
    if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft POs can be issued.' });
    const po = await prisma.$transaction(async tx => {
      await validatePayload(tx, req, {
        ...existing,
        tax_type: existing.tax_type || taxTypeForLegacyRate(existing.tax_rate),
        tax_inclusive: false,
        tax_rate: Number(existing.tax_rate),
        order_date: existing.order_date?.toISOString(),
        delivery_date: existing.delivery_date?.toISOString(),
        lines: existing.lines.map(line => ({ marketing_plan_item_id: line.marketing_plan_item_id, description: line.description, qty: Number(line.qty), unit_price: Number(line.unit_price) }))
      }, id);
      const claimed = await tx.purchase_orders.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'ISSUED', issued_at: new Date(), issued_by: actor(req), updated_at: new Date() } });
      if (claimed.count !== 1) throw httpError(409, 'This PO was changed by someone else. Reload and try again.');
      return tx.purchase_orders.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    }, { isolationLevel: 'Serializable' });
    res.json(po);
  } catch (err) { next(err); }
}

// POST /marketing-po/:id/cancel — releases the committed budget; blocked while payments use it.
async function cancelPurchaseOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await loadPo(req, id);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!['DRAFT', 'ISSUED'].includes(existing.status)) return res.status(400).json({ error: `A ${existing.status.toLowerCase()} PO cannot be cancelled.` });
    if (!reason) return res.status(400).json({ error: 'A cancellation reason is required.' });
    const activePayments = existing.payment_requests.filter(p => p.status !== 'REJECTED');
    if (activePayments.length) return res.status(409).json({ error: `${activePayments.length} payment request(s) still use this PO. Reject or relink them first.` });
    const po = await prisma.purchase_orders.update({
      where: { id },
      data: { status: 'CANCELLED', cancelled_at: new Date(), cancelled_by: actor(req), cancel_reason: reason.slice(0, 1000), updated_at: new Date() },
      include: DETAIL_INCLUDE
    });
    res.json(po);
  } catch (err) { next(err); }
}

// POST /marketing-po/:id/close — ISSUED → CLOSED only after the PO is fully settled.
async function closePurchaseOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const po = await prisma.$transaction(async tx => {
      // Reload inside the transaction so payment status and PO status cannot change between
      // validation and the state transition.
      const existing = Number.isInteger(id)
        ? await tx.purchase_orders.findUnique({ where: { id }, include: DETAIL_INCLUDE })
        : null;
      if (!existing || !inScope(req, existing.company_id)) throw httpError(404, 'Purchase order not found.');
      if (existing.status !== 'ISSUED') throw httpError(400, 'Only issued POs can be closed. Reopen a closed PO first if it needs correction.');

      const unresolved = existing.payment_requests.filter(payment => !['PAID', 'REJECTED'].includes(payment.status));
      if (unresolved.length) {
        throw httpError(409, `${unresolved.length} payment request(s) on this PO are not paid or rejected yet.`);
      }

      // A PO represents the full vendor liability, including PPN. It is only settled when
      // paid requests cover the complete PO total; rejected requests do not count as paid.
      const paidTotal = toMoney(existing.payment_requests
        .filter(payment => payment.status === 'PAID')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
      const outstanding = toMoney(Number(existing.total || 0) - paidTotal);
      if (outstanding > 0.01) {
        throw httpError(409, `PO still has Rp ${Math.ceil(outstanding).toLocaleString('id-ID')} unpaid. Record the remaining payment before closing.`);
      }

      const claimed = await tx.purchase_orders.updateMany({
        where: { id, status: 'ISSUED' },
        data: { status: 'CLOSED', updated_at: new Date() }
      });
      if (claimed.count !== 1) throw httpError(409, 'This PO was changed by someone else. Reload and review it before closing.');
      return tx.purchase_orders.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    }, { isolationLevel: 'Serializable' });
    res.json(po);
  } catch (err) {
    if (err.code === 'P2034') return res.status(409).json({ error: 'Payment data changed while closing. Reload and review the PO again.' });
    next(err);
  }
}

// POST /marketing-po/:id/reopen — CLOSED → ISSUED so further payments can be requested.
async function reopenPurchaseOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await loadPo(req, id);
    if (existing.status !== 'CLOSED') return res.status(400).json({ error: 'Only closed POs can be reopened.' });
    const po = await prisma.purchase_orders.update({ where: { id }, data: { status: 'ISSUED', updated_at: new Date() }, include: DETAIL_INCLUDE });
    res.json(po);
  } catch (err) { next(err); }
}

// DELETE /marketing-po/:id — drafts only (the number is never reused because numbering takes the max).
async function deletePurchaseOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await loadPo(req, id);
    if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft POs can be deleted. Cancel issued POs instead.' });
    await prisma.purchase_orders.delete({ where: { id } });
    res.json({ message: 'Draft PO deleted.' });
  } catch (err) { next(err); }
}

// POST /marketing-po/netsuite-export { ids } — rows for the NetSuite PO import; marks POs EXPORTED.
async function exportForNetsuite(req, res, next) {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger);
    if (!ids.length) return res.status(400).json({ error: 'Select at least one PO to export.' });
    const pos = await prisma.purchase_orders.findMany({ where: { id: { in: ids }, status: { in: ['ISSUED', 'CLOSED'] }, ...scopeWhere(req) }, include: DETAIL_INCLUDE, orderBy: { id: 'asc' } });
    if (!pos.length) return res.status(400).json({ error: 'Only issued or closed POs can be exported.' });
    const missingCode = pos.filter(po => !po.vendor?.vendor_code);
    if (missingCode.length) return res.status(400).json({ error: `Vendor code is missing for ${missingCode.map(po => po.po_number).join(', ')}. Fill it in the vendor master first.` });
    const exportedAt = new Date();
    await prisma.purchase_orders.updateMany({ where: { id: { in: pos.map(po => po.id) }, netsuite_status: 'NOT_SENT' }, data: { netsuite_status: 'EXPORTED', netsuite_exported_at: exportedAt } });
    res.json({ exported_at: exportedAt, data: pos });
  } catch (err) { next(err); }
}

// PUT /marketing-po/:id/netsuite { netsuite_ref } — record the NetSuite document number.
async function setNetsuiteRef(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await loadPo(req, id);
    const ref = typeof req.body?.netsuite_ref === 'string' ? req.body.netsuite_ref.trim() : '';
    if (!['ISSUED', 'CLOSED'].includes(existing.status)) return res.status(400).json({ error: 'Only issued or closed POs can be linked to NetSuite.' });
    if (!ref || ref.length > 60) return res.status(400).json({ error: 'Enter the NetSuite PO number (max 60 characters).' });
    const po = await prisma.purchase_orders.update({ where: { id }, data: { netsuite_ref: ref, netsuite_status: 'SYNCED', netsuite_exported_at: existing.netsuite_exported_at || new Date(), updated_at: new Date() }, include: DETAIL_INCLUDE });
    res.json(po);
  } catch (err) { next(err); }
}

// GET /marketing-po/for-item/:itemId — issued POs that contain a plan item (used to link payments).
async function getPosForItem(req, res, next) {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (!Number.isInteger(itemId)) return res.json([]);
    const pos = await prisma.purchase_orders.findMany({
      where: { status: 'ISSUED', ...scopeWhere(req), lines: { some: { marketing_plan_item_id: itemId } } },
      select: { id: true, po_number: true, total: true, tax_type: true, tax_rate: true, vendor: { select: { vendor_name: true } }, lines: { where: { marketing_plan_item_id: itemId }, select: { amount: true, description: true } } },
      orderBy: { id: 'desc' }
    });
    res.json(pos);
  } catch (err) { next(err); }
}

// GET /marketing-po/vendors — light active-vendor list for the PO vendor picker.
async function getVendorOptions(req, res, next) {
  try {
    const vendors = await prisma.vendors.findMany({
      where: { status: { in: ACTIVE_VENDOR_STATUSES } },
      orderBy: { vendor_name: 'asc' },
      select: { id: true, vendor_code: true, vendor_name: true, top_days: true, m_company: { select: { name: true } } }
    });
    res.json(vendors.map(v => ({ id: v.id, name: v.vendor_name, vendor_code: v.vendor_code, top_days: v.top_days, company_name: v.m_company?.name || '' })));
  } catch (err) { next(err); }
}

module.exports = {
  getQueue, getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder,
  issuePurchaseOrder, cancelPurchaseOrder, closePurchaseOrder, reopenPurchaseOrder, deletePurchaseOrder,
  exportForNetsuite, setNetsuiteRef, getPosForItem, getVendorOptions,
  // exported for tests
  computeTotals, validatePayload, TAX_RATES, TAX_OPTIONS, taxTypeForLegacyRate
};
