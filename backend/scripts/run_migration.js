require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

const sql = `
-- 1. Create Schema if not exists
CREATE SCHEMA IF NOT EXISTS marketing_budget;

-- 2. Create m_brand table
CREATE TABLE IF NOT EXISTS marketing_budget.m_brand (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Create m_line_business table
CREATE TABLE IF NOT EXISTS marketing_budget.m_line_business (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. Create m_branch table
CREATE TABLE IF NOT EXISTS marketing_budget.m_branch (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 5. Create marketing_plans table
CREATE TABLE IF NOT EXISTS marketing_budget.marketing_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    company_id INTEGER NOT NULL REFERENCES helpdesk."Company"(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    fiscal_year SMALLINT NOT NULL,
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(18,2) DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' NOT NULL,
    creator_id VARCHAR(50) NOT NULL REFERENCES helpdesk."User"(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Create marketing_plan_items table
CREATE TABLE IF NOT EXISTS marketing_budget.marketing_plan_items (
    id SERIAL PRIMARY KEY,
    marketing_plan_id INTEGER NOT NULL REFERENCES marketing_budget.marketing_plans(id) ON DELETE CASCADE,
    coa_id INTEGER NOT NULL REFERENCES glc_mra.m_coa(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    brand_id INTEGER REFERENCES marketing_budget.m_brand(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    lob_id INTEGER REFERENCES marketing_budget.m_line_business(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    branch_id INTEGER REFERENCES marketing_budget.m_branch(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    period_month SMALLINT NOT NULL,
    budget_amount DECIMAL(18,2) DEFAULT 0 NOT NULL,
    actual_amount DECIMAL(18,2) DEFAULT 0 NOT NULL,
    description VARCHAR(255)
);

-- 7. Create payment_requests table
CREATE TABLE IF NOT EXISTS marketing_budget.payment_requests (
    id SERIAL PRIMARY KEY,
    marketing_plan_item_id INTEGER NOT NULL REFERENCES marketing_budget.marketing_plan_items(id) ON DELETE NO ACTION,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    notes TEXT,
    doc_url TEXT,
    creator_id VARCHAR(50) NOT NULL REFERENCES helpdesk."User"(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Create approval_rules table
CREATE TABLE IF NOT EXISTS marketing_budget.approval_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES helpdesk."Company"(id) ON DELETE NO ACTION,
    module VARCHAR(50) NOT NULL,
    min_amount DECIMAL(18,2) DEFAULT 0 NOT NULL,
    max_amount DECIMAL(18,2),
    step_number SMALLINT NOT NULL,
    approver_role VARCHAR(50) NOT NULL
);

-- 9. Create approval_history table
CREATE TABLE IF NOT EXISTS marketing_budget.approval_history (
    id SERIAL PRIMARY KEY,
    marketing_plan_id INTEGER REFERENCES marketing_budget.marketing_plans(id) ON DELETE CASCADE,
    payment_request_id INTEGER REFERENCES marketing_budget.payment_requests(id) ON DELETE CASCADE,
    approver_id VARCHAR(50) NOT NULL REFERENCES helpdesk."User"(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    step_number SMALLINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    comment TEXT,
    signature_url TEXT,
    action_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

async function run() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Error: DIRECT_URL or DATABASE_URL environment variable is missing.");
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Connecting to PostgreSQL database...");
        await client.connect();
        console.log("Executing SQL migration script...");
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
