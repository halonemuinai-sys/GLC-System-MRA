require('dotenv').config();
const prisma = require('../api/db');

async function main() {
  console.log("Starting seeding marketing metadata and approval rules...");

  // 1. Seed Brands
  const brands = [
    "Bvlgari", "Omega", "Chronologie", "Frederique Constant", "Raymond Weil",
    "Edox", "Yema", "Mido", "Rado", "Certina", "Hamilton", "Omologato", "L'Oreal Group"
  ];
  console.log("Seeding Brands...");
  for (const b of brands) {
    await prisma.m_brand.upsert({
      where: { name: b },
      update: {},
      create: { name: b }
    });
  }

  // 2. Seed Line of Business / Class
  const lobs = [
    "Merchandise", "Service Center", "Sparepart", "Repair", "Import",
    "Retail", "Shop", "Cafe", "Kiosk", "Event", "Advertising", "Direct Selling", "Partnership"
  ];
  console.log("Seeding Line of Business...");
  for (const l of lobs) {
    await prisma.m_line_business.upsert({
      where: { name: l },
      update: {},
      create: { name: l }
    });
  }

  // 3. Seed Branches
  const branches = [
    "Jakarta", "Bali", "Surabaya", "Bekasi", "Semarang", "Makassar", "Bandung", "Medan"
  ];
  console.log("Seeding Branches...");
  for (const b of branches) {
    await prisma.m_branch.upsert({
      where: { name: b },
      update: {},
      create: { name: b }
    });
  }

  // 4. Seed Approval Rules (Matrix)
  console.log("Seeding Approval Rules...");
  // Clear existing rules to avoid duplicate rules on re-run
  await prisma.approval_rules.deleteMany({});

  const rules = [
    // --- MODULE: MARKETING_PLAN ---
    // Level 1: Under 10 million - Dept Manager
    { module: "MARKETING_PLAN", min_amount: 0, max_amount: 10000000, step_number: 1, approver_role: "MARKETING_MANAGER" },
    
    // Level 2: 10M to 50M - Dept Manager then VP
    { module: "MARKETING_PLAN", min_amount: 10000000, max_amount: 50000000, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "MARKETING_PLAN", min_amount: 10000000, max_amount: 50000000, step_number: 2, approver_role: "VP_DIRECTOR" },
    
    // Level 3: 50M to 250M - Dept Manager, VP, and BU Director
    { module: "MARKETING_PLAN", min_amount: 50000000, max_amount: 250000000, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "MARKETING_PLAN", min_amount: 50000000, max_amount: 250000000, step_number: 2, approver_role: "VP_DIRECTOR" },
    { module: "MARKETING_PLAN", min_amount: 50000000, max_amount: 250000000, step_number: 3, approver_role: "BU_DIRECTOR" },
    
    // Level 4: Over 250M - Manager, VP, Director, CFO/CEO
    { module: "MARKETING_PLAN", min_amount: 250000000, max_amount: null, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "MARKETING_PLAN", min_amount: 250000000, max_amount: null, step_number: 2, approver_role: "VP_DIRECTOR" },
    { module: "MARKETING_PLAN", min_amount: 250000000, max_amount: null, step_number: 3, approver_role: "BU_DIRECTOR" },
    { module: "MARKETING_PLAN", min_amount: 250000000, max_amount: null, step_number: 4, approver_role: "CFO_CEO" },

    // --- MODULE: PAYMENT_REQUEST ---
    // Level 1: Under 10 million
    { module: "PAYMENT_REQUEST", min_amount: 0, max_amount: 10000000, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "PAYMENT_REQUEST", min_amount: 0, max_amount: 10000000, step_number: 2, approver_role: "FINANCE_CONTROLLER" },
    
    // Level 2: 10M to 50M
    { module: "PAYMENT_REQUEST", min_amount: 10000000, max_amount: 50000000, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "PAYMENT_REQUEST", min_amount: 10000000, max_amount: 50000000, step_number: 2, approver_role: "FINANCE_CONTROLLER" },
    { module: "PAYMENT_REQUEST", min_amount: 10000000, max_amount: 50000000, step_number: 3, approver_role: "VP_DIRECTOR" },
    
    // Level 3: 50M to 250M
    { module: "PAYMENT_REQUEST", min_amount: 50000000, max_amount: 250000000, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "PAYMENT_REQUEST", min_amount: 50000000, max_amount: 250000000, step_number: 2, approver_role: "FINANCE_CONTROLLER" },
    { module: "PAYMENT_REQUEST", min_amount: 50000000, max_amount: 250000000, step_number: 3, approver_role: "VP_DIRECTOR" },
    { module: "PAYMENT_REQUEST", min_amount: 50000000, max_amount: 250000000, step_number: 4, approver_role: "BU_DIRECTOR" },
    
    // Level 4: Over 250M
    { module: "PAYMENT_REQUEST", min_amount: 250000000, max_amount: null, step_number: 1, approver_role: "MARKETING_MANAGER" },
    { module: "PAYMENT_REQUEST", min_amount: 250000000, max_amount: null, step_number: 2, approver_role: "FINANCE_CONTROLLER" },
    { module: "PAYMENT_REQUEST", min_amount: 250000000, max_amount: null, step_number: 3, approver_role: "VP_DIRECTOR" },
    { module: "PAYMENT_REQUEST", min_amount: 250000000, max_amount: null, step_number: 4, approver_role: "BU_DIRECTOR" },
    { module: "PAYMENT_REQUEST", min_amount: 250000000, max_amount: null, step_number: 5, approver_role: "CFO_CEO" }
  ];

  for (const r of rules) {
    await prisma.approval_rules.create({ data: r });
  }

  console.log("Seeding complete successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
