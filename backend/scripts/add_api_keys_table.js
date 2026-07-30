/**
 * Migration: buat tabel glc_mra.m_api_keys untuk autentikasi BI external
 * Jalankan: node backend/scripts/add_api_keys_table.js
 */

const prisma = require('../api/db');

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS glc_mra."m_api_keys" (
      "id"               SERIAL PRIMARY KEY,
      "label"            VARCHAR(100) NOT NULL,
      "key_hash"         VARCHAR(64)  NOT NULL UNIQUE,
      "scopes"           TEXT[]       NOT NULL DEFAULT '{}',
      "rate_limit_hour"  INT          NOT NULL DEFAULT 1000,
      "created_by"       VARCHAR(120),
      "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "last_used_at"     TIMESTAMPTZ,
      "revoked_at"       TIMESTAMPTZ
    );
  `);
  console.log('[OK] Tabel m_api_keys berhasil dibuat (atau sudah ada).');
}

main()
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
