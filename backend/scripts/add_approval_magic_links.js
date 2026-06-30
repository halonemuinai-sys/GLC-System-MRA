require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

// Raw SQL (bukan `prisma db push`) demi konsistensi dengan migrasi-migrasi modul
// Marketing sebelumnya — menghindari Prisma menyentuh schema `helpdesk` yang
// dideklarasikan di schema.prisma tapi dimiliki aplikasi Helpdesk terpisah.
const sql = `
CREATE TABLE IF NOT EXISTS marketing_budget.approval_magic_links (
  id                  SERIAL PRIMARY KEY,
  token               VARCHAR(100) UNIQUE NOT NULL,
  approval_history_id INTEGER NOT NULL REFERENCES marketing_budget.approval_history(id) ON DELETE CASCADE,
  recipient_email     VARCHAR(150) NOT NULL,
  expires_at          TIMESTAMP NOT NULL,
  used_at             TIMESTAMP,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_link_token ON marketing_budget.approval_magic_links (token);
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
    console.log("Creating marketing_budget.approval_magic_links table...");
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
