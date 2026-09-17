require('dotenv').config();
const prisma = require('../api/db');

const brandMappings = [
  // PT Mogems Putri International (id: 4) - Luxury Jewelry & Watches
  { name: 'Bvlgari', company_id: 4 },
  { name: 'Bvlgari Fragrances & Accessories', company_id: 4 },

  // PT Hourlogy Indah Perkasa (id: 2) - Timepieces & Chronologie
  { name: 'Omega', company_id: 2 },
  { name: 'Chronologie', company_id: 2 },
  { name: 'Frederique Constant', company_id: 2 },
  { name: 'Raymond Weil', company_id: 2 },
  { name: 'Edox', company_id: 2 },
  { name: 'Yema', company_id: 2 },
  { name: 'Mido', company_id: 2 },
  { name: 'Rado', company_id: 2 },
  { name: 'Certina', company_id: 2 },
  { name: 'Hamilton', company_id: 2 },
  { name: 'Omologato', company_id: 2 },
  { name: 'Maen', company_id: 2 },

  // PT Hourlogy Inti Semesta (id: 3)
  { name: 'Hourlogy Services', company_id: 3 },

  // PT Rahayu Arumdhani International (id: 16) - Food & Beverage
  { name: 'Haagen dazs', company_id: 16 },
  { name: 'Häagen-Dazs Shops', company_id: 16 },

  // PT Rahayu Arumdhani Distribusindo (id: 17)
  { name: 'Häagen-Dazs Distribution', company_id: 17 },

  // PT Emera Boga Makmur (id: 45)
  { name: 'Jamba', company_id: 45 },
  { name: 'Jamba Juice Indonesia', company_id: 45 },

  // PT Amanda Arumdhani Aishwarya (id: 7) - Lifestyle / Retail
  { name: 'Wiggle Wiggle', company_id: 7 },

  // PT Media Insani Abadi (id: 5) - Media Publications
  { name: "Harper's Bazaar Indonesia", company_id: 5 },
  { name: 'Her World Indonesia', company_id: 5 },
  { name: 'CASA Indonesia', company_id: 5 },

  // PT Higina Alhadin (id: 14)
  { name: 'Cosmopolitan Indonesia', company_id: 14 },

  // PT Media Mitra Bunda (id: 32)
  { name: 'Mother & Beyond', company_id: 32 },

  // PT Artindo Jakarta Seni Kini (id: 132) - Arts
  { name: 'Art Jakarta', company_id: 132 },
  { name: 'Art Jakarta Gardens', company_id: 132 },

  // Radio Broadcast Division
  // PT Surya Swara Mediatama (id: 15)
  { name: 'Hard Rock FM Jakarta (87.6 FM)', company_id: 15 },

  // PT Radio Suara Kedjajaan (id: 37)
  { name: 'i-Radio Jakarta (89.6 FM)', company_id: 37 },
  { name: 'iSWARA', company_id: 37 },

  // PT Radio Antar Nusa Djaja (id: 21)
  { name: 'Brava Radio (103.8 FM)', company_id: 21 },

  // PT Radio Mustika Abadi (id: 20)
  { name: 'Cosmopolitan FM (90.4 FM)', company_id: 20 },

  // PT Radio Ekacita Swara Buana (id: 36)
  { name: 'Hard Rock FM Bali (87.8 FM)', company_id: 36 },

  // PT Radio Harini Jaya Mandiri (id: 34)
  { name: 'i-Radio Bandung (105.1 FM)', company_id: 34 },

  // PT Radio Suara Sonata (id: 27)
  { name: 'i-Radio Jogja (88.7 FM)', company_id: 27 },

  // Corporate & Digital
  // PT Emera Digital Indonesia (id: 129)
  { name: 'MRA Digital', company_id: 129 },

  // PT Mugi Rekso Abadi (id: 1)
  { name: 'MRA Media', company_id: 1 },
  { name: 'MRA Broadcast Academy', company_id: 1 },
  { name: 'MRA Group Corporate', company_id: 1 }
];

async function seedBrands() {
  console.log('Seeding / Syncing official MRA brands to m_brand...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const b of brandMappings) {
    const existing = await prisma.m_brand.findFirst({
      where: { name: { equals: b.name, mode: 'insensitive' } }
    });

    if (existing) {
      if (existing.company_id !== b.company_id) {
        await prisma.m_brand.update({
          where: { id: existing.id },
          data: { company_id: b.company_id }
        });
        updatedCount++;
        console.log(`Updated company_id for "${existing.name}" -> ${b.company_id}`);
      }
    } else {
      await prisma.m_brand.create({
        data: {
          name: b.name,
          company_id: b.company_id
        }
      });
      createdCount++;
      console.log(`Created new brand: "${b.name}" (company: ${b.company_id})`);
    }
  }

  console.log(`Done! Created: ${createdCount}, Updated: ${updatedCount}.`);
  const total = await prisma.m_brand.count();
  console.log(`Total brands now in m_brand: ${total}`);
  process.exit(0);
}

seedBrands().catch(err => {
  console.error('Error seeding brands:', err);
  process.exit(1);
});
