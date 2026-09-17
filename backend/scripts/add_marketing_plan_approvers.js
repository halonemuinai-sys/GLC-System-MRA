require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS marketing_budget.marketing_plan_approvers (
  id                  SERIAL PRIMARY KEY,
  marketing_plan_id   INTEGER NOT NULL REFERENCES marketing_budget.marketing_plans(id) ON DELETE CASCADE,
  step_number         SMALLINT NOT NULL,
  approver_name       VARCHAR(150) NOT NULL,
  approver_email      VARCHAR(150) NOT NULL,
  approver_role       VARCHAR(100),
  status              VARCHAR(20) DEFAULT 'WAITING' NOT NULL,
  action_at           TIMESTAMP,
  comment             TEXT,
  signature_url       TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_approvers_plan_id ON marketing_budget.marketing_plan_approvers(marketing_plan_id);
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
    console.log("Creating marketing_budget.marketing_plan_approvers table...");
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