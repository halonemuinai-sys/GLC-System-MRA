require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  try {
    const users = await prisma.m_user.findMany();
    console.log('--- List of Users in Database ---');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Email: "${u.email}" | Name: "${u.full_name}" | Active: ${u.is_active} | Role: "${u.role}"`);
    });
  } catch (err) {
    console.error('Error querying users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
