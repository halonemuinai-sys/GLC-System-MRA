require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

const marketingCoas = [
  { name: 'Advertising & Promotion Event', code: '620101' },
  { name: 'Commision', code: '620102' },
  { name: 'Cost Of Event', code: '620103' },
  { name: 'Documentation', code: '620104' },
  { name: 'Entertainment', code: '620105' },
  { name: 'Gathering', code: '620106' },
  { name: 'Selling Expenses', code: '620107' },
  { name: 'Training', code: '620108' },
  { name: 'Travelling Expenses', code: '620109' },
  { name: 'Others', code: '620110' }
];

async function seed() {
  const dbConfig = parse(process.env.DATABASE_URL);
  dbConfig.ssl = { rejectUnauthorized: false };
  const pool = new Pool(dbConfig);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Seeding marketing CoA accounts into m_coa...');

    for (const item of marketingCoas) {
      // Find if exists by name or code
      const existing = await prisma.m_coa.findFirst({
        where: { name: item.name }
      });

      if (existing) {
        console.log(`Account "${item.name}" already exists. Updating code to ${item.code}...`);
        await prisma.m_coa.update({
          where: { id: existing.id },
          data: { code: item.code }
        });
      } else {
        console.log(`Creating new account: "${item.name}" with code ${item.code}...`);
        await prisma.m_coa.create({
          data: {
            name: item.name,
            code: item.code
          }
        });
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seed();
