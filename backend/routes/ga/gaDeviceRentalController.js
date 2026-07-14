const prisma = require('../../api/db');

// GET List Device Rentals
// GET List Device Rentals
async function getDeviceRentals(req, res, next) {
  try {
    // 1. Fetch all assets from helpdesk where ownershipType = 'RENTAL'
    const helpdeskList = await prisma.$queryRawUnsafe(`
      SELECT 
        a.id, 
        a."assetTag" AS unit_code, 
        CONCAT(a.brand, ' ', a.model) AS item_name,
        a.brand,
        a.model,
        a."rentalCost" AS price,
        a."rentalStart" AS start_rent,
        a."rentalEnd" AS end_rent,
        a.vendor AS vendor_name,
        a.status,
        a."companyId" AS company_id,
        u.id AS "assigned_user_id",
        u.name AS "assigned_user_name",
        u.department AS "assigned_user_dept",
        u.email AS "assigned_user_email"
      FROM helpdesk."Asset" a
      LEFT JOIN helpdesk."User" u ON a."userId" = u.id
      WHERE a."ownershipType" = 'RENTAL'
      ORDER BY a."createdAt" DESC
    `);

    // 2. Fetch all companies to map the company_id to the company object
    const companies = await prisma.m_company.findMany();

    // 3. Fetch pending approval requests from helpdesk
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

    // 4. Map and enrich the helpdeskList to conform to the expected format
    const enrichedList = helpdeskList.map(asset => {
      const company = companies.find(c => c.id === asset.company_id) || null;
      
      const mapped = {
        id: asset.id, // UUID String
        company_id: asset.company_id,
        device_type: 'Laptop',
        order_id: asset.unit_code,
        item_name: asset.item_name,
        price: asset.price || 0,
        unit_code: asset.unit_code,
        start_rent: asset.start_rent,
        end_rent: asset.end_rent,
        status: asset.status === 'ACTIVE' ? 'Active' : 'Inactive',
        m_company: company,
        vendors: asset.vendor_name ? { vendor_name: asset.vendor_name } : null,
        assigned_user: asset.assigned_user_id ? {
          id: asset.assigned_user_id,
          name: asset.assigned_user_name,
          department: asset.assigned_user_dept,
          email: asset.assigned_user_email
        } : null
      };

      // Determine device_type from item_name/model
      const nameLower = (asset.item_name || '').toLowerCase();
      if (nameLower.includes('laptop') || nameLower.includes('notebook')) {
        mapped.device_type = 'Laptop';
      } else if (nameLower.includes('printer') || nameLower.includes('ciss')) {
        mapped.device_type = 'Printer';
      } else if (nameLower.includes('server')) {
        mapped.device_type = 'Server';
      } else if (nameLower.includes('desktop') || nameLower.includes('pc') || nameLower.includes('computer')) {
        mapped.device_type = 'PC Desktop';
      } else if (nameLower.includes('ipad') || nameLower.includes('tablet') || nameLower.includes('tab')) {
        mapped.device_type = 'Tablet';
      } else if (nameLower.includes('smartphone') || nameLower.includes('phone') || nameLower.includes('iphone')) {
        mapped.device_type = 'Smartphone';
      } else {
        mapped.device_type = 'Laptop'; // Fallback default
      }

      // Match pending approval
      const matchingApproval = pendingApprovals.find(pa => pa.entityId === asset.id);
      if (matchingApproval) {
        mapped.pending_approval = {
          id: matchingApproval.id,
          target_user_id: matchingApproval.targetUserId,
          target_user_name: matchingApproval.targetUserName
        };
      }

      return mapped;
    });

    res.json(enrichedList);
  } catch (err) {
    next(err);
  }
}

// POST Create Device Rental
async function createDeviceRental(req, res, next) {
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
}

// PUT Update Device Rental
async function updateDeviceRental(req, res, next) {
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
}

// DELETE Device Rental
async function deleteDeviceRental(req, res, next) {
  try {
    await prisma.device_rentals.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Device rental deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDeviceRentals,
  createDeviceRental,
  updateDeviceRental,
  deleteDeviceRental
};
