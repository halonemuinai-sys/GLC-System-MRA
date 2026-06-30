require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const prisma = require('../api/db');

async function main() {
  try {
    const helpdeskUsers = await prisma.helpdesk_user.findMany({
      include: { company: true }
    });
    console.log(`Total helpdesk users: ${helpdeskUsers.length}`);
    console.log("Sample helpdesk users:", helpdeskUsers.slice(0, 5));
  } catch (err) {
    console.error("Failed to fetch helpdesk users:", err.message);
  }

  try {
    const glcUsers = await prisma.m_user.findMany();
    console.log(`Total glc_mra users: ${glcUsers.length}`);
    console.log("Sample glc_mra users:", glcUsers.slice(0, 5));
  } catch (err) {
    console.error("Failed to fetch glc_mra users:", err.message);
  }
}

main().finally(() => prisma.$disconnect());
