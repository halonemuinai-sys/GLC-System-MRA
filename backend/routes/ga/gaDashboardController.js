const prisma = require('../../api/db');

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function computeDaysStatus(date) {
  if (!date) return { status: null, daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((target - today) / (1000 * 60 * 60 * 24));
  let status;
  if (daysLeft < 0) status = 'Expired';
  else if (daysLeft < 30) status = 'Critical';
  else if (daysLeft < 90) status = 'Warning';
  else status = null;
  return { status, daysLeft };
}

function trafficLight(actual, target, lowerIsBetter = false) {
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

// GET /dashboard-stats
async function getDashboardStats(req, res, next) {
  try {
    const today = new Date();
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(today.getDate() + 60);

    const [
      totalAssets,
      assetCostSum,
      goodAssets,
      badAssets,
      categoryGroup,
      categoriesList,
      maintenanceGroup,
      totalDeviceRentals,
      activeDeviceRentals,
      availableDeviceRentals,
      expiringSoonLeases,
      returnedThisMonth,
      deviceRentalCostSum,
      totalDeviceRentalsLastMonth,
      deviceRentalCostLastMonthAgg,
      activeDeviceRentalsLastMonth,
      deviceTypeGroup,
      totalVehicles,
      activeVehicles,
      inServiceVehicles,
      expiringTaxVehicles,
      vehicleTypeGroup,
      vehicleInsuranceSum,
      totalInsurances,
      totalInsurancePremiumAgg,
      activeInsurances,
      expiringInsurances,
      totalVendors,
      activeVendors,
      inactiveVendors,
      maintenanceCostSum,
      pendingApprovals,
      conditionGroup,
      conditionsList,
      statusGroup,
      statusesList,
      insurerGroup,
      policyTypeGroup,
      totalAgreements,
      activeAgreements,
      expiredAgreements,
      expiringAgreements,
      agreementValueSum
    ] = await Promise.all([
      prisma.assets.count(),
      prisma.assets.aggregate({ _sum: { acquisition_cost: true } }),
      prisma.assets.count({ where: { condition_id: 1 } }),
      prisma.assets.count({ where: { NOT: { condition_id: 1 } } }),
      prisma.assets.groupBy({ by: ['asset_category_id'], _count: { id: true }, _sum: { acquisition_cost: true } }),
      prisma.m_asset_category.findMany(),
      prisma.maintenances.findMany({ select: { created_at: true, total_cost: true } }),
      prisma.device_rentals.count({ where: { status: 'Active' } }),
      prisma.device_rentals.count({ where: { status: 'Active', NOT: { user_id: null } } }),
      prisma.device_rentals.count({ where: { status: 'Active', user_id: null } }),
      prisma.device_rentals.count({ where: { status: 'Active', end_rent: { gte: today, lte: thirtyDaysFromNow } } }),
      prisma.device_rentals.count({ where: { status: 'Inactive', end_rent: { gte: firstDayOfMonth, lte: today } } }),
      prisma.device_rentals.aggregate({ where: { status: 'Active' }, _sum: { price: true } }),
      prisma.device_rentals.count({
        where: {
          OR: [
            { status: 'Active' },
            { status: 'Inactive', end_rent: { gte: prevMonthStart } }
          ],
          start_rent: { lte: prevMonthEnd }
        }
      }),
      prisma.device_rentals.aggregate({
        where: {
          OR: [
            { status: 'Active' },
            { status: 'Inactive', end_rent: { gte: prevMonthStart } }
          ],
          start_rent: { lte: prevMonthEnd }
        },
        _sum: { price: true }
      }),
      prisma.device_rentals.count({
        where: {
          OR: [
            { status: 'Active' },
            { status: 'Inactive', end_rent: { gte: prevMonthStart } }
          ],
          start_rent: { lte: prevMonthEnd },
          NOT: { user_id: null }
        }
      }),
      prisma.device_rentals.groupBy({ where: { status: 'Active' }, by: ['device_type'], _count: { id: true }, _sum: { price: true } }),
      prisma.vehicles.count(),
      prisma.vehicles.count({ where: { status: 'Aktif' } }),
      prisma.vehicles.count({ where: { status: 'Dalam Service' } }),
      prisma.vehicles.count({ where: { tax_date: { gte: today, lte: thirtyDaysFromNow } } }),
      prisma.vehicles.groupBy({ by: ['vehicle_type'], _count: { id: true } }),
      prisma.insurances.aggregate({ _sum: { premium_idr: true, coverage_idr: true } }),
      prisma.insurances.count(),
      prisma.insurances.aggregate({ _sum: { premium_idr: true } }),
      prisma.insurances.count({ where: { status: 'Active' } }),
      prisma.insurances.count({ where: { status: 'Active', end_date: { gte: today, lte: sixtyDaysFromNow } } }),
      prisma.vendors.count(),
      prisma.vendors.count({ where: { status: 'Active' } }),
      prisma.vendors.count({ where: { NOT: { status: 'Active' } } }),
      prisma.maintenances.aggregate({ _sum: { total_cost: true } }),
      prisma.approval_requests.count({ where: { status: 'PENDING' } }),
      prisma.assets.groupBy({ by: ['condition_id'], _count: { id: true } }),
      prisma.m_condition.findMany(),
      prisma.assets.groupBy({ by: ['status_id'], _count: { id: true } }),
      prisma.m_status.findMany(),
      prisma.insurances.groupBy({ by: ['insurance_company'], _count: { id: true }, _sum: { premium_idr: true } }),
      prisma.insurances.groupBy({ by: ['insurance_type'], _count: { id: true }, _sum: { premium_idr: true } }),
      prisma.documents.count({ where: { doc_subtype: 'agreement' } }),
      prisma.documents.count({ where: { doc_subtype: 'agreement', status: 'Active' } }),
      prisma.documents.count({ where: { doc_subtype: 'agreement', status: 'Expired' } }),
      prisma.documents.count({
        where: {
          doc_subtype: 'agreement',
          status: 'Active',
          valid_until: { gte: today, lte: sixtyDaysFromNow }
        }
      }),
      prisma.documents.aggregate({ where: { doc_subtype: 'agreement' }, _sum: { amount: true } })
    ]);

    const categoryBreakdown = categoryGroup.map(cg => {
      const cat = categoriesList.find(c => c.id === cg.asset_category_id);
      return {
        name: cat ? cat.name : 'Uncategorized',
        count: cg._count.id,
        value: Number(cg._sum.acquisition_cost || 0)
      };
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMaintenanceCost = Array(12).fill(0).map((_, idx) => ({
      month: months[idx],
      cost: 0
    }));

    maintenanceGroup.forEach(m => {
      if (m.created_at) {
        const date = new Date(m.created_at);
        if (date.getFullYear() === today.getFullYear()) {
          const monthIdx = date.getMonth();
          monthlyMaintenanceCost[monthIdx].cost += Number(m.total_cost || 0);
        }
      }
    });

    const totalDeviceRentalValue = Number(deviceRentalCostSum._sum.price || 0);
    const deviceRentalCostLastMonth = Number(deviceRentalCostLastMonthAgg._sum.price || 0);

    const deviceRentalsDiff = totalDeviceRentals - totalDeviceRentalsLastMonth;
    const deviceRentalValueDiff = totalDeviceRentalValue - deviceRentalCostLastMonth;
    const activeDeviceRentalsDiff = activeDeviceRentals - activeDeviceRentalsLastMonth;

    const deviceTypeBreakdown = deviceTypeGroup.map(dg => ({
      type: dg.device_type || 'Lainnya',
      count: dg._count.id,
      value: Number(dg._sum.price || 0)
    }));

    const vehicleTypeBreakdown = vehicleTypeGroup.map(vg => ({
      type: vg.vehicle_type || 'Lainnya',
      count: vg._count.id
    }));

    const assetConditionBreakdown = conditionGroup.map(cg => {
      const cond = conditionsList.find(c => c.id === cg.condition_id);
      return {
        name: cond ? cond.name : 'Unspecified',
        count: cg._count.id
      };
    });

    const assetStatusBreakdown = statusGroup.map(sg => {
      const st = statusesList.find(s => s.id === sg.status_id);
      return {
        name: st ? st.name : 'Unspecified',
        count: sg._count.id
      };
    });

    const normalizeInsurerName = (name) => {
      if (!name) return 'Unknown';
      let norm = name.trim().replace(/\s+/g, ' ');
      norm = norm.replace(/[,.]?\s*Tbk\.?$/i, '');
      norm = norm.replace(/^PT\.?\s*/i, 'PT ');
      
      const lower = norm.toLowerCase();
      if (lower.includes('multi artha guna')) {
        return 'PT Asuransi Multi Artha Guna Tbk';
      }
      if (lower.includes('bina dana arta')) {
        return 'PT Asuransi Bina Dana Arta Tbk';
      }
      if (lower.includes('avrist')) {
        return 'PT Avrist General Insurance';
      }
      if (lower.includes('tokio marine')) {
        return 'PT Asuransi Tokio Marine Indonesia';
      }
      if (lower.includes('sunday insurance')) {
        return 'PT Sunday Insurance Indonesia';
      }
      return norm;
    };

    const insurerMap = {};
    insurerGroup.forEach(ig => {
      const rawName = ig.insurance_company || 'Unknown';
      const normName = normalizeInsurerName(rawName);
      if (!insurerMap[normName]) {
        insurerMap[normName] = { name: normName, count: 0, premium: 0 };
      }
      insurerMap[normName].count += ig._count.id;
      insurerMap[normName].premium += Number(ig._sum.premium_idr || 0);
    });

    const insurerDistribution = Object.values(insurerMap)
      .sort((a, b) => b.count - a.count);

    const policyTypeBreakdown = policyTypeGroup.map(ptg => ({
      name: ptg.insurance_type || 'Other',
      count: ptg._count.id,
      premium: Number(ptg._sum.premium_idr || 0)
    })).sort((a, b) => b.count - a.count);

    res.json({
      totalAssets,
      totalAssetValue: assetCostSum._sum.acquisition_cost || 0,
      goodAssets,
      badAssets,
      categoryBreakdown,
      monthlyMaintenanceCost,
      totalDeviceRentals,
      activeDeviceRentals,
      availableDeviceRentals,
      expiringSoonLeases,
      returnedThisMonth,
      totalDeviceRentalValue,
      deviceRentalsDiff,
      deviceRentalValueDiff,
      activeDeviceRentalsDiff,
      deviceTypeBreakdown,
      totalVehicles,
      activeVehicles,
      inServiceVehicles,
      expiringTaxVehicles,
      totalVehicleValue: vehicleInsuranceSum._sum.coverage_idr || 0,
      totalVehiclePremium: vehicleInsuranceSum._sum.premium_idr || 0,
      vehicleTypeBreakdown,
      totalInsurances,
      totalInsurancePremium: totalInsurancePremiumAgg._sum.premium_idr || 0,
      activeInsurances,
      expiringInsurances,
      totalVendors,
      activeVendors,
      inactiveVendors,
      totalMaintenanceCost: maintenanceCostSum._sum.total_cost || 0,
      pendingApprovals,
      assetConditionBreakdown,
      assetStatusBreakdown,
      insurerDistribution,
      policyTypeBreakdown,
      totalAgreements,
      activeAgreements,
      expiredAgreements,
      expiringAgreements,
      totalAgreementValue: agreementValueSum._sum.amount || 0
    });
  } catch (err) {
    next(err);
  }
}

// GET /notifications
async function getNotifications(req, res, next) {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const [vehicles, maintenances, vendors, insurances, documents] = await Promise.all([
      prisma.vehicles.findMany({ where: { tax_date: { not: null, lt: ninetyDaysFromNow } } }),
      prisma.maintenances.findMany({ where: { expired_date: { not: null, lt: ninetyDaysFromNow } } }),
      prisma.vendors.findMany({ where: { contract_end: { not: null, lt: ninetyDaysFromNow } } }),
      prisma.insurances.findMany({ where: { end_date: { not: null, lt: ninetyDaysFromNow } } }),
      prisma.documents.findMany({ where: { valid_until: { not: null, lt: ninetyDaysFromNow } } })
    ]);

    const items = [];

    vehicles.forEach(v => {
      const { status, daysLeft } = computeDaysStatus(v.tax_date);
      if (status) items.push({ id: `vehicle-${v.id}`, title: v.plate_number, subtitle: `Pajak Kendaraan — ${v.brand_model || v.vehicle_type || ''}`.trim(), date: v.tax_date, daysLeft, status, link: `/dashboard/vehicles?search=${encodeURIComponent(v.plate_number)}` });
    });
    maintenances.forEach(m => {
      const { status, daysLeft } = computeDaysStatus(m.expired_date);
      if (status) items.push({ id: `maintenance-${m.id}`, title: m.asset_name || m.detail || 'Maintenance', subtitle: `Maintenance — ${m.service_type || 'Servis'}`, date: m.expired_date, daysLeft, status, link: `/dashboard/maintenances?search=${encodeURIComponent(m.asset_name || m.detail || 'Maintenance')}` });
    });
    vendors.forEach(v => {
      const { status, daysLeft } = computeDaysStatus(v.contract_end);
      if (status) items.push({ id: `vendor-${v.id}`, title: v.vendor_name, subtitle: 'Kontrak Vendor', date: v.contract_end, daysLeft, status, link: `/dashboard/vendors?search=${encodeURIComponent(v.vendor_name)}` });
    });
    insurances.forEach(i => {
      const { status, daysLeft } = computeDaysStatus(i.end_date);
      if (status) items.push({ id: `insurance-${i.id}`, title: i.policy_number, subtitle: `Asuransi — ${i.insurance_company || ''}`.trim(), date: i.end_date, daysLeft, status, link: `/dashboard/insurances?search=${encodeURIComponent(i.policy_number)}` });
    });
    documents.forEach(d => {
      const { status, daysLeft } = computeDaysStatus(d.valid_until);
      if (status) items.push({ id: `document-${d.id}`, title: d.doc_title, subtitle: `Dokumen — ${d.doc_number || ''}`.trim(), date: d.valid_until, daysLeft, status, link: `/dashboard/documents?search=${encodeURIComponent(d.doc_title)}` });
    });

    items.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({ total: items.length, items: items.slice(0, 30) });
  } catch (err) {
    next(err);
  }
}

// GET /expenses/years
async function getExpenseYears(req, res, next) {
  try {
    const rows = await prisma.expense_budget.findMany({
      select: { fiscal_year: true },
      distinct: ['fiscal_year'],
      orderBy: { fiscal_year: 'desc' }
    });
    res.json(rows.map(r => r.fiscal_year));
  } catch (err) {
    next(err);
  }
}

// GET /expenses/summary
async function getExpenseSummary(req, res, next) {
  try {
    const { fiscalYear, companyId, companyMasterId } = req.query;

    const where = {};
    if (fiscalYear) where.fiscal_year = parseInt(fiscalYear);
    if (companyId) where.company_id = parseInt(companyId);
    else if (companyMasterId) where.m_company = { company_master_id: parseInt(companyMasterId) };

    const rows = await prisma.expense_budget.findMany({
      where,
      include: { m_coa: true }
    });

    let totalBudget = 0;
    let totalActual = 0;
    const byMonth = {};
    const byCoa = {};

    rows.forEach(r => {
      const budget = Number(r.budget_amount) || 0;
      const actual = Number(r.actual_amount) || 0;
      totalBudget += budget;
      totalActual += actual;

      if (!byMonth[r.period_month]) byMonth[r.period_month] = { Budget: 0, Actual: 0 };
      byMonth[r.period_month].Budget += budget;
      byMonth[r.period_month].Actual += actual;

      const coaKey = r.coa_id;
      if (!byCoa[coaKey]) byCoa[coaKey] = { coa_id: coaKey, coa_code: r.m_coa.code, coa_name: r.m_coa.name, budget: 0, actual: 0 };
      byCoa[coaKey].budget += budget;
      byCoa[coaKey].actual += actual;
    });

    const monthlyTrend = MONTH_LABELS.map((label, idx) => {
      const m = byMonth[idx + 1] || { Budget: 0, Actual: 0 };
      return { name: label, Budget: m.Budget, Actual: m.Actual };
    });

    const coaBreakdown = Object.values(byCoa)
      .map(c => ({ ...c, variance: c.budget - c.actual }))
      .sort((a, b) => b.budget - a.budget);

    const totalVariance = totalBudget - totalActual;
    const burnRatePercent = totalBudget > 0 ? Number(((totalActual / totalBudget) * 100).toFixed(1)) : 0;

    res.json({
      kpi: { totalBudget, totalActual, totalVariance, burnRatePercent },
      monthlyTrend,
      coaBreakdown
    });
  } catch (err) {
    next(err);
  }
}

// GET /benchmark-scorecard
async function getBenchmarkScorecard(req, res, next) {
  try {
    const { fiscalYear, companyId, companyMasterId } = req.query;
    const year = fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear();

    const assetWhere = {};
    const expenseWhere = { fiscal_year: year };
    const vehicleWhere = {};
    if (companyId) {
      assetWhere.company_id = parseInt(companyId);
      expenseWhere.company_id = parseInt(companyId);
      vehicleWhere.company_id = parseInt(companyId);
    } else if (companyMasterId) {
      assetWhere.m_company = { company_master_id: parseInt(companyMasterId) };
      expenseWhere.m_company = { company_master_id: parseInt(companyMasterId) };
      vehicleWhere.m_company = { company_master_id: parseInt(companyMasterId) };
    }

    const [assets, expenseRows, vendors, maintenances, insurances, vehicles, soSessions] = await Promise.all([
      prisma.assets.findMany({ where: assetWhere, select: { company_id: true, status_id: true, acquisition_cost: true, m_company: { select: { name: true } } } }),
      prisma.expense_budget.findMany({ where: expenseWhere, select: { company_id: true, budget_amount: true, actual_amount: true, m_company: { select: { name: true } } } }),
      prisma.vendors.findMany({ select: { status: true } }),
      prisma.maintenances.findMany({ select: { expired_date: true } }),
      prisma.insurances.findMany({ select: { vehicle_id: true, end_date: true, status: true } }),
      prisma.vehicles.findMany({ where: vehicleWhere, select: { id: true, tax_date: true } }),
      prisma.stock_opname_sessions.findMany({ select: { found_count: true, missing_count: true, checked_count: true } })
    ]);

    const totalAssetValue = assets.reduce((sum, a) => sum + (Number(a.acquisition_cost) || 0), 0);
    const totalAssetUnits = assets.length;
    const activeAssetUnits = assets.filter(a => a.status_id === 1).length;
    const assetUtilizationPct = totalAssetUnits > 0 ? Number(((activeAssetUnits / totalAssetUnits) * 100).toFixed(1)) : null;

    const totalExpenseBudget = expenseRows.reduce((sum, r) => sum + (Number(r.budget_amount) || 0), 0);
    const totalExpenseActual = expenseRows.reduce((sum, r) => sum + (Number(r.actual_amount) || 0), 0);
    const budgetAchievementPct = totalExpenseBudget > 0 ? Number(((totalExpenseActual / totalExpenseBudget) * 100).toFixed(1)) : null;

    const activeVendorsList = vendors.filter(v => ['Active', 'Aktif'].includes(v.status)).length;
    const vendorActiveRatePct = vendors.length > 0 ? Number(((activeVendorsList / vendors.length) * 100).toFixed(1)) : null;

    const today = new Date();
    const healthyMaintenances = maintenances.filter(m => !m.expired_date || new Date(m.expired_date) >= today).length;
    const maintenanceHealthPct = maintenances.length > 0 ? Number(((healthyMaintenances / maintenances.length) * 100).toFixed(1)) : null;

    const insuredVehicleIds = new Set(
      insurances.filter(i => i.vehicle_id && i.status === 'Active' && (!i.end_date || new Date(i.end_date) >= today)).map(i => i.vehicle_id)
    );
    const insuranceCoveragePct = vehicles.length > 0 ? Number(((vehicles.filter(v => insuredVehicleIds.has(v.id)).length / vehicles.length) * 100).toFixed(1)) : null;

    const compliantVehicles = vehicles.filter(v => v.tax_date && new Date(v.tax_date) >= today).length;
    const vehicleTaxCompliancePct = vehicles.length > 0 ? Number(((compliantVehicles / vehicles.length) * 100).toFixed(1)) : null;

    const totalFound = soSessions.reduce((sum, s) => sum + (s.found_count || 0), 0);
    const totalMissing = soSessions.reduce((sum, s) => sum + (s.missing_count || 0), 0);
    const stockOpnameAccuracyPct = (totalFound + totalMissing) > 0 ? Number(((totalFound / (totalFound + totalMissing)) * 100).toFixed(1)) : null;

    const metrics = [
      { key: 'assetUtilization', label: 'Asset Utilization Rate', actual: assetUtilizationPct, target: 80, unit: '%', lowerIsBetter: false },
      { key: 'budgetAchievement', label: 'Budget Achievement', actual: budgetAchievementPct, target: 100, unit: '%', lowerIsBetter: true },
      { key: 'vendorActiveRate', label: 'Vendor Active Rate', actual: vendorActiveRatePct, target: 90, unit: '%', lowerIsBetter: false },
      { key: 'maintenanceHealth', label: 'Maintenance Health Rate', actual: maintenanceHealthPct, target: 90, unit: '%', lowerIsBetter: false },
      { key: 'insuranceCoverage', label: 'Insurance Coverage', actual: insuranceCoveragePct, target: 90, unit: '%', lowerIsBetter: false },
      { key: 'vehicleTaxCompliance', label: 'Vehicle Tax Compliance', actual: vehicleTaxCompliancePct, target: 90, unit: '%', lowerIsBetter: false },
      { key: 'stockOpnameAccuracy', label: 'Stock Opname Accuracy', actual: stockOpnameAccuracyPct, target: 90, unit: '%', lowerIsBetter: false }
    ].map(m => ({ ...m, status: trafficLight(m.actual, m.target, m.lowerIsBetter) }));

    const companyMap = {};
    assets.forEach(a => {
      const id = a.company_id;
      if (!id) return;
      if (!companyMap[id]) companyMap[id] = { company_id: id, company_name: a.m_company?.name || 'Unassigned', totalAssetValue: 0, totalAssetUnits: 0, activeAssetUnits: 0, expenseActual: 0, expenseBudget: 0 };
      companyMap[id].totalAssetValue += Number(a.acquisition_cost) || 0;
      companyMap[id].totalAssetUnits += 1;
      if (a.status_id === 1) companyMap[id].activeAssetUnits += 1;
    });
    expenseRows.forEach(r => {
      const id = r.company_id;
      if (!id) return;
      if (!companyMap[id]) companyMap[id] = { company_id: id, company_name: r.m_company?.name || 'Unassigned', totalAssetValue: 0, totalAssetUnits: 0, activeAssetUnits: 0, expenseActual: 0, expenseBudget: 0 };
      companyMap[id].expenseActual += Number(r.actual_amount) || 0;
      companyMap[id].expenseBudget += Number(r.budget_amount) || 0;
    });

    const byCompany = Object.values(companyMap).map(c => {
      const assetUtil = c.totalAssetUnits > 0 ? Number(((c.activeAssetUnits / c.totalAssetUnits) * 100).toFixed(1)) : null;
      const achievement = c.expenseBudget > 0 ? Number(((c.expenseActual / c.expenseBudget) * 100).toFixed(1)) : null;
      let status = 'green';
      if ((achievement !== null && achievement > 110) || (assetUtil !== null && assetUtil < 50)) status = 'red';
      else if ((achievement !== null && achievement > 100) || (assetUtil !== null && assetUtil < 80)) status = 'yellow';
      return { ...c, assetUtilizationPct: assetUtil, budgetAchievementPct: achievement, status };
    }).sort((a, b) => b.totalAssetValue - a.totalAssetValue);

    res.json({
      headline: { totalAssetValue, totalAssetUnits, totalExpenseActual, totalExpenseBudget, budgetAchievementPct },
      metrics,
      byCompany
    });
  } catch (err) {
    next(err);
  }
}

// GET /benchmark-scorecard/company/:companyId
async function getBenchmarkCompanyDetail(req, res, next) {
  try {
    const companyId = parseInt(req.params.companyId);
    const { fiscalYear } = req.query;
    const year = fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear();

    const [company, assets, expenseRows] = await Promise.all([
      prisma.m_company.findUnique({ where: { id: companyId }, select: { id: true, name: true, code: true } }),
      prisma.assets.findMany({
        where: { company_id: companyId },
        select: { status_id: true, acquisition_cost: true, m_asset_category: { select: { name: true } } }
      }),
      prisma.expense_budget.findMany({
        where: { company_id: companyId, fiscal_year: year },
        select: { budget_amount: true, actual_amount: true, m_coa: { select: { id: true, code: true, name: true } } }
      })
    ]);

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const categoryMap = {};
    assets.forEach(a => {
      const name = a.m_asset_category?.name || 'Uncategorized';
      if (!categoryMap[name]) categoryMap[name] = { category: name, count: 0, activeCount: 0, value: 0 };
      categoryMap[name].count += 1;
      if (a.status_id === 1) categoryMap[name].activeCount += 1;
      categoryMap[name].value += Number(a.acquisition_cost) || 0;
    });
    const assetByCategory = Object.values(categoryMap).sort((a, b) => b.value - a.value || b.count - a.count);

    const coaMap = {};
    expenseRows.forEach(r => {
      const id = r.m_coa.id;
      if (!coaMap[id]) coaMap[id] = { coa_id: id, coa_code: r.m_coa.code, coa_name: r.m_coa.name, budget: 0, actual: 0 };
      coaMap[id].budget += Number(r.budget_amount) || 0;
      coaMap[id].actual += Number(r.actual_amount) || 0;
    });
    const expenseByCoa = Object.values(coaMap)
      .map(c => ({ ...c, variance: c.budget - c.actual }))
      .sort((a, b) => b.actual - a.actual);

    res.json({ company, assetByCategory, expenseByCoa });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getNotifications,
  getExpenseYears,
  getExpenseSummary,
  getBenchmarkScorecard,
  getBenchmarkCompanyDetail
};
