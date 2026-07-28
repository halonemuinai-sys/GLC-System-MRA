require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../api/db');

async function run() {
  console.log('Adding subType and formData columns to helpdesk."Ticket"...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE helpdesk."Ticket"
    ADD COLUMN IF NOT EXISTS "subType" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "formData" JSONB,
    ADD COLUMN IF NOT EXISTS "ticketType" VARCHAR(30) DEFAULT 'insiden';
  `);
  console.log('OK: columns added (or already exist).');
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
