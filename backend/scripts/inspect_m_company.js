const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_schema = 'glc_mra' AND table_name = 'm_company';
  `;
  console.log('Columns in m_company:', columns);
  
  const sample = await prisma.m_company.findFirst();
  console.log('Sample row:', sample);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
