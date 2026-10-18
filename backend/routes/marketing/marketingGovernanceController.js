const prisma = require('../../api/db');
const { applyCompanyScope } = require('./marketingHelper');
const { closingWindow, quarterConfigs } = require('./marketingGovernance');

const num = (v) => Number(v || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// GET /notifications — pengingat closing (M+1 s/d M+3) untuk bell Marketing
async function getNotifications(req, res, next) {
  try {
    const where = { status: 'APPROVED' };
    applyCompanyScope(where, req.companyScope);
    const plans = await prisma.marketing_plans.findMany({
      where,
      select: {
        id: true, title: true, status: true, event_start_date: true, event_end_date: true, start_date: true, end_date: true,
        company: { select: { name: true } },
        closing: { select: { status: true } }
      }
    });

    const items = plans
      .map(plan => ({ plan, window: closingWindow(plan, plan.closing?.status) }))
      .filter(({ window }) => window && ['OPEN', 'OVERDUE'].includes(window.state))
      .map(({ plan, window }) => ({
        id: plan.id,
        title: plan.title,
        subtitle: `${window.state === 'OVERDUE' ? 'Closing terlambat' : 'Closing jatuh tempo'} ${fmtDate(window.due_at)} · ${plan.company?.name || '-'}`,
        status: window.state === 'OVERDUE' ? 'Expired' : window.days_left <= 30 ? 'Critical' : 'Warning',
        daysLeft: window.days_left,
        link: '/dashboard/marketing'
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({ total: items.length, items });
  } catch (err) {
    next(err);
  }
}

// GET /reports/quarterly-alignment?company_id&fiscal_year — cap vs plan per kuartal per budget line
async function getQuarterlyAlignment(req, res, next) {
  try {
    const companyId = parseInt(req.query.company_id, 10);
    const fiscalYear = parseInt(req.query.fiscal_year, 10);
    if (!companyId || !fiscalYear) return res.status(400).json({ error: 'company_id and fiscal_year are required.' });
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(companyId)) {
      return res.status(403).json({ error: 'Company outside your access scope.' });
    }

    const [budgets, plans] = await Promise.all([
      prisma.m_marketing_budget.findMany({
        where: { company_id: companyId, fiscal_year: fiscalYear },
        include: { brand: { select: { name: true } }, lob: { select: { name: true } }, monthly_limits: true }
      }),
      prisma.marketing_plans.findMany({
        where: { company_id: companyId, fiscal_year: fiscalYear, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED'] } },
        include: { items: { include: { m_brand: { select: { name: true } }, m_line_business: { select: { name: true } } } } }
      })
    ]);

    const quarters = quarterConfigs(fiscalYear);
    const quarterOf = (month) => Math.ceil(month / 3);
    const emptyQuarters = () => quarters.map(q => ({ quarter: q.quarter, cap: 0, approved: 0, pending: 0, realized: 0 }));

    const lines = new Map();
    const lineFor = (brandId, lobId, brandName, lobName) => {
      const key = `${brandId || 0}-${lobId || 0}`;
      if (!lines.has(key)) {
        lines.set(key, {
          key, brand: brandName || 'Tanpa Brand', lob: lobName || 'Tanpa LOB',
          has_budget: false, is_locked: false, quarters: emptyQuarters()
        });
      }
      return lines.get(key);
    };

    for (const b of budgets) {
      const line = lineFor(b.brand_id, b.lob_id, b.brand?.name, b.lob?.name);
      line.has_budget = true;
      line.is_locked = b.is_locked;
      for (const ml of b.monthly_limits) line.quarters[quarterOf(ml.period_month) - 1].cap += num(ml.budget_limit);
    }

    const lateByQuarter = [0, 0, 0, 0];
    for (const plan of plans) {
      const planQuarters = new Set();
      for (const item of plan.items) {
        if (!item.period_month) continue;
        const q = lineFor(item.brand_id, item.lob_id, item.m_brand?.name, item.m_line_business?.name).quarters[quarterOf(item.period_month) - 1];
        if (plan.status === 'PENDING_APPROVAL') q.pending += num(item.budget_amount);
        else q.approved += num(item.budget_amount);
        q.realized += num(item.actual_amount);
        planQuarters.add(quarterOf(item.period_month));
      }
      if (plan.is_late_submission) planQuarters.forEach(q => { lateByQuarter[q - 1] += 1; });
    }

    const today = new Date().toISOString().split('T')[0];
    const rows = Array.from(lines.values()).sort((a, b) => `${a.brand}${a.lob}`.localeCompare(`${b.brand}${b.lob}`));
    const totals = quarters.map((q, i) => {
      const t = rows.reduce((acc, r) => {
        const rq = r.quarters[i];
        acc.cap += rq.cap; acc.approved += rq.approved; acc.pending += rq.pending; acc.realized += rq.realized;
        return acc;
      }, { cap: 0, approved: 0, pending: 0, realized: 0 });
      const planned = t.approved + t.pending;
      return {
        ...q,
        ...t,
        planned,
        remaining: t.cap - planned,
        utilization_pct: t.cap > 0 ? Math.round((planned / t.cap) * 1000) / 10 : null,
        late_plans: lateByQuarter[i],
        is_deadline_passed: today > q.deadline
      };
    });

    res.json({ company_id: companyId, fiscal_year: fiscalYear, quarters: totals, lines: rows });
  } catch (err) {
    next(err);
  }
}

// GET /reports/reconciliation?company_id&fiscal_year — Plan vs Realisasi per transaksi (plan) untuk Finance
async function getReconciliation(req, res, next) {
  try {
    const companyId = parseInt(req.query.company_id, 10);
    const fiscalYear = parseInt(req.query.fiscal_year, 10);
    if (!companyId || !fiscalYear) return res.status(400).json({ error: 'company_id and fiscal_year are required.' });
    if (!req.companyScope.all && !req.companyScope.companyIds.includes(companyId)) {
      return res.status(403).json({ error: 'Company outside your access scope.' });
    }

    const [budgets, plans] = await Promise.all([
      prisma.m_marketing_budget.findMany({
        where: { company_id: companyId, fiscal_year: fiscalYear },
        include: { brand: { select: { name: true } }, lob: { select: { name: true } }, monthly_limits: true }
      }),
      prisma.marketing_plans.findMany({
        where: { company_id: companyId, fiscal_year: fiscalYear, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED'] } },
        include: {
          creator: { select: { name: true } },
          closing: { select: { status: true, total_paid: true, total_final: true, variance: true, settlement_type: true, settled_at: true, settled_by: true, settlement_note: true, kpi_score: true } },
          items: {
            include: {
              m_coa: { select: { code: true, name: true } },
              vendors: { select: { vendor_name: true } },
              payment_requests: { orderBy: { created_at: 'asc' } }
            }
          }
        },
        orderBy: { event_start_date: 'asc' }
      })
    ]);

    const rows = plans.map(plan => {
      const payments = plan.items.flatMap(item => item.payment_requests.map(p => ({
        id: p.id, title: p.title, amount: num(p.amount), status: p.status, po_number: p.po_number, doc_url: p.doc_url,
        paid_at: p.paid_at, item: item.description || item.m_coa?.name, vendor: item.vendors?.vendor_name || null,
        finance_verified_at: p.finance_verified_at, finance_verified_by: p.finance_verified_by, finance_note: p.finance_note
      })));
      const active = payments.filter(p => p.status !== 'REJECTED');
      const paid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
      const closingApproved = plan.closing?.status === 'APPROVED';
      const finalCost = closingApproved ? num(plan.closing.total_final) : null;
      const verifiable = payments.filter(p => ['APPROVED', 'PAID'].includes(p.status));
      return {
        id: plan.id,
        title: plan.title,
        status: plan.status,
        creator: plan.creator?.name || '-',
        event_start_date: plan.event_start_date,
        event_end_date: plan.event_end_date,
        is_late_submission: plan.is_late_submission,
        budget: num(plan.total_budget),
        requested: active.reduce((s, p) => s + p.amount, 0),
        paid,
        final_cost: finalCost,
        realization: finalCost ?? paid, // biaya final kalau closing sudah disetujui, selain itu yang sudah dibayar
        variance: closingApproved ? num(plan.closing.variance) : null,
        settlement_type: closingApproved ? plan.closing.settlement_type : null,
        closing_status: plan.closing?.status || null,
        kpi_score: plan.closing?.kpi_score !== undefined && plan.closing?.kpi_score !== null ? num(plan.closing.kpi_score) : null,
        settled_at: plan.closing?.settled_at || null,
        settled_by: plan.closing?.settled_by || null,
        settlement_note: plan.closing?.settlement_note || null,
        needs_settlement: closingApproved && num(plan.closing.variance) !== 0 && !plan.closing.settled_at,
        verified_count: verifiable.filter(p => p.finance_verified_at).length,
        verifiable_count: verifiable.length,
        payments
      };
    });

    const committed = rows.filter(r => r.status !== 'PENDING_APPROVAL');
    const cap = budgets.reduce((s, b) => s + b.monthly_limits.reduce((m, ml) => m + num(ml.budget_limit), 0), 0);
    const plan = committed.reduce((s, r) => s + r.budget, 0);
    const realization = committed.reduce((s, r) => s + r.realization, 0);
    const summary = {
      cap,
      plan,
      pending_plan: rows.filter(r => r.status === 'PENDING_APPROVAL').reduce((s, r) => s + r.budget, 0),
      requested: rows.reduce((s, r) => s + r.requested, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      realization,
      plan_vs_realization: plan - realization,
      plan_utilization_pct: cap > 0 ? Math.round((plan / cap) * 1000) / 10 : null,
      realization_pct_of_plan: plan > 0 ? Math.round((realization / plan) * 1000) / 10 : null,
      total_excess: rows.filter(r => (r.variance ?? 0) < 0).reduce((s, r) => s + Math.abs(r.variance), 0),
      total_claim: rows.filter(r => (r.variance ?? 0) > 0).reduce((s, r) => s + r.variance, 0),
      pending_settlement: rows.filter(r => r.needs_settlement).length,
      unverified_payments: rows.reduce((s, r) => s + (r.verifiable_count - r.verified_count), 0),
      budgets: budgets.map(b => ({
        id: b.id, brand: b.brand?.name, lob: b.lob?.name, validation_status: b.validation_status,
        validated_by: b.validated_by, validated_at: b.validated_at, is_locked: b.is_locked
      }))
    };

    res.json({ company_id: companyId, fiscal_year: fiscalYear, summary, rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, getQuarterlyAlignment, getReconciliation };
