const prisma = require('../../api/db');

function rentalDurationMonths(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
}

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
      const company = companies.find(c => String(c.id) === String(asset.company_id)) || null;
      
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
        duration_months: rentalDurationMonths(asset.start_rent, asset.end_rent),
        status: asset.status === 'DISPOSED' ? 'Inactive' : 'Active',
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
        mapped.device_type = 'IT Device';
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

// IT Rentals are read from Helpdesk Asset Inventory. Do not create a second,
// invisible record in the legacy GA table.
async function createDeviceRental(req, res, next) {
  return res.status(409).json({
    error: 'IT rentals are managed in Helpdesk Asset Inventory. Create the rental there so it appears in this dashboard.'
  });
}

// Legacy records must not be edited here because this screen displays Helpdesk data.
async function updateDeviceRental(req, res, next) {
  return res.status(409).json({
    error: 'IT rentals are managed in Helpdesk Asset Inventory. Update the asset there to keep this dashboard in sync.'
  });
}

// Same source-of-truth protection for deletes.
async function deleteDeviceRental(req, res, next) {
  return res.status(409).json({
    error: 'IT rentals are managed in Helpdesk Asset Inventory. Remove the rental there to keep this dashboard in sync.'
  });
}

module.exports = {
  getDeviceRentals,
  createDeviceRental,
  updateDeviceRental,
  deleteDeviceRental
};
