require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

// Pakai raw SQL (bukan `prisma db push`) karena marketing_plan_items butuh FK lintas
// schema ke glc_mra.vendors, dan schema.prisma juga mendeklarasikan model helpdesk_*
// yang TIDAK boleh disentuh/dimigrasikan oleh Prisma (tabel itu milik aplikasi Helpdesk
// terpisah). Pola ini sama dengan run_migration.js yang dipakai saat setup awal modul ini.
const sql = `
ALTER TABLE marketing_budget.marketing_plan_items
  ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES glc_mra.vendors(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
`;

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: DIRECT_URL or DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to PostgreSQL database...");
    await client.connect();
    console.log("Adding vendor_id column to marketing_budget.marketing_plan_items...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
