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
    const rentalId = req.params.id; // UUID string from helpdesk.Asset.id

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    const hdAssets = await prisma.$queryRawUnsafe(`
      SELECT id, "assetTag", "deviceRef", brand, model
      FROM helpdesk."Asset"
      WHERE id = $1 AND "ownershipType" = 'RENTAL'
      LIMIT 1
    `, rentalId);

    if (!hdAssets || hdAssets.length === 0) {
      return res.status(404).json({ error: 'Asset not found in Helpdesk system.' });
    }

    const asset = hdAssets[0];

    const email = req.user.email;
    const requesterUsers = await prisma.$queryRawUnsafe(`
      SELECT id FROM helpdesk."User" WHERE email = $1 LIMIT 1
    `, email);

    if (!requesterUsers || requesterUsers.length === 0) {
      return res.status(400).json({
        error: 'Your account is not linked to a Helpdesk user. Contact IT Admin before requesting an allocation.'
      });
    }
    const requesterId = requesterUsers[0].id;

    const targetUsers = await prisma.$queryRawUnsafe(`
      SELECT id, name FROM helpdesk."User" WHERE id = $1 LIMIT 1
    `, employeeId);
    if (!targetUsers || targetUsers.length === 0) {
      return res.status(400).json({ error: 'The selected employee was not found in Helpdesk.' });
    }

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

    res.json({ success: true, message: `Allocation request for ${targetUsers[0].name} was submitted for IT Admin approval.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHelpdeskUsers,
  assignItRentalUser
};
