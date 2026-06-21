require('dotenv').config();
const prisma = require('../api/db');

async function inspectVehicles() {
  try {
    const vehiclesGroup = await prisma.vehicles.groupBy({
      by: ['vehicle_type'],
      _count: {
        id: true
      }
    });
    console.log('--- vehicle_type groups in database ---');
    console.log(JSON.stringify(vehiclesGroup, null, 2));

    const sampleVehicles = await prisma.vehicles.findMany({
      take: 10,
      select: {
        plate_number: true,
        vehicle_type: true,
        brand_model: true
      }
    });
    console.log('\n--- 10 sample vehicles ---');
    console.log(JSON.stringify(sampleVehicles, null, 2));
  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectVehicles();
