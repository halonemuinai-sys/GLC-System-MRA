/**
 * Migration: tabel m_approval_signer (master data signer/approver) + kolom company_id & signer_id
 * di approval_role_contacts (untuk override approval per PT individual, bukan cuma per Holding Group)
 * Jalankan: node backend/scripts/add_approval_signer_and_pt_override.js
 */

require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS marketing_budget."m_approval_signer" (
      "id"         SERIAL PRIMARY KEY,
      "name"       VARCHAR(150) NOT NULL,
      "email"      VARCHAR(150) NOT NULL UNIQUE,
      "position"   VARCHAR(100),
      "is_active"  BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[OK] Tabel m_approval_signer siap.');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      ADD COLUMN IF NOT EXISTS "company_id" INT,
      ADD COLUMN IF NOT EXISTS "signer_id" INT;
  `);
  console.log('[OK] Kolom company_id & signer_id siap di approval_role_contacts.');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      DROP CONSTRAINT IF EXISTS "approval_role_contacts_role_company_master_id_key";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      ADD CONSTRAINT "approval_role_contacts_role_company_master_id_company_id_key"
      UNIQUE ("role", "company_master_id", "company_id");
  `);
  console.log('[OK] Unique constraint diperbarui ke (role, company_master_id, company_id).');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      DROP CONSTRAINT IF EXISTS "approval_role_contacts_company_id_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      ADD CONSTRAINT "approval_role_contacts_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES glc_mra."m_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      DROP CONSTRAINT IF EXISTS "approval_role_contacts_signer_id_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget."approval_role_contacts"
      ADD CONSTRAINT "approval_role_contacts_signer_id_fkey"
      FOREIGN KEY ("signer_id") REFERENCES marketing_budget."m_approval_signer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `);
  console.log('[OK] Foreign key company_id & signer_id siap.');
}

main()
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
