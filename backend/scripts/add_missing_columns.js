require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../api/db');

async function run() {
  console.log('Adding paid_at to payment_requests...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE marketing_budget.payment_requests
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
  `);
  console.log('OK: paid_at added (or already exists).');

  console.log('Creating marketing_plan_amendments...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS marketing_budget.marketing_plan_amendments (
      id            SERIAL PRIMARY KEY,
      marketing_plan_id INTEGER NOT NULL,
      title         VARCHAR(200) NOT NULL,
      justification TEXT NOT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      creator_id    VARCHAR(50) NOT NULL,
      reviewed_by   VARCHAR(50),
      reviewed_at   TIMESTAMPTZ,
      review_comment TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_mpa_plan    FOREIGN KEY (marketing_plan_id) REFERENCES marketing_budget.marketing_plans(id) ON DELETE CASCADE,
      CONSTRAINT fk_mpa_creator FOREIGN KEY (creator_id) REFERENCES helpdesk."User"(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
  `);
  console.log('OK: marketing_plan_amendments created (or already exists).');

  console.log('Creating marketing_plan_amendment_items...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS marketing_budget.marketing_plan_amendment_items (
      id           SERIAL PRIMARY KEY,
      amendment_id INTEGER NOT NULL,
      action       VARCHAR(20) NOT NULL,
      plan_item_id INTEGER,
      new_vendor_id INTEGER,
      budget_delta DECIMAL(18,2),
      new_item_json TEXT,
      change_reason TEXT,
      CONSTRAINT fk_mpai_amendment FOREIGN KEY (amendment_id) REFERENCES marketing_budget.marketing_plan_amendments(id) ON DELETE CASCADE
    );
  `);
  console.log('OK: marketing_plan_amendment_items created (or already exists).');

  console.log('\nDone. Regenerate Prisma client with: npx prisma generate');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('Error:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
