require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Client } = require('pg');

// Membersihkan 7 baris m_company_master (Holding Group) yang ternyata tidak pernah
// benar-benar dipakai oleh PT manapun — masing-masing namanya persis sama dengan 1 PT
// individual (kemungkinan placeholder yang dibuat otomatis saat PT itu ditambahkan, tapi
// company_master_id si PT tidak pernah benar-benar dihubungkan ke placeholder-nya).
// PT Mogems Putri International TIDAK diubah — link-nya ke Holding id 5
// (PT Hourlogy Indah Perkasa, divisi retail) dianggap valid, bagian dari data master asli.
const GHOST_HOLDING_IDS = [6, 7, 8, 9, 10, 11, 12];

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: DIRECT_URL or DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to PostgreSQL database...");
    await client.connect();

    console.log("Verifying ghost holdings are unused by any m_company row...");
    const check = await client.query(
      `SELECT cm.id, cm.name, count(c.id) AS company_count
       FROM glc_mra.m_company_master cm
       LEFT JOIN glc_mra.m_company c ON c.company_master_id = cm.id
       WHERE cm.id = ANY($1)
       GROUP BY cm.id, cm.name
       ORDER BY cm.id`,
      [GHOST_HOLDING_IDS]
    );
    console.table(check.rows);

    const stillUsed = check.rows.filter(r => Number(r.company_count) > 0);
    if (stillUsed.length > 0) {
      console.error("Aborting: some of these holdings are still referenced by a company:", stillUsed);
      process.exit(1);
    }

    console.log("Deleting ghost holdings (m_company_branch references will be SET NULL automatically)...");
    const result = await client.query(
      `DELETE FROM glc_mra.m_company_master WHERE id = ANY($1)`,
      [GHOST_HOLDING_IDS]
    );
    console.log(`Deleted ${result.rowCount} ghost holding rows.`);
  } catch (err) {
    console.error("Cleanup failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
