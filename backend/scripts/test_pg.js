require('dotenv').config();
const { Pool } = require('pg');

async function test() {
  console.log('Testing PG Pool connection from backend/scripts...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const { parse } = require('pg-connection-string');
  const config = parse(process.env.DATABASE_URL);
  config.ssl = { rejectUnauthorized: false };

  const pool = new Pool(config);

  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Success! Database time:', res.rows[0]);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

test();
