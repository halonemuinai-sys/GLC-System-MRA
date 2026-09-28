/**
 * Migration: creator_id (marketing_plans, payment_requests, marketing_plan_amendments,
 * m_marketing_budget_shift) dan approver_id (approval_history) dipindah dari FK helpdesk_user
 * (NIK karyawan) ke FK m_approval_signer (Master Signer) — supaya pengaju (creator) maupun
 * penyetuju (approver) plan/payment/amendment/budget-shift sama-sama pakai satu direktori
 * Master Signer, bukan tabel karyawan helpdesk yang terpisah.
 *
 * Kalau tabel sudah ada datanya, baris lama dipetakan lewat email
 * (helpdesk_user.email -> m_approval_signer.email); signer baru dibuat otomatis kalau belum
 * ada yang cocok. Skrip berhenti (rollback) kalau ada baris yang tidak bisa dipetakan.
 *
 * Jalankan: node backend/scripts/migrate_creator_approver_to_signer.js
 */

require('dotenv').config();
const prisma = require('../api/db');

const TABLES = [
  { table: 'marketing_plans', column: 'creator_id', fkName: 'marketing_plans_creator_id_fkey', notNull: true },
  { table: 'payment_requests', column: 'creator_id', fkName: 'payment_requests_creator_id_fkey', notNull: true },
  { table: 'marketing_plan_amendments', column: 'creator_id', fkName: 'fk_mpa_creator', notNull: true },
  { table: 'approval_history', column: 'approver_id', fkName: 'approval_history_approver_id_fkey', notNull: true },
  { table: 'm_marketing_budget_shift', column: 'creator_id', fkName: null, notNull: true },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1. Backfill m_approval_signer untuk setiap helpdesk_user yang pernah jadi creator/approver
    await tx.$executeRawUnsafe(`
      INSERT INTO marketing_budget."m_approval_signer" ("name", "email", "position", "is_active")
      SELECT DISTINCT hu."name", hu."email", NULL, true
      FROM helpdesk."User" hu
      WHERE hu."id" IN (
        SELECT "creator_id" FROM marketing_budget."marketing_plans"
        UNION SELECT "creator_id" FROM marketing_budget."payment_requests"
        UNION SELECT "creator_id" FROM marketing_budget."marketing_plan_amendments"
        UNION SELECT "reviewed_by" FROM marketing_budget."marketing_plan_amendments" WHERE "reviewed_by" IS NOT NULL
        UNION SELECT "approver_id" FROM marketing_budget."approval_history"
        UNION SELECT "actuals_filled_by" FROM marketing_budget."marketing_plans" WHERE "actuals_filled_by" IS NOT NULL
        UNION SELECT "creator_id" FROM marketing_budget."m_marketing_budget_shift"
      )
      ON CONFLICT ("email") DO NOTHING;
    `);
    console.log('[OK] Backfill m_approval_signer dari helpdesk_user selesai.');

    for (const { table, column, fkName, notNull } of TABLES) {
      const tmpCol = `${column}_signer_tmp`;

      await tx.$executeRawUnsafe(`ALTER TABLE marketing_budget."${table}" ADD COLUMN IF NOT EXISTS "${tmpCol}" INTEGER;`);
      await tx.$executeRawUnsafe(`
        UPDATE marketing_budget."${table}" t
        SET "${tmpCol}" = s."id"
        FROM helpdesk."User" hu
        JOIN marketing_budget."m_approval_signer" s ON s."email" = hu."email"
        WHERE t."${column}" = hu."id";
      `);

      const orphans = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM marketing_budget."${table}" WHERE "${tmpCol}" IS NULL;`
      );
      if (orphans[0].c > 0) {
        throw new Error(`${table}.${column}: ${orphans[0].c} baris tidak bisa dipetakan ke Master Signer manapun, migrasi dibatalkan.`);
      }

      if (fkName) {
        await tx.$executeRawUnsafe(`ALTER TABLE marketing_budget."${table}" DROP CONSTRAINT IF EXISTS "${fkName}";`);
      }
      await tx.$executeRawUnsafe(`ALTER TABLE marketing_budget."${table}" DROP COLUMN "${column}";`);
      await tx.$executeRawUnsafe(`ALTER TABLE marketing_budget."${table}" RENAME COLUMN "${tmpCol}" TO "${column}";`);
      if (notNull) {
        await tx.$executeRawUnsafe(`ALTER TABLE marketing_budget."${table}" ALTER COLUMN "${column}" SET NOT NULL;`);
      }
      await tx.$executeRawUnsafe(`
        ALTER TABLE marketing_budget."${table}"
        ADD CONSTRAINT "${fkName || `${table}_${column}_fkey`}"
        FOREIGN KEY ("${column}") REFERENCES marketing_budget."m_approval_signer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
      console.log(`[OK] ${table}.${column} -> m_approval_signer.`);
    }

    // actuals_filled_by (marketing_plans) & reviewed_by (marketing_plan_amendments) tetap VARCHAR
    // (tidak pernah di-FK), isinya cuma dirapikan jadi id signer dalam bentuk teks.
    await tx.$executeRawUnsafe(`
      UPDATE marketing_budget."marketing_plans" mp
      SET "actuals_filled_by" = s."id"::text
      FROM helpdesk."User" hu
      JOIN marketing_budget."m_approval_signer" s ON s."email" = hu."email"
      WHERE mp."actuals_filled_by" = hu."id";
    `);
    await tx.$executeRawUnsafe(`
      UPDATE marketing_budget."marketing_plan_amendments" mpa
      SET "reviewed_by" = s."id"::text
      FROM helpdesk."User" hu
      JOIN marketing_budget."m_approval_signer" s ON s."email" = hu."email"
      WHERE mpa."reviewed_by" = hu."id";
    `);
    console.log('[OK] actuals_filled_by & reviewed_by dirapikan (tetap VARCHAR, tanpa FK).');
  }, { timeout: 30000 });
}

main()
  .then(() => console.log('[DONE] Migrasi creator/approver -> Master Signer selesai.'))
  .catch(e => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
