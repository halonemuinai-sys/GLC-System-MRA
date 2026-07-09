const prisma = require('../../api/db');

// GET List Maintenances
async function getMaintenances(req, res, next) {
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
}

// POST Create Maintenance
async function createMaintenance(req, res, next) {
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
}

// PUT Update Maintenance
async function updateMaintenance(req, res, next) {
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
}

// DELETE Maintenance
async function deleteMaintenance(req, res, next) {
  try {
    await prisma.maintenances.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Maintenance record deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMaintenances,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance
};
