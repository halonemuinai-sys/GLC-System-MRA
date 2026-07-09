const crypto = require('crypto');
const prisma = require('../../api/db');

// GET Helpdesk Users
async function getHelpdeskUsers(req, res, next) {
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
}

// POST Assign User to IT Rental
async function assignItRentalUser(req, res, next) {
  try {
    const { employeeId } = req.body;
    const rentalId = parseInt(req.params.id);

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    const rental = await prisma.device_rentals.findUnique({
      where: { id: rentalId }
    });

    if (!rental) {
      return res.status(404).json({ error: 'IT rental record not found.' });
    }

    if (!rental.unit_code) {
      return res.status(400).json({ error: 'Rental record does not have a unit code.' });
    }

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

    const email = req.user.email;
    const requesterUsers = await prisma.$queryRawUnsafe(`
      SELECT id FROM helpdesk."User" WHERE email = $1 LIMIT 1
    `, email);

    const requesterId = (requesterUsers && requesterUsers.length > 0) 
      ? requesterUsers[0].id 
      : '50623001'; // Default to Aris Setiyono (IT Admin)

    const existing = await prisma.$queryRawUnsafe(`
      SELECT id FROM helpdesk."ApprovalRequest"
      WHERE "entityId" = $1 AND status = 'PENDING' AND "entityType" = 'ASSET_ALLOCATION'
      LIMIT 1
    `, asset.id);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'A pending allocation request for this device already exists.' });
    }

    const newUuid = crypto.randomUUID();

    await prisma.$queryRawUnsafe(`
      INSERT INTO helpdesk."ApprovalRequest" (id, "entityType", "entityId", "entityName", reason, status, "requestedById", "createdAt", "updatedAt")
      VALUES ($1, 'ASSET_ALLOCATION', $2, $3, $4, 'PENDING', $5, NOW(), NOW())
    `, newUuid, asset.id, `${asset.assetTag} (${asset.brand} ${asset.model})`, `ALLOCATE_TO:${employeeId}`, requesterId);

    const logUuid = crypto.randomUUID();
    await prisma.$queryRawUnsafe(`
      INSERT INTO helpdesk."SystemAuditLog" (id, action, details, "performedBy", "createdAt")
      VALUES ($1, 'ASSET_ALLOCATION_REQUESTED', $2, $3, NOW())
    `, logUuid, `Allocation approval requested for Asset Tag ${asset.assetTag} to User ${employeeId} via GA System.`, `${req.user.full_name || req.user.name || 'GA User'} (${req.user.email})`);

    res.json({ success: true, message: 'Allocation request successfully submitted for Admin approval.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHelpdeskUsers,
  assignItRentalUser
};
