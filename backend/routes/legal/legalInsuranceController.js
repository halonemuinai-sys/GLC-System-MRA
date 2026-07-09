const prisma = require('../../api/db');

// GET /insurances
async function getInsurances(req, res, next) {
  try {
    const { search = '', page = 1, limit = 10, status, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { policy_number: { contains: search, mode: 'insensitive' } },
        { insurance_company: { contains: search, mode: 'insensitive' } },
        { broker: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } },
        { vehicle_type: { contains: search, mode: 'insensitive' } }
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

    const [list, count, activeCount, costAggregate, expiringCount, companyGroup] = await Promise.all([
      prisma.insurances.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          m_company: true,
          vehicles: true
        }
      }),
      prisma.insurances.count({ where }),
      prisma.insurances.count({
        where: {
          ...where,
          status: 'Active'
        }
      }),
      prisma.insurances.aggregate({
        where,
        _sum: {
          premium_idr: true,
          coverage_idr: true,
          premium_usd: true,
          coverage_usd: true
        }
      }),
      prisma.insurances.count({
        where: {
          ...where,
          status: 'Active',
          end_date: {
            gte: today,
            lte: thirtyDaysFromNow
          }
        }
      }),
      prisma.insurances.groupBy({
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
        totalCount: count,
        activeCount,
        totalPremiumIdr: Number(costAggregate._sum.premium_idr || 0),
        totalCoverageIdr: Number(costAggregate._sum.coverage_idr || 0),
        totalPremiumUsd: Number(costAggregate._sum.premium_usd || 0),
        totalCoverageUsd: Number(costAggregate._sum.coverage_usd || 0),
        expiringCount,
        uniqueCompaniesCount: companyGroup.filter(g => g.company_id !== null).length
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /insurances/:id
async function getInsuranceDetail(req, res, next) {
  try {
    const ins = await prisma.insurances.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        m_company: true,
        vehicles: true
      }
    });
    if (!ins) return res.status(404).json({ error: 'Insurance not found.' });
    res.json(ins);
  } catch (err) {
    next(err);
  }
}

// POST /insurances
async function createInsurance(req, res, next) {
  try {
    const data = req.body;
    if (!data.company_id || !data.policy_number) {
      return res.status(400).json({ error: 'Company ID and policy number are required.' });
    }

    const newIns = await prisma.insurances.create({
      data: {
        company_id: parseInt(data.company_id),
        insurance_company: data.insurance_company || null,
        insurance_type: data.insurance_type || null,
        category: data.category || null,
        policy_number: data.policy_number,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        vehicle_id: data.vehicle_id ? parseInt(data.vehicle_id) : null,
        vehicle_type: data.vehicle_type || null,
        premium_idr: data.premium_idr ? parseFloat(data.premium_idr) : 0,
        premium_usd: data.premium_usd ? parseFloat(data.premium_usd) : 0,
        coverage_idr: data.coverage_idr ? parseFloat(data.coverage_idr) : 0,
        coverage_usd: data.coverage_usd ? parseFloat(data.coverage_usd) : 0,
        tjh3: data.tjh3 ? parseFloat(data.tjh3) : 0,
        broker: data.broker || null,
        pic: data.pic || null,
        contact_person: data.contact_person || null,
        information: data.information || null,
        doc_url: data.doc_url || null,
        checklist_status: data.checklist_status || null,
        status: data.status || 'Active'
      }
    });
    res.status(201).json(newIns);
  } catch (err) {
    next(err);
  }
}

// PUT /insurances/:id
async function updateInsurance(req, res, next) {
  try {
    const data = req.body;
    const updated = await prisma.insurances.update({
      where: { id: parseInt(req.params.id) },
      data: {
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        insurance_company: data.insurance_company !== undefined ? data.insurance_company : undefined,
        insurance_type: data.insurance_type !== undefined ? data.insurance_type : undefined,
        category: data.category !== undefined ? data.category : undefined,
        policy_number: data.policy_number !== undefined ? data.policy_number : undefined,
        start_date: data.start_date !== undefined ? (data.start_date ? new Date(data.start_date) : null) : undefined,
        end_date: data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : undefined,
        vehicle_id: data.vehicle_id !== undefined ? (data.vehicle_id ? parseInt(data.vehicle_id) : null) : undefined,
        vehicle_type: data.vehicle_type !== undefined ? data.vehicle_type : undefined,
        premium_idr: data.premium_idr !== undefined ? parseFloat(data.premium_idr) : undefined,
        premium_usd: data.premium_usd !== undefined ? parseFloat(data.premium_usd) : undefined,
        coverage_idr: data.coverage_idr !== undefined ? parseFloat(data.coverage_idr) : undefined,
        coverage_usd: data.coverage_usd !== undefined ? parseFloat(data.coverage_usd) : undefined,
        tjh3: data.tjh3 !== undefined ? parseFloat(data.tjh3) : undefined,
        broker: data.broker !== undefined ? data.broker : undefined,
        pic: data.pic !== undefined ? data.pic : undefined,
        contact_person: data.contact_person !== undefined ? data.contact_person : undefined,
        information: data.information !== undefined ? data.information : undefined,
        doc_url: data.doc_url !== undefined ? data.doc_url : undefined,
        checklist_status: data.checklist_status !== undefined ? data.checklist_status : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /insurances/:id
async function deleteInsurance(req, res, next) {
  try {
    await prisma.insurances.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Insurance deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInsurances,
  getInsuranceDetail,
  createInsurance,
  updateInsurance,
  deleteInsurance
};
