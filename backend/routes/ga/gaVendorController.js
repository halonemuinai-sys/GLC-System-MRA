const prisma = require('../../api/db');

// Helper function to format Vendor Name dynamically (e.g. PT CENTRIN ONLINE PRIMA -> PT Centrin Online Prima)
function formatVendorName(str) {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map(word => {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const lowerClean = cleanWord.toLowerCase();
      if (lowerClean === 'pt' || lowerClean === 'cv' || lowerClean === 'ud') {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// GET List Vendors
async function getVendors(req, res, next) {
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
}

// GET Vendor by ID
async function getVendorDetail(req, res, next) {
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
}

// POST Create Vendor
async function createVendor(req, res, next) {
  try {
    const data = req.body;
    if (!data.vendor_name) {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    const newVendor = await prisma.vendors.create({
      data: {
        vendor_code: data.vendor_code || null,
        vendor_name: formatVendorName(data.vendor_name),
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
        rating: data.rating ? parseInt(data.rating) : null,
        status: data.status || 'Active'
      }
    });
    res.status(201).json(newVendor);
  } catch (err) {
    next(err);
  }
}

// PUT Update Vendor
async function updateVendor(req, res, next) {
  try {
    const data = req.body;
    const updated = await prisma.vendors.update({
      where: { id: parseInt(req.params.id) },
      data: {
        vendor_code: data.vendor_code !== undefined ? data.vendor_code : undefined,
        vendor_name: data.vendor_name !== undefined ? formatVendorName(data.vendor_name) : undefined,
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
        rating: data.rating !== undefined ? (data.rating ? parseInt(data.rating) : null) : undefined,
        status: data.status !== undefined ? data.status : undefined
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE Vendor
async function deleteVendor(req, res, next) {
  try {
    await prisma.vendors.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Vendor deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVendors,
  getVendorDetail,
  createVendor,
  updateVendor,
  deleteVendor
};
