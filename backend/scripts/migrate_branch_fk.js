require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

async function migrate() {
  const dbConfig = parse(process.env.DATABASE_URL);
  dbConfig.ssl = { rejectUnauthorized: false };
  const pool = new Pool(dbConfig);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Starting foreign key migration for branch_id...');

    // 1. Drop existing FK constraint if exists
    console.log('Dropping existing branch_id foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE marketing_budget.marketing_plan_items 
      DROP CONSTRAINT IF EXISTS marketing_plan_items_branch_id_fkey
    `);
    console.log('Foreign key constraint dropped.');

    // 2. Set existing branch_id to NULL to prevent referential integrity failure
    console.log('Setting existing branch_id values to NULL...');
    await prisma.$executeRawUnsafe(`
      UPDATE marketing_budget.marketing_plan_items SET branch_id = NULL
    `);
    console.log('Existing branch_id values cleared.');

    // 3. Add new FK constraint referencing glc_mra.m_company_branch
    console.log('Adding new foreign key constraint referencing glc_mra.m_company_branch(id)...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE marketing_budget.marketing_plan_items 
      ADD CONSTRAINT marketing_plan_items_branch_id_fkey 
      FOREIGN KEY (branch_id) 
      REFERENCES glc_mra.m_company_branch(id) 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log('New foreign key constraint added successfully!');

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

migrate();
