const prisma = require('../../api/db');

// GET List Vehicles
async function getVehicles(req, res, next) {
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
}

// GET Vehicle by ID
async function getVehicleDetail(req, res, next) {
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
}

// POST Create Vehicle
async function createVehicle(req, res, next) {
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
}

// PUT Update Vehicle
async function updateVehicle(req, res, next) {
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
}

// DELETE Vehicle
async function deleteVehicle(req, res, next) {
  try {
    await prisma.vehicles.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVehicles,
  getVehicleDetail,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
