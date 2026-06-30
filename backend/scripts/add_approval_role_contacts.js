require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

// Tabel ini menggantikan DUMMY_APPROVER_EMAILS yang sebelumnya hardcode di
// marketingRouter.js, supaya pemetaan role -> email approval bisa diatur lewat
// menu Settings (admin) tanpa perlu ubah kode. Diseed dengan nilai dummy yang sama
// seperti sebelumnya agar tidak ada perubahan perilaku saat migrasi pertama kali.
const sql = `
CREATE TABLE IF NOT EXISTS marketing_budget.approval_role_contacts (
  id         SERIAL PRIMARY KEY,
  role       VARCHAR(50) UNIQUE NOT NULL,
  email      VARCHAR(150) NOT NULL,
  label      VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO marketing_budget.approval_role_contacts (role, email, label) VALUES
  ('MARKETING_MANAGER', 'aris@mraretail.co.id', 'Marketing Manager'),
  ('VP_DIRECTOR', 'helpdesk@mraretail.co.id', 'VP Director'),
  ('BU_DIRECTOR', 'helpdesk@mraretail.co.id', 'BU Director'),
  ('FINANCE_CONTROLLER', 'csv.ares@gmail.com', 'Finance Controller'),
  ('CFO_CEO', 'csv.ares@gmail.com', 'CFO / CEO')
ON CONFLICT (role) DO NOTHING;
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
    console.log("Creating marketing_budget.approval_role_contacts table + seeding defaults...");
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
