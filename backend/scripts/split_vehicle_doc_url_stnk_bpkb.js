/**
 * Migration: pecah kolom tunggal vehicles.doc_url jadi 2 link terpisah — STNK & BPKB.
 * Data lama (14 kendaraan sudah terisi doc_url) dianggap link STNK (field generik
 * sebelumnya paling sering dipakai untuk itu), jadi doc_url di-rename jadi stnk_url
 * supaya tidak hilang, lalu bpkb_url ditambah sebagai kolom baru kosong.
 * Jalankan: node backend/scripts/split_vehicle_doc_url_stnk_bpkb.js
 */

require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE glc_mra."vehicles" RENAME COLUMN "doc_url" TO "stnk_url";
  `);
  console.log('[OK] vehicles.doc_url -> vehicles.stnk_url (data lama dipertahankan).');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE glc_mra."vehicles" ADD COLUMN IF NOT EXISTS "bpkb_url" TEXT;
  `);
  console.log('[OK] Kolom vehicles.bpkb_url siap.');
}

main()
  .then(() => console.log('[DONE] Migrasi STNK/BPKB selesai.'))
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
