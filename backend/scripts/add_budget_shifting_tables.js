require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

const sql = `
-- 1. Alter m_marketing_budget_monthly
ALTER TABLE marketing_budget.m_marketing_budget_monthly
ADD COLUMN IF NOT EXISTS quarter_number SMALLINT,
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS closed_by VARCHAR(50);

-- Update existing rows to compute quarter_number if null
UPDATE marketing_budget.m_marketing_budget_monthly
SET quarter_number = CEIL(period_month::numeric / 3)
WHERE quarter_number IS NULL;

-- 2. Create m_marketing_budget_shift
CREATE TABLE IF NOT EXISTS marketing_budget.m_marketing_budget_shift (
  id                  SERIAL PRIMARY KEY,
  marketing_budget_id INTEGER NOT NULL REFERENCES marketing_budget.m_marketing_budget(id) ON DELETE CASCADE,
  from_monthly_id     INTEGER NOT NULL REFERENCES marketing_budget.m_marketing_budget_monthly(id) ON DELETE CASCADE,
  to_monthly_id       INTEGER NOT NULL REFERENCES marketing_budget.m_marketing_budget_monthly(id) ON DELETE CASCADE,
  amount              NUMERIC(18, 2) NOT NULL,
  reason              TEXT NOT NULL,
  shift_type          VARCHAR(20) NOT NULL,
  status              VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  current_step        SMALLINT DEFAULT 1 NOT NULL,
  total_steps         SMALLINT DEFAULT 1 NOT NULL,
  creator_id          VARCHAR(50) NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_budget_id ON marketing_budget.m_marketing_budget_shift(marketing_budget_id);

-- 3. Create m_marketing_budget_shift_approver
CREATE TABLE IF NOT EXISTS marketing_budget.m_marketing_budget_shift_approver (
  id                  SERIAL PRIMARY KEY,
  shift_id            INTEGER NOT NULL REFERENCES marketing_budget.m_marketing_budget_shift(id) ON DELETE CASCADE,
  step_number         SMALLINT NOT NULL,
  approver_role       VARCHAR(50) NOT NULL,
  approver_name       VARCHAR(150) NOT NULL,
  approver_email      VARCHAR(150) NOT NULL,
  status              VARCHAR(20) DEFAULT 'WAITING' NOT NULL,
  action_at           TIMESTAMP,
  comment             TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_approver_shift_id ON marketing_budget.m_marketing_budget_shift_approver(shift_id);
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
    console.log("Executing migration for budget shifting and quarterly closing tables...");
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
