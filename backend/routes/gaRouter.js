const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking definitions
const allowRead = verifyToken; // Semuanya yang terotentikasi bisa membaca untuk kemudahan dashboard terintegrasi
const allowWrite = [verifyToken, checkRole(['admin', 'ga'])];

/**
 * ==========================================
 * DASHBOARD STATS
 * ==========================================
 */
router.get('/dashboard-stats', allowRead, async (req, res, next) => {
  try {
    const today = new Date();
    
    // 30 days threshold
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // 1. Asset Stats
    const totalAssets = await prisma.assets.count();
    const assetCostSum = await prisma.assets.aggregate({
      _sum: { acquisition_cost: true }
    });
    const goodAssets = await prisma.assets.count({
      where: { condition_id: 1 }
    });
    const badAssets = await prisma.assets.count({
      where: { NOT: { condition_id: 1 } }
    });

    // 2. Category Breakdown & Monthly Maintenance
    const categoryGroup = await prisma.assets.groupBy({
      by: ['asset_category_id'],
      _count: { id: true },
      _sum: { acquisition_cost: true }
    });
    
    const categoriesList = await prisma.m_asset_category.findMany();
    const categoryBreakdown = categoryGroup.map(cg => {
      const cat = categoriesList.find(c => c.id === cg.asset_category_id);
      return {
        name: cat ? cat.name : 'Uncategorized',
        count: cg._count.id,
        value: Number(cg._sum.acquisition_cost || 0)
      };
    });

    const maintenanceGroup = await prisma.maintenances.findMany({
      select: {
        created_at: true,
        total_cost: true
      }
    });

    // Group maintenances by month
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

    // 3. Device Rental Stats
    const totalDeviceRentals = await prisma.device_rentals.count({
      where: { status: 'Active' }
    });
    
    // Allocated: active rentals with a user assigned
    const activeDeviceRentals = await prisma.device_rentals.count({
      where: {
        status: 'Active',
        NOT: { user_id: null }
      }
    });

    // Available: active rentals without a user assigned
    const availableDeviceRentals = await prisma.device_rentals.count({
      where: {
        status: 'Active',
        user_id: null
      }
    });

    // Expiring soon: active rentals ending in next 30 days
    const expiringSoonLeases = await prisma.device_rentals.count({
      where: {
        status: 'Active',
        end_rent: {
          gte: today,
          lte: thirtyDaysFromNow
        }
      }
    });

    // Returned this month: rentals that ended in the current month and are inactive/returned
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const returnedThisMonth = await prisma.device_rentals.count({
      where: {
        status: 'Inactive',
        end_rent: {
          gte: firstDayOfMonth,
          lte: today
        }
      }
    });

    const deviceRentalCostSum = await prisma.device_rentals.aggregate({
      where: { status: 'Active' },
      _sum: { price: true }
    });
    const totalDeviceRentalValue = Number(deviceRentalCostSum._sum.price || 0);

    // Calculate historical stats from previous calendar month to determine real variations
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const totalDeviceRentalsLastMonth = await prisma.device_rentals.count({
      where: {
        OR: [
          { status: 'Active' },
          {
            status: 'Inactive',
            end_rent: { gte: prevMonthStart }
          }
        ],
        start_rent: { lte: prevMonthEnd }
      }
    });

    const deviceRentalCostLastMonthAgg = await prisma.device_rentals.aggregate({
      where: {
        OR: [
          { status: 'Active' },
          {
            status: 'Inactive',
            end_rent: { gte: prevMonthStart }
          }
        ],
        start_rent: { lte: prevMonthEnd }
      },
      _sum: { price: true }
    });
    const deviceRentalCostLastMonth = Number(deviceRentalCostLastMonthAgg._sum.price || 0);

    const activeDeviceRentalsLastMonth = await prisma.device_rentals.count({
      where: {
        OR: [
          { status: 'Active' },
          {
            status: 'Inactive',
            end_rent: { gte: prevMonthStart }
          }
        ],
        start_rent: { lte: prevMonthEnd },
        NOT: { user_id: null }
      }
    });

    const deviceRentalsDiff = totalDeviceRentals - totalDeviceRentalsLastMonth;
    const deviceRentalValueDiff = totalDeviceRentalValue - deviceRentalCostLastMonth;
    const activeDeviceRentalsDiff = activeDeviceRentals - activeDeviceRentalsLastMonth;

    const deviceTypeGroup = await prisma.device_rentals.groupBy({
      where: { status: 'Active' },
      by: ['device_type'],
      _count: { id: true },
      _sum: { price: true }
    });
    const deviceTypeBreakdown = deviceTypeGroup.map(dg => ({
      type: dg.device_type || 'Lainnya',
      count: dg._count.id,
      value: Number(dg._sum.price || 0)
    }));

    // 4. Vehicle Stats
    const totalVehicles = await prisma.vehicles.count();
    const activeVehicles = await prisma.vehicles.count({
      where: { status: 'Aktif' }
    });
    const inServiceVehicles = await prisma.vehicles.count({
      where: { status: 'Dalam Service' }
    });
    const expiringTaxVehicles = await prisma.vehicles.count({
      where: {
        tax_date: {
          gte: today,
          lte: thirtyDaysFromNow
        }
      }
    });

    const vehicleTypeGroup = await prisma.vehicles.groupBy({
      by: ['vehicle_type'],
      _count: { id: true }
    });
    const vehicleTypeBreakdown = vehicleTypeGroup.map(vg => ({
      type: vg.vehicle_type || 'Lainnya',
      count: vg._count.id
    }));

    // Calculate vehicle coverage/premium value from insurances
    const vehicleInsuranceSum = await prisma.insurances.aggregate({
      _sum: {
        premium_idr: true,
        coverage_idr: true
      }
    });

    // 5. Insurance Stats
    const totalInsurances = await prisma.insurances.count();
    const totalInsurancePremiumAgg = await prisma.insurances.aggregate({
      _sum: { premium_idr: true }
    });
    const activeInsurances = await prisma.insurances.count({
      where: { status: 'Active' }
    });
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(today.getDate() + 60);
    const expiringInsurances = await prisma.insurances.count({
      where: {
        status: 'Active',
        end_date: {
          gte: today,
          lte: sixtyDaysFromNow
        }
      }
    });

    // 6. Vendor Stats
    const totalVendors = await prisma.vendors.count();
    const activeVendors = await prisma.vendors.count({
      where: { status: 'Active' }
    });
    const inactiveVendors = await prisma.vendors.count({
      where: { NOT: { status: 'Active' } }
    });

    const maintenanceCostSum = await prisma.maintenances.aggregate({
      _sum: { total_cost: true }
    });

    const pendingApprovals = await prisma.approval_requests.count({
      where: { status: 'PENDING' }
    });

    // 7. Asset Condition Breakdown
    const conditionGroup = await prisma.assets.groupBy({
      by: ['condition_id'],
      _count: { id: true }
    });
    const conditionsList = await prisma.m_condition.findMany();
    const assetConditionBreakdown = conditionGroup.map(cg => {
      const cond = conditionsList.find(c => c.id === cg.condition_id);
      return {
        name: cond ? cond.name : 'Unspecified',
        count: cg._count.id
      };
    });

    // 7b. Asset Status Breakdown
    const statusGroup = await prisma.assets.groupBy({
      by: ['status_id'],
      _count: { id: true }
    });
    const statusesList = await prisma.m_status.findMany();
    const assetStatusBreakdown = statusGroup.map(sg => {
      const st = statusesList.find(s => s.id === sg.status_id);
      return {
        name: st ? st.name : 'Unspecified',
        count: sg._count.id
      };
    });

    // 8. Insurer Distribution (with normalized names merging duplicates)
    const normalizeInsurerName = (name) => {
      if (!name) return 'Unknown';
      let norm = name.trim().replace(/\s+/g, ' ');
      norm = norm.replace(/[,.]?\s*Tbk\.?$/i, ''); // Strip Tbk
      norm = norm.replace(/^PT\.?\s*/i, 'PT '); // Standardize prefix
      
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

    const insurerGroup = await prisma.insurances.groupBy({
      by: ['insurance_company'],
      _count: { id: true },
      _sum: { premium_idr: true }
    });

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

    // 8b. Policy Type Breakdown
    const policyTypeGroup = await prisma.insurances.groupBy({
      by: ['insurance_type'],
      _count: { id: true },
      _sum: { premium_idr: true }
    });

    const policyTypeBreakdown = policyTypeGroup.map(ptg => ({
      name: ptg.insurance_type || 'Other',
      count: ptg._count.id,
      premium: Number(ptg._sum.premium_idr || 0)
    })).sort((a, b) => b.count - a.count);

    // 9. Agreement Summary
    const totalAgreements = await prisma.documents.count({
      where: { doc_subtype: 'agreement' }
    });
    const activeAgreements = await prisma.documents.count({
      where: { doc_subtype: 'agreement', status: 'Active' }
    });
    const expiredAgreements = await prisma.documents.count({
      where: { doc_subtype: 'agreement', status: 'Expired' }
    });
    const expiringAgreements = await prisma.documents.count({
      where: {
        doc_subtype: 'agreement',
        status: 'Active',
        valid_until: {
          gte: today,
          lte: sixtyDaysFromNow
        }
      }
    });
    const agreementValueSum = await prisma.documents.aggregate({
      where: { doc_subtype: 'agreement' },
      _sum: { amount: true }
    });

    res.json({
      // GA core
      totalAssets,
      totalAssetValue: assetCostSum._sum.acquisition_cost || 0,
      goodAssets,
      badAssets,
      
      // Analytics
      categoryBreakdown,
      monthlyMaintenanceCost,
      
      // Device rentals
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

      // Vehicles
      totalVehicles,
      activeVehicles,
      inServiceVehicles,
      expiringTaxVehicles,
      totalVehicleValue: vehicleInsuranceSum._sum.coverage_idr || 0,
      totalVehiclePremium: vehicleInsuranceSum._sum.premium_idr || 0,
      vehicleTypeBreakdown,

      // Insurance
      totalInsurances,
      totalInsurancePremium: totalInsurancePremiumAgg._sum.premium_idr || 0,
      activeInsurances,
      expiringInsurances,

      // Vendors
      totalVendors,
      activeVendors,
      inactiveVendors,

      // Other counts
      totalMaintenanceCost: maintenanceCostSum._sum.total_cost || 0,
      pendingApprovals,

      // New visualizations
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
});

/**
 * ==========================================
 * ASSETS ENDPOINTS
 * ==========================================
 */

// GET List Assets with pagination, search, & filter
router.get('/assets', allowRead, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', categoryId, locationId, statusId, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter clause
    const where = {};
    if (search) {
      where.OR = [
        { asset_name: { contains: search, mode: 'insensitive' } },
        { asset_code: { contains: search, mode: 'insensitive' } },
        { room: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (categoryId) {
      where.asset_category_id = parseInt(categoryId);
    }
    if (locationId) {
      where.location_id = parseInt(locationId);
    }
    if (statusId) {
      where.status_id = parseInt(statusId);
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }

    const [assetsList, totalCount, costAggregate, goodCount, repairCount, companyGroup, categoryGroup, categoriesList] = await Promise.all([
      prisma.assets.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_asset_category: true,
          m_asset_type: true,
          m_company: true,
          m_condition: true,
          m_location: true,
          m_user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true
            }
          },
          m_status: true
        }
      }),
      prisma.assets.count({ where }),
      prisma.assets.aggregate({
        where,
        _sum: {
          acquisition_cost: true
        }
      }),
      prisma.assets.count({
        where: {
          ...where,
          condition_id: 1 // Good / Bagus
        }
      }),
      prisma.assets.count({
        where: {
          ...where,
          NOT: {
            condition_id: 1
          }
        }
      }),
      prisma.assets.groupBy({
        by: ['company_id'],
        where
      }),
      prisma.assets.groupBy({
        by: ['asset_category_id'],
        where,
        _count: {
          id: true
        },
        _sum: {
          acquisition_cost: true
        }
      }),
      prisma.m_asset_category.findMany()
    ]);

    const categoryBreakdown = categoryGroup.map(cg => {
      const cat = categoriesList.find(c => c.id === cg.asset_category_id);
      return {
        id: cg.asset_category_id || 0,
        name: cat ? cat.name : 'Unknown',
        count: cg._count.id,
        value: cg._sum.acquisition_cost || 0
      };
    });

    res.json({
      data: assetsList,
      meta: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      summary: {
        totalAcquisitionCost: costAggregate._sum.acquisition_cost || 0,
        goodConditionCount: goodCount,
        needRepairCount: repairCount,
        uniqueCompaniesCount: companyGroup.length,
        categoryBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET Asset by ID
router.get('/assets/:id', allowRead, async (req, res, next) => {
  try {
    const asset = await prisma.assets.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_asset_category: true,
        m_asset_type: true,
        m_company: true,
        m_condition: true,
        m_location: true,
        m_user: true,
        m_status: true,
        inventory_checks: true,
        maintenances: true
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// POST Create Asset
router.post('/assets', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    
    // Validasi basic
    if (!data.asset_name || !data.company_id) {
      return res.status(400).json({ error: 'Asset name and company ID are required.' });
    }

    const newAsset = await prisma.assets.create({
      data: {
        company_id: parseInt(data.company_id),
        asset_code: data.asset_code || null,
        asset_category_id: data.asset_category_id ? parseInt(data.asset_category_id) : null,
        asset_type_id: data.asset_type_id ? parseInt(data.asset_type_id) : null,
        asset_name: data.asset_name,
        details: data.details || null,
        location_id: data.location_id ? parseInt(data.location_id) : null,
        room: data.room || null,
        pic_id: data.pic_id ? parseInt(data.pic_id) : null,
        acquisition_date: data.acquisition_date ? new Date(data.acquisition_date) : null,
        acquisition_cost: data.acquisition_cost ? parseFloat(data.acquisition_cost) : 0,
        useful_life_months: data.useful_life_months ? parseInt(data.useful_life_months) : null,
        condition_id: data.condition_id ? parseInt(data.condition_id) : null,
        status_id: data.status_id ? parseInt(data.status_id) : null,
        information: data.information || null,
        reference_link: data.reference_link || null
      }
    });

    res.status(201).json(newAsset);
  } catch (err) {
    next(err);
  }
});

// PUT Update Asset
router.put('/assets/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const assetId = parseInt(req.params.id);

    const updatedAsset = await prisma.assets.update({
      where: { id: assetId },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        asset_code: data.asset_code !== undefined ? data.asset_code : undefined,
        asset_category_id: data.asset_category_id !== undefined ? (data.asset_category_id ? parseInt(data.asset_category_id) : null) : undefined,
        asset_type_id: data.asset_type_id !== undefined ? (data.asset_type_id ? parseInt(data.asset_type_id) : null) : undefined,
        asset_name: data.asset_name !== undefined ? data.asset_name : undefined,
        details: data.details !== undefined ? data.details : undefined,
        location_id: data.location_id !== undefined ? (data.location_id ? parseInt(data.location_id) : null) : undefined,
        room: data.room !== undefined ? data.room : undefined,
        pic_id: data.pic_id !== undefined ? (data.pic_id ? parseInt(data.pic_id) : null) : undefined,
        acquisition_date: data.acquisition_date !== undefined ? (data.acquisition_date ? new Date(data.acquisition_date) : null) : undefined,
        acquisition_cost: data.acquisition_cost !== undefined ? parseFloat(data.acquisition_cost) : undefined,
        useful_life_months: data.useful_life_months !== undefined ? (data.useful_life_months ? parseInt(data.useful_life_months) : null) : undefined,
        condition_id: data.condition_id !== undefined ? (data.condition_id ? parseInt(data.condition_id) : null) : undefined,
        status_id: data.status_id !== undefined ? (data.status_id ? parseInt(data.status_id) : null) : undefined,
        information: data.information !== undefined ? data.information : undefined,
        reference_link: data.reference_link !== undefined ? data.reference_link : undefined
      }
    });

    res.json(updatedAsset);
  } catch (err) {
    next(err);
  }
});

// DELETE Asset
router.delete('/assets/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.assets.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Asset deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Masters for Asset fields
router.get('/assets-categories', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.m_asset_category.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/assets-types', allowRead, async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const where = categoryId ? { category_id: parseInt(categoryId) } : {};
    const list = await prisma.m_asset_type.findMany({ where, orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/assets-conditions', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.m_condition.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/assets-locations', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.m_company_branch.findMany({ orderBy: { name: 'asc' } });
    const mapped = list.map(b => ({
      ...b,
      full_name: `${b.name} - ${b.location}`
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

router.get('/assets-statuses', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.m_status.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * VEHICLES ENDPOINTS
 * ==========================================
 */
router.get('/vehicles', allowRead, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10, status, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { plate_number: { contains: search, mode: 'insensitive' } },
        { brand_model: { contains: search, mode: 'insensitive' } },
        { driver_name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const [list, count, activeCount, inServiceCount, taxWarningCount, companyGroup, typeGroup] = await Promise.all([
      prisma.vehicles.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: { m_company: true }
      }),
      prisma.vehicles.count({ where }),
      prisma.vehicles.count({
        where: {
          ...where,
          status: 'Aktif'
        }
      }),
      prisma.vehicles.count({
        where: {
          ...where,
          NOT: {
            status: 'Aktif'
          }
        }
      }),
      prisma.vehicles.count({
        where: {
          ...where,
          tax_date: {
            gte: today,
            lte: thirtyDaysFromNow
          }
        }
      }),
      prisma.vehicles.groupBy({
        by: ['company_id'],
        where
      }),
      prisma.vehicles.groupBy({
        by: ['vehicle_type'],
        where,
        _count: {
          id: true
        }
      })
    ]);

    res.json({
      data: list,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        activeCount,
        inServiceCount,
        taxWarningCount,
        uniqueCompaniesCount: companyGroup.length,
        typeBreakdown: typeGroup.map(tg => ({
          type: tg.vehicle_type || 'Lainnya',
          count: tg._count.id
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/vehicles/:id', allowRead, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { m_company: true, insurances: true }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

router.post('/vehicles', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.plate_number || !data.company_id) {
      return res.status(400).json({ error: 'Plate number and company ID are required.' });
    }

    const newVehicle = await prisma.vehicles.create({
      data: {
        company_id: parseInt(data.company_id),
        plate_number: data.plate_number,
        chassis_number: data.chassis_number || null,
        vehicle_type: data.vehicle_type || null,
        brand_model: data.brand_model || null,
        year: data.year ? parseInt(data.year) : null,
        color: data.color || null,
        driver_name: data.driver_name || null,
        department: data.department || null,
        tax_date: data.tax_date ? new Date(data.tax_date) : null,
        last_km: data.last_km ? parseInt(data.last_km) : null,
        last_service_date: data.last_service_date ? new Date(data.last_service_date) : null,
        status: data.status || 'Aktif',
        information: data.information || null,
        doc_url: data.doc_url || null
      }
    });
    res.status(201).json(newVehicle);
  } catch (err) {
    next(err);
  }
});

router.put('/vehicles/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const updated = await prisma.vehicles.update({
      where: { id: parseInt(req.params.id) },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        plate_number: data.plate_number !== undefined ? data.plate_number : undefined,
        chassis_number: data.chassis_number !== undefined ? data.chassis_number : undefined,
        vehicle_type: data.vehicle_type !== undefined ? data.vehicle_type : undefined,
        brand_model: data.brand_model !== undefined ? data.brand_model : undefined,
        year: data.year !== undefined ? (data.year ? parseInt(data.year) : null) : undefined,
        color: data.color !== undefined ? data.color : undefined,
        driver_name: data.driver_name !== undefined ? data.driver_name : undefined,
        department: data.department !== undefined ? data.department : undefined,
        tax_date: data.tax_date !== undefined ? (data.tax_date ? new Date(data.tax_date) : null) : undefined,
        last_km: data.last_km !== undefined ? (data.last_km ? parseInt(data.last_km) : null) : undefined,
        last_service_date: data.last_service_date !== undefined ? (data.last_service_date ? new Date(data.last_service_date) : null) : undefined,
        status: data.status !== undefined ? data.status : undefined,
        information: data.information !== undefined ? data.information : undefined,
        doc_url: data.doc_url !== undefined ? data.doc_url : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/vehicles/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.vehicles.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * VENDORS ENDPOINTS
 * ==========================================
 */
router.get('/vendors', allowRead, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { vendor_name: { contains: search, mode: 'insensitive' } },
        { vendor_code: { contains: search, mode: 'insensitive' } },
        { pic_name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (companyId) {
      where.partnership_company_id = parseInt(companyId);
    }

    const [list, count, activeCount, ratingAggregate, costAggregate, companyGroup] = await Promise.all([
      prisma.vendors.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_bank: true,
          m_division: true,
          m_company: true,
          m_vendor_category: true
        }
      }),
      prisma.vendors.count({ where }),
      prisma.vendors.count({
        where: {
          ...where,
          status: 'Active'
        }
      }),
      prisma.vendors.aggregate({
        where,
        _avg: {
          rating: true
        }
      }),
      prisma.vendors.aggregate({
        where,
        _sum: {
          contract_value: true
        }
      }),
      prisma.vendors.groupBy({
        by: ['partnership_company_id'],
        where
      })
    ]);

    res.json({
      data: list,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalVendors: count,
        activeCount,
        avgRating: ratingAggregate._avg.rating ? Number(ratingAggregate._avg.rating).toFixed(1) : '0.0',
        totalContractValue: Number(costAggregate._sum.contract_value || 0),
        uniqueCompaniesCount: companyGroup.filter(g => g.partnership_company_id !== null).length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/vendors/:id', allowRead, async (req, res, next) => {
  try {
    const vendor = await prisma.vendors.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_bank: true,
        m_division: true,
        m_company: true,
        m_vendor_category: true,
        maintenances: true,
        documents: true
      }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });
    res.json(vendor);
  } catch (err) {
    next(err);
  }
});

router.post('/vendors', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.vendor_name) {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    const newVendor = await prisma.vendors.create({
      data: {
        vendor_code: data.vendor_code || null,
        vendor_name: data.vendor_name,
        vendor_category_id: data.vendor_category_id ? parseInt(data.vendor_category_id) : null,
        expense_category_id: data.expense_category_id ? parseInt(data.expense_category_id) : null,
        detail: data.detail || null,
        division_id: data.division_id ? parseInt(data.division_id) : null,
        partnership_company_id: data.partnership_company_id ? parseInt(data.partnership_company_id) : null,
        pic_name: data.pic_name || null,
        pic_position: data.pic_position || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        npwp: data.npwp || null,
        account_name: data.account_name || null,
        bank_id: data.bank_id ? parseInt(data.bank_id) : null,
        account_number: data.account_number || null,
        contract_start: data.contract_start ? new Date(data.contract_start) : null,
        contract_end: data.contract_end ? new Date(data.contract_end) : null,
        top_days: data.top_days ? parseInt(data.top_days) : null,
        contract_value: data.contract_value ? parseFloat(data.contract_value) : null,
        status: data.status || 'Active'
      }
    });
    res.status(201).json(newVendor);
  } catch (err) {
    next(err);
  }
});

router.put('/vendors/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const updated = await prisma.vendors.update({
      where: { id: parseInt(req.params.id) },
      data: {
        vendor_code: data.vendor_code !== undefined ? data.vendor_code : undefined,
        vendor_name: data.vendor_name !== undefined ? data.vendor_name : undefined,
        vendor_category_id: data.vendor_category_id !== undefined ? (data.vendor_category_id ? parseInt(data.vendor_category_id) : null) : undefined,
        expense_category_id: data.expense_category_id !== undefined ? (data.expense_category_id ? parseInt(data.expense_category_id) : null) : undefined,
        detail: data.detail !== undefined ? data.detail : undefined,
        division_id: data.division_id !== undefined ? (data.division_id ? parseInt(data.division_id) : null) : undefined,
        partnership_company_id: data.partnership_company_id !== undefined ? (data.partnership_company_id ? parseInt(data.partnership_company_id) : null) : undefined,
        pic_name: data.pic_name !== undefined ? data.pic_name : undefined,
        pic_position: data.pic_position !== undefined ? data.pic_position : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        email: data.email !== undefined ? data.email : undefined,
        address: data.address !== undefined ? data.address : undefined,
        npwp: data.npwp !== undefined ? data.npwp : undefined,
        account_name: data.account_name !== undefined ? data.account_name : undefined,
        bank_id: data.bank_id !== undefined ? (data.bank_id ? parseInt(data.bank_id) : null) : undefined,
        account_number: data.account_number !== undefined ? data.account_number : undefined,
        contract_start: data.contract_start !== undefined ? (data.contract_start ? new Date(data.contract_start) : null) : undefined,
        contract_end: data.contract_end !== undefined ? (data.contract_end ? new Date(data.contract_end) : null) : undefined,
        top_days: data.top_days !== undefined ? (data.top_days ? parseInt(data.top_days) : null) : undefined,
        contract_value: data.contract_value !== undefined ? (data.contract_value ? parseFloat(data.contract_value) : null) : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/vendors/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.vendors.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Vendor deleted successfully.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * MAINTENANCES ENDPOINTS
 * ==========================================
 */
router.get('/maintenances', allowRead, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 10, status, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { asset_name: { contains: search, mode: 'insensitive' } },
        { detail: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } },
        { service_type: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (companyId) {
      where.company_id = parseInt(companyId);
    }

    const [list, count, costAggregate, pendingCount, completedCount, companyGroup] = await Promise.all([
      prisma.maintenances.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          assets: true,
          m_company: true,
          m_location: true,
          vendors: true
        }
      }),
      prisma.maintenances.count({ where }),
      prisma.maintenances.aggregate({
        where,
        _sum: {
          total_cost: true
        }
      }),
      prisma.maintenances.count({
        where: {
          ...where,
          status: { in: ['Pending', 'Proses', 'pending', 'proses', 'PENDING', 'PROSES'] }
        }
      }),
      prisma.maintenances.count({
        where: {
          ...where,
          status: { in: ['Selesai', 'Completed', 'selesai', 'completed', 'SELESAI', 'COMPLETED'] }
        }
      }),
      prisma.maintenances.groupBy({
        by: ['company_id'],
        where
      })
    ]);

    res.json({
      data: list,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalCost: costAggregate._sum.total_cost || 0,
        pendingCount,
        completedCount,
        uniqueCompaniesCount: companyGroup.length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/maintenances', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.company_id || !data.service_type) {
      return res.status(400).json({ error: 'Company ID and service type are required.' });
    }

    const newMaint = await prisma.maintenances.create({
      data: {
        company_id: parseInt(data.company_id),
        location_id: data.location_id ? parseInt(data.location_id) : null,
        room_area: data.room_area || null,
        asset_id: data.asset_id ? parseInt(data.asset_id) : null,
        asset_name: data.asset_name || null,
        detail: data.detail || null,
        pic: data.pic || null,
        service_type: data.service_type,
        expired_date: data.expired_date ? new Date(data.expired_date) : null,
        qty: data.qty ? parseInt(data.qty) : 1,
        est_cost: data.est_cost ? parseFloat(data.est_cost) : 0,
        total_cost: data.total_cost ? parseFloat(data.total_cost) : 0,
        vendor_id: data.vendor_id ? parseInt(data.vendor_id) : null,
        status: data.status || 'Pending',
        information: data.information || null,
        reference_link: data.reference_link || null
      }
    });
    res.status(201).json(newMaint);
  } catch (err) {
    next(err);
  }
});

router.put('/maintenances/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const updated = await prisma.maintenances.update({
      where: { id: parseInt(req.params.id) },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        location_id: data.location_id !== undefined ? (data.location_id ? parseInt(data.location_id) : null) : undefined,
        room_area: data.room_area !== undefined ? data.room_area : undefined,
        asset_id: data.asset_id !== undefined ? (data.asset_id ? parseInt(data.asset_id) : null) : undefined,
        asset_name: data.asset_name !== undefined ? data.asset_name : undefined,
        detail: data.detail !== undefined ? data.detail : undefined,
        pic: data.pic !== undefined ? data.pic : undefined,
        service_type: data.service_type !== undefined ? data.service_type : undefined,
        expired_date: data.expired_date !== undefined ? (data.expired_date ? new Date(data.expired_date) : null) : undefined,
        qty: data.qty !== undefined ? (data.qty ? parseInt(data.qty) : null) : undefined,
        est_cost: data.est_cost !== undefined ? parseFloat(data.est_cost) : undefined,
        total_cost: data.total_cost !== undefined ? parseFloat(data.total_cost) : undefined,
        vendor_id: data.vendor_id !== undefined ? (data.vendor_id ? parseInt(data.vendor_id) : null) : undefined,
        status: data.status !== undefined ? data.status : undefined,
        information: data.information !== undefined ? data.information : undefined,
        reference_link: data.reference_link !== undefined ? data.reference_link : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/maintenances/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.maintenances.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Maintenance record deleted.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * DEVICE RENTALS ENDPOINTS (BRIDGE HELPDESK)
 * ==========================================
 */
router.get('/device-rentals', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.device_rentals.findMany({
      orderBy: { id: 'desc' },
      include: {
        m_company: true,
        m_location: true,
        m_user: true,
        vendors: true
      }
    });

    // Fetch Helpdesk assets and users
    let helpdeskAssets = [];
    try {
      helpdeskAssets = await prisma.$queryRawUnsafe(`
        SELECT a.id, a."assetTag", a."deviceRef", u.id AS "userId", u.name AS "userName", u.department AS "userDept", u.email AS "userEmail"
        FROM helpdesk."Asset" a
        LEFT JOIN helpdesk."User" u ON a."userId" = u.id
        WHERE a."ownershipType" = 'RENTAL'
      `);
    } catch (dbErr) {
      console.error('Error fetching Helpdesk assets:', dbErr.message);
    }

    // Fetch Helpdesk pending approvals
    let pendingApprovals = [];
    try {
      pendingApprovals = await prisma.$queryRawUnsafe(`
        SELECT r.id, r."entityId", r.reason, u.name AS "targetUserName", u.id AS "targetUserId"
        FROM helpdesk."ApprovalRequest" r
        LEFT JOIN helpdesk."User" u ON u.id = REPLACE(r.reason, 'ALLOCATE_TO:', '')
        WHERE r.status = 'PENDING' AND r."entityType" = 'ASSET_ALLOCATION'
      `);
    } catch (dbErr) {
      console.error('Error fetching Helpdesk pending approvals:', dbErr.message);
    }

    // Map and enrich
    const enrichedList = list.map(rental => {
      const plainRental = { ...rental };
      if (!rental.unit_code) return plainRental;

      const codeLower = rental.unit_code.toLowerCase().trim();

      // Find matching asset in Helpdesk
      const matchingAsset = helpdeskAssets.find(ha => {
        const tag = (ha.assetTag || '').toLowerCase().trim();
        const ref = (ha.deviceRef || '').toLowerCase().trim();
        return codeLower === tag || codeLower === ref;
      });

      if (matchingAsset) {
        // If matched, enrich with helpdesk user information
        plainRental.assigned_user = matchingAsset.userId ? {
          id: matchingAsset.userId,
          name: matchingAsset.userName,
          department: matchingAsset.userDept,
          email: matchingAsset.userEmail
        } : null;

        // Check if there is a pending approval request for this asset
        const matchingApproval = pendingApprovals.find(pa => pa.entityId === matchingAsset.id);
        if (matchingApproval) {
          plainRental.pending_approval = {
            id: matchingApproval.id,
            target_user_id: matchingApproval.targetUserId,
            target_user_name: matchingApproval.targetUserName
          };
        }
      }

      return plainRental;
    });

    res.json(enrichedList);
  } catch (err) {
    next(err);
  }
});

router.post('/device-rentals', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.company_id) {
      return res.status(400).json({ error: 'Company ID is required.' });
    }

    const newRental = await prisma.device_rentals.create({
      data: {
        company_id: parseInt(data.company_id),
        vendor_id: data.vendor_id ? parseInt(data.vendor_id) : null,
        device_type: data.device_type || null,
        order_id: data.order_id || null,
        item_name: data.item_name || null,
        price: data.price ? parseFloat(data.price) : 0,
        unit_code: data.unit_code || null,
        duration_months: data.duration_months ? parseInt(data.duration_months) : null,
        start_rent: data.start_rent ? new Date(data.start_rent) : null,
        end_rent: data.end_rent ? new Date(data.end_rent) : null,
        user_id: data.user_id ? parseInt(data.user_id) : null,
        department: data.department || null,
        location_id: data.location_id ? parseInt(data.location_id) : null,
        status: data.status || 'Active'
      }
    });
    res.status(201).json(newRental);
  } catch (err) {
    next(err);
  }
});

router.put('/device-rentals/:id', allowWrite, async (req, res, next) => {
  try {
    const data = req.body;
    const updated = await prisma.device_rentals.update({
      where: { id: parseInt(req.params.id) },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        vendor_id: data.vendor_id !== undefined ? (data.vendor_id ? parseInt(data.vendor_id) : null) : undefined,
        device_type: data.device_type !== undefined ? data.device_type : undefined,
        order_id: data.order_id !== undefined ? data.order_id : undefined,
        item_name: data.item_name !== undefined ? data.item_name : undefined,
        price: data.price !== undefined ? parseFloat(data.price) : undefined,
        unit_code: data.unit_code !== undefined ? data.unit_code : undefined,
        duration_months: data.duration_months !== undefined ? (data.duration_months ? parseInt(data.duration_months) : null) : undefined,
        start_rent: data.start_rent !== undefined ? (data.start_rent ? new Date(data.start_rent) : null) : undefined,
        end_rent: data.end_rent !== undefined ? (data.end_rent ? new Date(data.end_rent) : null) : undefined,
        user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
        department: data.department !== undefined ? data.department : undefined,
        location_id: data.location_id !== undefined ? (data.location_id ? parseInt(data.location_id) : null) : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/device-rentals/:id', allowWrite, async (req, res, next) => {
  try {
    await prisma.device_rentals.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Device rental deleted.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/ga/helpdesk-users
router.get('/helpdesk-users', allowRead, async (req, res, next) => {
  try {
    const list = await prisma.$queryRawUnsafe(`
      SELECT id, name, email, department, "jobPosition"
      FROM helpdesk."User"
      ORDER BY name ASC
    `);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/ga/it-rentals/:id/assign-user
router.post('/it-rentals/:id/assign-user', allowWrite, async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const rentalId = parseInt(req.params.id);

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    // 1. Fetch local rental
    const rental = await prisma.device_rentals.findUnique({
      where: { id: rentalId }
    });

    if (!rental) {
      return res.status(404).json({ error: 'IT rental record not found.' });
    }

    if (!rental.unit_code) {
      return res.status(400).json({ error: 'Rental record does not have a unit code.' });
    }

    // 2. Find matching asset in Helpdesk
    const codeLower = rental.unit_code.toLowerCase().trim();
    const hdAssets = await prisma.$queryRawUnsafe(`
      SELECT id, "assetTag", "deviceRef", brand, model
      FROM helpdesk."Asset"
      WHERE LOWER(TRIM("assetTag")) = $1 OR LOWER(TRIM("deviceRef")) = $1
      LIMIT 1
    `, codeLower);

    if (!hdAssets || hdAssets.length === 0) {
      return res.status(404).json({ error: 'Corresponding asset not found in Helpdesk system.' });
    }

    const asset = hdAssets[0];

    // 3. Find requester in Helpdesk (by email)
    const email = req.user.email;
    const requesterUsers = await prisma.$queryRawUnsafe(`
      SELECT id FROM helpdesk."User" WHERE email = $1 LIMIT 1
    `, email);

    const requesterId = (requesterUsers && requesterUsers.length > 0) 
      ? requesterUsers[0].id 
      : '50623001'; // Default to Aris Setiyono (IT Admin)

    // 4. Check for existing pending approvals
    const existing = await prisma.$queryRawUnsafe(`
      SELECT id FROM helpdesk."ApprovalRequest"
      WHERE "entityId" = $1 AND status = 'PENDING' AND "entityType" = 'ASSET_ALLOCATION'
      LIMIT 1
    `, asset.id);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'A pending allocation request for this device already exists.' });
    }

    // 5. Create new UUID for approval request
    const crypto = require('crypto');
    const newUuid = crypto.randomUUID();

    // 6. Insert Approval Request into Helpdesk
    await prisma.$queryRawUnsafe(`
      INSERT INTO helpdesk."ApprovalRequest" (id, "entityType", "entityId", "entityName", reason, status, "requestedById", "createdAt", "updatedAt")
      VALUES ($1, 'ASSET_ALLOCATION', $2, $3, $4, 'PENDING', $5, NOW(), NOW())
    `, newUuid, asset.id, `${asset.assetTag} (${asset.brand} ${asset.model})`, `ALLOCATE_TO:${employeeId}`, requesterId);

    // 7. Write system audit log in Helpdesk
    const logUuid = crypto.randomUUID();
    await prisma.$queryRawUnsafe(`
      INSERT INTO helpdesk."SystemAuditLog" (id, action, details, "performedBy", "createdAt")
      VALUES ($1, 'ASSET_ALLOCATION_REQUESTED', $2, $3, NOW())
    `, logUuid, `Allocation approval requested for Asset Tag ${asset.assetTag} to User ${employeeId} via GA System.`, `${req.user.full_name || req.user.name || 'GA User'} (${req.user.email})`);

    res.json({ success: true, message: 'Allocation request successfully submitted for Admin approval.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
