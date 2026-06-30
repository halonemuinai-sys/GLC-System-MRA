require('dotenv').config();
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

async function test() {
  const config = parse(process.env.DATABASE_URL);
  config.ssl = { rejectUnauthorized: false };
  const pool = new Pool(config);

  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'helpdesk' AND table_name = 'User'
    `);
    console.log('Columns of helpdesk.User:');
    console.table(res.rows);
  } catch (err) {
    console.error('Failed to get columns:', err);
  } finally {
    await pool.end();
  }
}

test();
