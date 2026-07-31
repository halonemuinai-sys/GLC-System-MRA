/**
 * Script: Buat tabel m_api_keys secara manual via raw SQL
 * Ini menghindari prisma db push yang bisa konflik dengan schema lain.
 */
require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  try {
    console.log('📦 Membuat tabel glc_mra.m_api_keys ...');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS glc_mra.m_api_keys (
        id              SERIAL PRIMARY KEY,
        label           VARCHAR(100) NOT NULL,
        key_hash        VARCHAR(64) NOT NULL UNIQUE,
        scopes          TEXT[] DEFAULT '{}',
        rate_limit_hour INT DEFAULT 1000,
        created_by      VARCHAR(120),
        created_at      TIMESTAMP(6) DEFAULT NOW(),
        last_used_at    TIMESTAMP(6),
        revoked_at      TIMESTAMP(6)
      );
    `);

    console.log('✅ Tabel glc_mra.m_api_keys berhasil dibuat (atau sudah ada).');
  } catch (err) {
    console.error('❌ Gagal:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
