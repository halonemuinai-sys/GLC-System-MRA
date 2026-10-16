/**
 * Same bug as maintenances.location_id (see fix_maintenances_location_fk.js):
 * device_rentals.location_id points to m_location (always-empty building/floor/room
 * table), while every other GA "Location" picker uses m_company_branch. The field
 * isn't exposed in the Device Rentals form today, so this has been a dormant bug —
 * but any future UI/API caller that sets it would hit the same FK violation.
 * Confirmed safe: all 170 existing device_rentals rows have location_id = NULL.
 * Jalankan: node backend/scripts/fix_device_rentals_location_fk.js
 */

require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  const stillSet = await prisma.device_rentals.count({ where: { location_id: { not: null } } });
  if (stillSet > 0) {
    throw new Error(`Aborting: ${stillSet} device_rentals row(s) already have location_id set — this script assumes none do. Investigate before proceeding.`);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE glc_mra."device_rentals" DROP CONSTRAINT IF EXISTS "device_rentals_location_id_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE glc_mra."device_rentals"
    ADD CONSTRAINT "device_rentals_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES glc_mra."m_company_branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  `);
  console.log('[OK] device_rentals.location_id now references m_company_branch.');
}

main()
  .then(() => console.log('[DONE]'))
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
