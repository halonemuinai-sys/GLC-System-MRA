const prisma = require('../../api/db');

// GET List Device Rentals
async function getDeviceRentals(req, res, next) {
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

    const enrichedList = list.map(rental => {
      const plainRental = { ...rental };
      if (!rental.unit_code) return plainRental;

      const codeLower = rental.unit_code.toLowerCase().trim();

      const matchingAsset = helpdeskAssets.find(ha => {
        const tag = (ha.assetTag || '').toLowerCase().trim();
        const ref = (ha.deviceRef || '').toLowerCase().trim();
        return codeLower === tag || codeLower === ref;
      });

      if (matchingAsset) {
        plainRental.assigned_user = matchingAsset.userId ? {
          id: matchingAsset.userId,
          name: matchingAsset.userName,
          department: matchingAsset.userDept,
          email: matchingAsset.userEmail
        } : null;

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
