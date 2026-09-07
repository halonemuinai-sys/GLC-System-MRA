/**
 * Migration: buat tabel glc_mra.m_user_company_access untuk scoping akses PT per user
 * Jalankan: node backend/scripts/add_user_company_access_table.js
 */

require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS glc_mra."m_user_company_access" (
      "id"         SERIAL PRIMARY KEY,
      "user_id"    INT NOT NULL REFERENCES glc_mra."m_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "company_id" INT NOT NULL REFERENCES glc_mra."m_company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
      UNIQUE ("user_id", "company_id")
    );
  `);
  console.log('[OK] Tabel m_user_company_access berhasil dibuat (atau sudah ada).');
}

main()
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
