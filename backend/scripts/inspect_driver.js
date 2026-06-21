require('dotenv').config();
const prisma = require('../api/db');

async function inspectDrivers() {
  try {
    const totalVehicles = await prisma.vehicles.count();
    const withDriver = await prisma.vehicles.count({
      where: {
        driver_name: {
          not: null,
          not: ''
        }
      }
    });

    console.log(`Total Vehicles: ${totalVehicles}`);
    console.log(`Vehicles with Driver Name: ${withDriver}`);

    const samples = await prisma.vehicles.findMany({
      take: 15,
      select: {
        plate_number: true,
        brand_model: true,
        driver_name: true,
        status: true
      }
    });

    console.log('\n--- 15 Sample Vehicles with Driver Info ---');
    console.log(JSON.stringify(samples, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDrivers();
