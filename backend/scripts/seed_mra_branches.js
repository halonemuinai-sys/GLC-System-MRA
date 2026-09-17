require('dotenv').config();
const prisma = require('../api/db');

const branchesToSeed = [
  // PT Mogems Putri International (id: 4) - Bvlgari
  { name: 'Bvlgari Bali', company_id: 4, brandName: 'Bvlgari' },
  { name: 'Bvlgari Plaza Indonesia', company_id: 4, brandName: 'Bvlgari' },
  { name: 'Bvlgari Plaza Senayan', company_id: 4, brandName: 'Bvlgari' },

  // PT Hourlogy Indah Perkasa (id: 2) - Omega & Chronologie
  { name: 'Omega Plaza Indonesia', company_id: 2, brandName: 'Omega' },
  { name: 'Omega Plaza Senayan', company_id: 2, brandName: 'Omega' },
  { name: 'Omega Mall Kelapa Gading', company_id: 2, brandName: 'Omega' },
  { name: 'Omega Tunjungan Plaza', company_id: 2, brandName: 'Omega' },
  { name: 'Chronologie Plaza Senayan', company_id: 2, brandName: 'Chronologie' },

  // PT Rahayu Arumdhani International (id: 16) - Häagen-Dazs
  { name: 'Häagen-Dazs Plaza Senayan', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Pondok Indah Mall', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Grand Indonesia', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Mall Kelapa Gading', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Kota Kasablanka', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Senayan City', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Paris Van Java Bandung', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Tunjungan Plaza Surabaya', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Pakuwon Mall Surabaya', company_id: 16, brandName: 'Haagen dazs' },
  { name: 'Häagen-Dazs Discovery Mall Bali', company_id: 16, brandName: 'Haagen dazs' },

  // PT Emera Boga Makmur (id: 45) - Jamba
  { name: 'Jamba Central Park', company_id: 45, brandName: 'Jamba' },
  { name: 'Jamba Pondok Indah Mall', company_id: 45, brandName: 'Jamba' },
  { name: 'Jamba Grand Indonesia', company_id: 45, brandName: 'Jamba' },
  { name: 'Jamba Kota Kasablanka', company_id: 45, brandName: 'Jamba' },
  { name: 'Jamba Mall Kelapa Gading', company_id: 45, brandName: 'Jamba' },

  // PT Amanda Arumdhani Aishwarya (id: 7) - Wiggle Wiggle
  { name: 'Wiggle Wiggle Grand Indonesia', company_id: 7, brandName: 'Wiggle Wiggle' },

  // Radio Studios
  { name: 'Hard Rock FM Studio Jakarta', company_id: 15, brandName: 'Hard Rock FM Jakarta (87.6 FM)' },
  { name: 'Hard Rock FM Studio Bali', company_id: 36, brandName: 'Hard Rock FM Bali (87.8 FM)' },
  { name: 'i-Radio Studio Jakarta', company_id: 37, brandName: 'i-Radio Jakarta (89.6 FM)' },
  { name: 'i-Radio Studio Bandung', company_id: 34, brandName: 'i-Radio Bandung (105.1 FM)' },
  { name: 'i-Radio Studio Jogja', company_id: 27, brandName: 'i-Radio Jogja (88.7 FM)' },
  { name: 'Brava Radio Studio Jakarta', company_id: 21, brandName: 'Brava Radio (103.8 FM)' },
  { name: 'Cosmopolitan FM Studio Jakarta', company_id: 20, brandName: 'Cosmopolitan FM (90.4 FM)' }
];

async function seedBranches() {
  console.log('Seeding / Syncing MRA branches / stores to m_branch...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const b of branchesToSeed) {
    let brandId = null;
    if (b.brandName) {
      const brand = await prisma.m_brand.findFirst({
        where: { name: { equals: b.brandName, mode: 'insensitive' } }
      });
      if (brand) brandId = brand.id;
    }

    const existing = await prisma.m_branch.findFirst({
      where: { name: { equals: b.name, mode: 'insensitive' } }
    });

    if (existing) {
      if (existing.company_id !== b.company_id || (brandId && existing.brand_id !== brandId)) {
        await prisma.m_branch.update({
          where: { id: existing.id },
          data: {
            company_id: b.company_id,
            ...(brandId ? { brand_id: brandId } : {})
          }
        });
        updatedCount++;
      }
    } else {
      await prisma.m_branch.create({
        data: {
          name: b.name,
          company_id: b.company_id,
          brand_id: brandId
        }
      });
      createdCount++;
      console.log(`Created store/branch: "${b.name}"`);
    }
  }

  console.log(`Done! Created: ${createdCount}, Updated: ${updatedCount}`);
  const total = await prisma.m_branch.count();
  console.log(`Total branches now in m_branch: ${total}`);
  process.exit(0);
}

seedBranches().catch(err => {
  console.error('Error seeding branches:', err);
  process.exit(1);
});
