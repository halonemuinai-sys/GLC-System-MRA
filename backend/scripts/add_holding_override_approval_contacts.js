require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

// Project/Marketing Plan tetap per PT, tapi approval tier VP/BU/COO ditentukan dari
// Holding Group PT tersebut (bukan per-PT individual) — sesuai struktur organisasi MRA
// Group: 1 Holding bisa punya banyak PT di bawahnya, tapi VP/BU/COO-nya orang yang sama.
// company_master_id NULL = baris default global (fallback); diisi = override per Holding.
const sql = `
ALTER TABLE marketing_budget.approval_role_contacts DROP CONSTRAINT IF EXISTS approval_role_contacts_role_key;
ALTER TABLE marketing_budget.approval_role_contacts
  ADD COLUMN IF NOT EXISTS company_master_id INTEGER REFERENCES glc_mra.m_company_master(id) ON DELETE CASCADE;

-- Maksimal 1 baris default global per role
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_contacts_global_per_role
  ON marketing_budget.approval_role_contacts (role) WHERE company_master_id IS NULL;

-- Maksimal 1 override per kombinasi (role, holding)
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_contacts_role_holding
  ON marketing_budget.approval_role_contacts (role, company_master_id) WHERE company_master_id IS NOT NULL;
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
    console.log("Adding Holding Group override support to approval_role_contacts...");
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
