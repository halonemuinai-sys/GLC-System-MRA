require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

async function test() {
  console.log('Testing connection to pooler using exact backend config...');
  
  const dbConfig = parse(process.env.DATABASE_URL);
  dbConfig.ssl = { rejectUnauthorized: false };
  const pool = new Pool(dbConfig);

  // Test raw pg query
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('PG Success! Database time:', res.rows[0]);
  } catch (err) {
    console.error('PG Connection failed:', err);
  }

  // Test Prisma query
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Testing connection via Prisma with adapter...');
    const count = await prisma.assets.count();
    console.log('Prisma Success! Total assets:', count);
  } catch (err) {
    console.error('Prisma Connection failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
