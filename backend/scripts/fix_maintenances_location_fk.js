/**
 * Fix: maintenances.location_id was wired to m_location (an unrelated, always-empty
 * building/floor/room table used by device_rentals), while the "Location" dropdown on
 * the Maintenance form has always fetched from m_company_branch (same source as Assets
 * module, e.g. "HO Mogems"). Any location picked in that form could never save —
 * maintenances_location_id_fkey always rejected it.
 * Confirmed safe: all 17 existing maintenance rows have location_id = NULL (nobody has
 * ever been able to successfully save a location here), so no data remapping is needed —
 * just repoint the constraint to the table the dropdown actually uses.
 * Jalankan: node backend/scripts/fix_maintenances_location_fk.js
 */

require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  const stillSet = await prisma.maintenances.count({ where: { location_id: { not: null } } });
  if (stillSet > 0) {
    throw new Error(`Aborting: ${stillSet} maintenance row(s) already have location_id set — this script assumes none do. Investigate before proceeding.`);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE glc_mra."maintenances" DROP CONSTRAINT IF EXISTS "maintenances_location_id_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE glc_mra."maintenances"
    ADD CONSTRAINT "maintenances_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES glc_mra."m_company_branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  `);
  console.log('[OK] maintenances.location_id now references m_company_branch (matches the Location dropdown).');
}

main()
  .then(() => console.log('[DONE]'))
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
