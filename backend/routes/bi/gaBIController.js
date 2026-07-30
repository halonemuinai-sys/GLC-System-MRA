const prisma = require('../../api/db');

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseFilters(query) {
  const { fiscal_year, company_id, company_master_id, date_from, date_to } = query;
  return {
    fiscalYear:      fiscal_year       ? parseInt(fiscal_year)       : new Date().getFullYear(),
    companyId:       company_id        ? parseInt(company_id)        : null,
    companyMasterId: company_master_id ? parseInt(company_master_id) : null,
    dateFrom:        date_from         ? new Date(date_from)         : null,
    dateTo:          date_to           ? new Date(date_to)           : null,
  };
}

function companyWhere(f) {
  if (f.companyId) return { company_id: f.companyId };
  if (f.companyMasterId) return { m_company: { company_master_id: f.companyMasterId } };
  return {};
}

// ── GET /api/bi/ga/overview ────────────────────────────────────────────────────
// Consolidated top-level KPIs untuk GA domain
async function getOverview(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const cWhere = companyWhere(f);
    const expWhere = { fiscal_year: f.fiscalYear, ...cWhere };

    const today = new Date();
    const in30 = new Date(); in30.setDate(today.getDate() + 30);
    const in60 = new Date(); in60.setDate(today.getDate() + 60);
    const in90 = new Date(); in90.setDate(today.getDate() + 90);

    const [
      assetCount, assetValue,
      activeAssetCount,
      expenseAgg,
      vendorCount, vendorActive,
      maintCost,
      insurancePremium, insuranceActive, insuranceExpiring,
      vehicleCount, vehicleActive,
      deviceRentalActive, deviceRentalValue,
      agreementCount, agreementActive, agreementExpiring,
      expiryAlerts
    ] = await Promise.all([
      prisma.assets.count({ where: cWhere }),
      prisma.assets.aggregate({ where: cWhere, _sum: { acquisition_cost: true } }),
      prisma.assets.count({ where: { ...cWhere, status_id: 1 } }),
      prisma.expense_budget.aggregate({ where: expWhere, _sum: { budget_amount: true, actual_amount: true } }),
      prisma.vendors.count(),
      prisma.vendors.count({ where: { status: 'Active' } }),
      prisma.maintenances.aggregate({ _sum: { total_cost: true } }),
      prisma.insurances.aggregate({ _sum: { premium_idr: true } }),
      prisma.insurances.count({ where: { status: 'Active' } }),
      prisma.insurances.count({ where: { status: 'Active', end_date: { gte: today, lte: in60 } } }),
      prisma.vehicles.count({ where: cWhere }),
      prisma.vehicles.count({ where: { ...cWhere, status: 'Aktif' } }),
      prisma.device_rentals.count({ where: { status: 'Active', NOT: { user_id: null } } }),
      prisma.device_rentals.aggregate({ where: { status: 'Active' }, _sum: { price: true } }),
      prisma.documents.count({ where: { doc_subtype: 'agreement' } }),
      prisma.documents.count({ where: { doc_subtype: 'agreement', status: 'Active' } }),
      prisma.documents.count({ where: { doc_subtype: 'agreement', status: 'Active', valid_until: { gte: today, lte: in60 } } }),
      Promise.all([
        prisma.vehicles.count({ where: { ...cWhere, tax_date: { gte: today, lte: in30 } } }),
        prisma.maintenances.count({ where: { expired_date: { gte: today, lte: in30 } } }),
        prisma.vendors.count({ where: { contract_end: { gte: today, lte: in30 } } }),
        prisma.insurances.count({ where: { end_date: { gte: today, lte: in30 } } }),
        prisma.documents.count({ where: { valid_until: { gte: today, lte: in30 } } }),
      ])
    ]);

    const totalBudget  = Number(expenseAgg._sum.budget_amount || 0);
    const totalActual  = Number(expenseAgg._sum.actual_amount || 0);
    const burnRate     = totalBudget > 0 ? +((totalActual / totalBudget) * 100).toFixed(1) : null;
    const assetUtil    = assetCount > 0 ? +((activeAssetCount / assetCount) * 100).toFixed(1) : null;
    const vendorActive_pct = vendorCount > 0 ? +((vendorActive / vendorCount) * 100).toFixed(1) : null;

    const [exVehicle, exMaint, exVendor, exInsurance, exDoc] = expiryAlerts;

    res.json({
      as_of: today.toISOString(),
      fiscal_year: f.fiscalYear,
      kpi: {
        assets: {
          total: assetCount,
          total_value: Number(assetValue._sum.acquisition_cost || 0),
          active: activeAssetCount,
          utilization_pct: assetUtil,
        },
        expense: {
          total_budget: totalBudget,
          total_actual: totalActual,
          variance: totalBudget - totalActual,
          burn_rate_pct: burnRate,
        },
        vendors: {
          total: vendorCount,
          active: vendorActive,
          active_rate_pct: vendorActive_pct,
        },
        maintenance: {
          total_cost: Number(maintCost._sum.total_cost || 0),
        },
        insurance: {
          total_premium_idr: Number(insurancePremium._sum.premium_idr || 0),
          active: insuranceActive,
          expiring_60d: insuranceExpiring,
        },
        vehicles: {
          total: vehicleCount,
          active: vehicleActive,
        },
        device_rentals: {
          assigned: deviceRentalActive,
          total_value: Number(deviceRentalValue._sum.price || 0),
        },
        agreements: {
          total: agreementCount,
          active: agreementActive,
          expiring_60d: agreementExpiring,
        },
      },
      expiry_alerts_30d: {
        vehicles:    exVehicle,
        maintenances: exMaint,
        vendors:     exVendor,
        insurances:  exInsurance,
        documents:   exDoc,
        total:       exVehicle + exMaint + exVendor + exInsurance + exDoc,
      },
    });
  } catch (err) { next(err); }
}

// ── GET /api/bi/ga/expenses ────────────────────────────────────────────────────
// Budget vs aktual per bulan + per COA + per perusahaan
async function getExpenses(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const where = { fiscal_year: f.fiscalYear, ...companyWhere(f) };

    const rows = await prisma.expense_budget.findMany({
      where,
      include: { m_coa: true, m_company: { select: { id: true, name: true, code: true } } }
    });

    let totalBudget = 0, totalActual = 0;
    const byMonth   = {};
    const byCoa     = {};
    const byCompany = {};

    rows.forEach(r => {
      const budget = Number(r.budget_amount) || 0;
      const actual = Number(r.actual_amount) || 0;
      totalBudget += budget;
      totalActual += actual;

      if (!byMonth[r.period_month]) byMonth[r.period_month] = { budget: 0, actual: 0 };
      byMonth[r.period_month].budget += budget;
      byMonth[r.period_month].actual += actual;

      const ck = r.coa_id;
      if (!byCoa[ck]) byCoa[ck] = { coa_id: ck, coa_code: r.m_coa?.code, coa_name: r.m_coa?.name, budget: 0, actual: 0 };
      byCoa[ck].budget += budget;
      byCoa[ck].actual += actual;

      if (r.company_id) {
        const c = r.m_company;
        if (!byCompany[r.company_id]) byCompany[r.company_id] = { company_id: r.company_id, company_name: c?.name, company_code: c?.code, budget: 0, actual: 0 };
        byCompany[r.company_id].budget += budget;
        byCompany[r.company_id].actual += actual;
      }
    });

    const monthly_trend = MONTH_LABELS.map((label, i) => {
      const m = byMonth[i + 1] || { budget: 0, actual: 0 };
      return {
        month: i + 1,
        month_label: label,
        budget: m.budget,
        actual: m.actual,
        variance: m.budget - m.actual,
        burn_rate_pct: m.budget > 0 ? +((m.actual / m.budget) * 100).toFixed(1) : null,
      };
    });

    const by_coa = Object.values(byCoa)
      .map(c => ({ ...c, variance: c.budget - c.actual, burn_rate_pct: c.budget > 0 ? +((c.actual / c.budget) * 100).toFixed(1) : null }))
      .sort((a, b) => b.budget - a.budget);

    const by_company = Object.values(byCompany)
      .map(c => ({ ...c, variance: c.budget - c.actual, burn_rate_pct: c.budget > 0 ? +((c.actual / c.budget) * 100).toFixed(1) : null }))
      .sort((a, b) => b.actual - a.actual);

    res.json({
      fiscal_year: f.fiscalYear,
      summary: {
        total_budget: totalBudget,
        total_actual: totalActual,
        variance: totalBudget - totalActual,
        burn_rate_pct: totalBudget > 0 ? +((totalActual / totalBudget) * 100).toFixed(1) : null,
      },
      monthly_trend,
      by_coa,
      by_company,
    });
  } catch (err) { next(err); }
}

// ── GET /api/bi/ga/assets ──────────────────────────────────────────────────────
// Asset breakdown by category, condition, status, company
async function getAssets(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const where = companyWhere(f);

    const [assets, categories, conditions, statuses] = await Promise.all([
      prisma.assets.findMany({
        where,
        select: {
          company_id: true,
          asset_category_id: true,
          condition_id: true,
          status_id: true,
          acquisition_cost: true,
          acquisition_date: true,
          useful_life_months: true,
          m_company: { select: { id: true, name: true, code: true } },
        }
      }),
      prisma.m_asset_category.findMany(),
      prisma.m_condition.findMany(),
      prisma.m_status.findMany(),
    ]);

    const catMap   = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const condMap  = Object.fromEntries(conditions.map(c => [c.id, c.name]));
    const statMap  = Object.fromEntries(statuses.map(s => [s.id, s.name]));

    const byCategory = {};
    const byCondition = {};
    const byStatus   = {};
    const byCompany  = {};
    let totalValue = 0;

    assets.forEach(a => {
      const val = Number(a.acquisition_cost) || 0;
      totalValue += val;

      const catName  = catMap[a.asset_category_id]  || 'Uncategorized';
      const condName = condMap[a.condition_id]  || 'Unknown';
      const statName = statMap[a.status_id]     || 'Unknown';

      if (!byCategory[catName])  byCategory[catName]  = { name: catName,  count: 0, total_value: 0 };
      byCategory[catName].count++;
      byCategory[catName].total_value += val;

      if (!byCondition[condName]) byCondition[condName] = { name: condName, count: 0, total_value: 0 };
      byCondition[condName].count++;
      byCondition[condName].total_value += val;

      if (!byStatus[statName])   byStatus[statName]   = { name: statName,  count: 0, total_value: 0 };
      byStatus[statName].count++;
      byStatus[statName].total_value += val;

      if (a.company_id) {
        const cname = a.m_company?.name || 'Unknown';
        const ccode = a.m_company?.code;
        if (!byCompany[a.company_id]) byCompany[a.company_id] = { company_id: a.company_id, company_name: cname, company_code: ccode, count: 0, active_count: 0, total_value: 0 };
        byCompany[a.company_id].count++;
        byCompany[a.company_id].total_value += val;
        if (a.status_id === 1) byCompany[a.company_id].active_count++;
      }
    });

    const activeCount = assets.filter(a => a.status_id === 1).length;

    res.json({
      summary: {
        total: assets.length,
        total_value: totalValue,
        active_count: activeCount,
        utilization_pct: assets.length > 0 ? +((activeCount / assets.length) * 100).toFixed(1) : null,
      },
      by_category:  Object.values(byCategory).sort((a, b) => b.total_value - a.total_value),
      by_condition: Object.values(byCondition).sort((a, b) => b.count - a.count),
      by_status:    Object.values(byStatus).sort((a, b) => b.count - a.count),
      by_company:   Object.values(byCompany).map(c => ({
        ...c,
        utilization_pct: c.count > 0 ? +((c.active_count / c.count) * 100).toFixed(1) : null
      })).sort((a, b) => b.total_value - a.total_value),
    });
  } catch (err) { next(err); }
}

// ── GET /api/bi/ga/vendors ─────────────────────────────────────────────────────
// Vendor status distribution + contract values + rating
async function getVendors(req, res, next) {
  try {
    const vendors = await prisma.vendors.findMany({
      select: {
        id: true, vendor_name: true, status: true, contract_value: true,
        contract_start: true, contract_end: true, rating: true,
        m_vendor_category: { select: { name: true } }
      }
    });

    const today = new Date();
    const in30  = new Date(); in30.setDate(today.getDate() + 30);
    const in90  = new Date(); in90.setDate(today.getDate() + 90);

    const byStatus   = {};
    const byCategory = {};
    let totalContractValue = 0;
    let active = 0, expiring30 = 0, expiring90 = 0, expired = 0;

    vendors.forEach(v => {
      const val = Number(v.contract_value) || 0;
      totalContractValue += val;

      const sKey = v.status || 'Unknown';
      if (!byStatus[sKey]) byStatus[sKey] = { status: sKey, count: 0, total_value: 0 };
      byStatus[sKey].count++;
      byStatus[sKey].total_value += val;

      const cat = v.m_vendor_category?.name || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { category: cat, count: 0, total_value: 0 };
      byCategory[cat].count++;
      byCategory[cat].total_value += val;

      if (['Active', 'Aktif'].includes(v.status)) active++;

      if (v.contract_end) {
        const end = new Date(v.contract_end);
        if (end < today) expired++;
        else if (end <= in30) expiring30++;
        else if (end <= in90) expiring90++;
      }
    });

    const ratings = vendors.filter(v => v.rating != null).map(v => Number(v.rating));
    const avg_rating = ratings.length > 0 ? +(ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2) : null;

    res.json({
      summary: {
        total: vendors.length,
        active,
        active_rate_pct: vendors.length > 0 ? +((active / vendors.length) * 100).toFixed(1) : null,
        total_contract_value: totalContractValue,
        avg_rating,
        expired_contracts: expired,
        expiring_30d: expiring30,
        expiring_90d: expiring90,
      },
      by_status:   Object.values(byStatus).sort((a, b) => b.count - a.count),
      by_category: Object.values(byCategory).sort((a, b) => b.total_value - a.total_value),
    });
  } catch (err) { next(err); }
}

// ── GET /api/bi/ga/maintenance ─────────────────────────────────────────────────
// Maintenance cost trend per bulan + breakdown by service type
async function getMaintenance(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const where = {};
    if (f.dateFrom || f.dateTo) {
      where.created_at = {};
      if (f.dateFrom) where.created_at.gte = f.dateFrom;
      if (f.dateTo)   where.created_at.lte = f.dateTo;
    }

    const rows = await prisma.maintenances.findMany({
      where,
      select: { created_at: true, total_cost: true, est_cost: true, service_type: true, expired_date: true }
    });

    const currentYear = f.fiscalYear;
    const byMonth    = Array(12).fill(null).map((_, i) => ({ month: i + 1, month_label: MONTH_LABELS[i], count: 0, total_cost: 0, est_cost: 0 }));
    const byType     = {};
    let grandTotal   = 0;

    const today = new Date();
    let healthy = 0, overdue = 0;

    rows.forEach(r => {
      const cost    = Number(r.total_cost) || 0;
      const est     = Number(r.est_cost)   || 0;
      grandTotal   += cost;

      if (r.created_at) {
        const d = new Date(r.created_at);
        if (d.getFullYear() === currentYear) {
          byMonth[d.getMonth()].count++;
          byMonth[d.getMonth()].total_cost += cost;
          byMonth[d.getMonth()].est_cost   += est;
        }
      }

      const typeKey = r.service_type || 'Lainnya';
      if (!byType[typeKey]) byType[typeKey] = { service_type: typeKey, count: 0, total_cost: 0 };
      byType[typeKey].count++;
      byType[typeKey].total_cost += cost;

      if (r.expired_date) {
        if (new Date(r.expired_date) >= today) healthy++;
        else overdue++;
      } else {
        healthy++;
      }
    });

    res.json({
      fiscal_year: f.fiscalYear,
      summary: {
        total_records: rows.length,
        total_cost: grandTotal,
        healthy,
        overdue,
        health_rate_pct: rows.length > 0 ? +((healthy / rows.length) * 100).toFixed(1) : null,
      },
      monthly_trend: byMonth,
      by_service_type: Object.values(byType).sort((a, b) => b.total_cost - a.total_cost),
    });
  } catch (err) { next(err); }
}

// ── GET /api/bi/ga/insurance ───────────────────────────────────────────────────
// Insurance premium breakdown + expiry status
async function getInsurance(req, res, next) {
  try {
    const rows = await prisma.insurances.findMany({
      select: { insurance_type: true, insurance_company: true, status: true, premium_idr: true, coverage_idr: true, end_date: true }
    });

    const today = new Date();
    const in60  = new Date(); in60.setDate(today.getDate() + 60);
    const in90  = new Date(); in90.setDate(today.getDate() + 90);

    const byType    = {};
    const byCompany = {};
    const byStatus  = {};
    let totalPremium = 0, totalCoverage = 0;
    let expiring60 = 0, expiring90 = 0, expired = 0;

    rows.forEach(r => {
      const prem = Number(r.premium_idr)  || 0;
      const cov  = Number(r.coverage_idr) || 0;
      totalPremium  += prem;
      totalCoverage += cov;

      const tKey = r.insurance_type || 'Other';
      if (!byType[tKey]) byType[tKey] = { type: tKey, count: 0, total_premium: 0, total_coverage: 0 };
      byType[tKey].count++;
      byType[tKey].total_premium  += prem;
      byType[tKey].total_coverage += cov;

      const cKey = r.insurance_company || 'Unknown';
      if (!byCompany[cKey]) byCompany[cKey] = { company: cKey, count: 0, total_premium: 0 };
      byCompany[cKey].count++;
      byCompany[cKey].total_premium += prem;

      const sKey = r.status || 'Unknown';
      if (!byStatus[sKey]) byStatus[sKey] = { status: sKey, count: 0, total_premium: 0 };
      byStatus[sKey].count++;
      byStatus[sKey].total_premium += prem;

      if (r.end_date) {
        const end = new Date(r.end_date);
        if (end < today) expired++;
        else if (end <= in60) expiring60++;
        else if (end <= in90) expiring90++;
      }
    });

    res.json({
      summary: {
        total: rows.length,
        total_premium_idr: totalPremium,
        total_coverage_idr: totalCoverage,
        coverage_ratio: totalPremium > 0 ? +((totalCoverage / totalPremium)).toFixed(1) : null,
        active: byStatus['Active']?.count || 0,
        expired,
        expiring_60d: expiring60,
        expiring_90d: expiring90,
      },
      by_type:    Object.values(byType).sort((a, b) => b.total_premium - a.total_premium),
      by_company: Object.values(byCompany).sort((a, b) => b.total_premium - a.total_premium),
      by_status:  Object.values(byStatus).sort((a, b) => b.count - a.count),
    });
  } catch (err) { next(err); }
}

// ── GET /api/bi/ga/scorecard ───────────────────────────────────────────────────
// 7 KPI benchmark scorecard (traffic light + per company)
async function getScorecard(req, res, next) {
  try {
    const f = parseFilters(req.query);
    const cWhere = companyWhere(f);

    const today = new Date();

    const [assets, expenseRows, vendors, maintenances, insurances, vehicles, soSessions] = await Promise.all([
      prisma.assets.findMany({ where: cWhere, select: { company_id: true, status_id: true, acquisition_cost: true, m_company: { select: { name: true, code: true } } } }),
      prisma.expense_budget.findMany({ where: { fiscal_year: f.fiscalYear, ...cWhere }, select: { company_id: true, budget_amount: true, actual_amount: true, m_company: { select: { name: true } } } }),
      prisma.vendors.findMany({ select: { status: true } }),
      prisma.maintenances.findMany({ select: { expired_date: true } }),
      prisma.insurances.findMany({ select: { vehicle_id: true, end_date: true, status: true } }),
      prisma.vehicles.findMany({ where: cWhere, select: { id: true, tax_date: true } }),
      prisma.stock_opname_sessions.findMany({ select: { found_count: true, missing_count: true } })
    ]);

    const totalAssets      = assets.length;
    const activeAssets     = assets.filter(a => a.status_id === 1).length;
    const assetUtilPct     = totalAssets > 0 ? +((activeAssets / totalAssets) * 100).toFixed(1) : null;

    const totalBudget      = expenseRows.reduce((s, r) => s + (Number(r.budget_amount) || 0), 0);
    const totalActual      = expenseRows.reduce((s, r) => s + (Number(r.actual_amount) || 0), 0);
    const budgetAchievePct = totalBudget > 0 ? +((totalActual / totalBudget) * 100).toFixed(1) : null;

    const activeVendors    = vendors.filter(v => ['Active', 'Aktif'].includes(v.status)).length;
    const vendorActivePct  = vendors.length > 0 ? +((activeVendors / vendors.length) * 100).toFixed(1) : null;

    const healthyMaint     = maintenances.filter(m => !m.expired_date || new Date(m.expired_date) >= today).length;
    const maintHealthPct   = maintenances.length > 0 ? +((healthyMaint / maintenances.length) * 100).toFixed(1) : null;

    const insuredVehicleIds = new Set(
      insurances.filter(i => i.vehicle_id && i.status === 'Active' && (!i.end_date || new Date(i.end_date) >= today)).map(i => i.vehicle_id)
    );
    const insuranceCovPct  = vehicles.length > 0 ? +((vehicles.filter(v => insuredVehicleIds.has(v.id)).length / vehicles.length) * 100).toFixed(1) : null;

    const taxCompliant     = vehicles.filter(v => v.tax_date && new Date(v.tax_date) >= today).length;
    const taxCompliancePct = vehicles.length > 0 ? +((taxCompliant / vehicles.length) * 100).toFixed(1) : null;

    const totalFound   = soSessions.reduce((s, r) => s + (r.found_count || 0), 0);
    const totalMissing = soSessions.reduce((s, r) => s + (r.missing_count || 0), 0);
    const soAccuracyPct = (totalFound + totalMissing) > 0 ? +((totalFound / (totalFound + totalMissing)) * 100).toFixed(1) : null;

    function light(actual, target, lowerIsBetter = false) {
      if (actual === null || actual === undefined) return 'gray';
      if (lowerIsBetter) {
        if (actual <= target) return 'green';
        if (actual <= target * 1.15) return 'yellow';
        return 'red';
      }
      if (actual >= target) return 'green';
      if (actual >= target * 0.75) return 'yellow';
      return 'red';
    }

    const metrics = [
      { key: 'asset_utilization',      label: 'Asset Utilization Rate',   actual: assetUtilPct,     target: 80,  unit: '%', lower_is_better: false },
      { key: 'budget_achievement',     label: 'Budget Achievement',        actual: budgetAchievePct, target: 100, unit: '%', lower_is_better: true  },
      { key: 'vendor_active_rate',     label: 'Vendor Active Rate',        actual: vendorActivePct,  target: 90,  unit: '%', lower_is_better: false },
      { key: 'maintenance_health',     label: 'Maintenance Health Rate',   actual: maintHealthPct,   target: 90,  unit: '%', lower_is_better: false },
      { key: 'insurance_coverage',     label: 'Insurance Coverage',        actual: insuranceCovPct,  target: 90,  unit: '%', lower_is_better: false },
      { key: 'vehicle_tax_compliance', label: 'Vehicle Tax Compliance',    actual: taxCompliancePct, target: 90,  unit: '%', lower_is_better: false },
      { key: 'stock_opname_accuracy',  label: 'Stock Opname Accuracy',     actual: soAccuracyPct,    target: 90,  unit: '%', lower_is_better: false },
    ].map(m => ({ ...m, traffic_light: light(m.actual, m.target, m.lower_is_better) }));

    const overall_green  = metrics.filter(m => m.traffic_light === 'green').length;
    const overall_yellow = metrics.filter(m => m.traffic_light === 'yellow').length;
    const overall_red    = metrics.filter(m => m.traffic_light === 'red').length;

    res.json({
      fiscal_year: f.fiscalYear,
      summary: {
        green: overall_green,
        yellow: overall_yellow,
        red: overall_red,
        score_pct: metrics.length > 0 ? +((overall_green / metrics.length) * 100).toFixed(1) : null,
      },
      metrics,
    });
  } catch (err) { next(err); }
}

module.exports = { getOverview, getExpenses, getAssets, getVendors, getMaintenance, getInsurance, getScorecard };
