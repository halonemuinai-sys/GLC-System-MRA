require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

// Marketing Plan tadinya menyimpan company_id merujuk ke helpdesk.Company (data milik
// aplikasi Helpdesk terpisah, banyak duplikat nama PT). Diganti merujuk ke glc_mra.m_company
// (master data perusahaan milik GLC Apps sendiri, bersih tanpa duplikat, sudah punya
// hierarki Holding via company_master_id). Raw SQL dipakai demi konsistensi dengan migrasi
// modul Marketing sebelumnya — menghindari Prisma menyentuh schema `helpdesk`.
const sql = `
DELETE FROM marketing_budget.marketing_plans WHERE title LIKE 'Test Magic Link Approval%' OR title LIKE 'Test Multi-Step Chain%' OR title LIKE 'Test Vendor Field%';

ALTER TABLE marketing_budget.marketing_plans DROP CONSTRAINT IF EXISTS marketing_plans_company_id_fkey;
ALTER TABLE marketing_budget.marketing_plans
  ADD CONSTRAINT marketing_plans_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES glc_mra.m_company(id) ON DELETE NO ACTION ON UPDATE NO ACTION NOT VALID;
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
    console.log("Switching marketing_plans.company_id FK to glc_mra.m_company...");
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
