const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Inisialisasi pool koneksi dari pg driver
const { parse } = require('pg-connection-string');
const dbConfig = parse(process.env.DATABASE_URL);
dbConfig.ssl = { rejectUnauthorized: false };

// The database is reached through the Supabase pooler over the internet. Opening a new
// connection occasionally hangs, and a connection can die silently; without limits a
// request then waits until nginx answers 504. So: keep a few connections warm, give up on
// a hanging connect after a few seconds and try once more, and abandon queries that get
// no answer (the pool then discards that connection).
const CONNECT_RETRIES = 1;

class RetryingPool extends Pool {
  connect(cb) {
    const attempt = (left) => super.connect().catch((err) => (
      left > 0 && /timeout/i.test(err.message) ? attempt(left - 1) : Promise.reject(err)
    ));
    const promise = attempt(CONNECT_RETRIES);
    if (typeof cb === 'function') {
      promise.then((client) => cb(undefined, client, client.release), (err) => cb(err));
      return undefined;
    }
    return promise;
  }
}

const pool = new RetryingPool({
  ...dbConfig,
  max: Number(process.env.DB_POOL_MAX) || 10,
  min: 2,                         // keep connections warm so most requests skip the slow connect
  connectionTimeoutMillis: 8000,  // a connect that hangs is abandoned (and retried once)
  idleTimeoutMillis: 60000,
  query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS) || 30000, // a query with no answer is abandoned
  keepAlive: true,                // TCP keep-alive detects dead peers on long-lived connections
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true           // scripts (migrations, one-offs) can still exit; the server stays up via its HTTP listener
});

// An idle connection that errors (e.g. closed by the pooler) must not crash the process.
pool.on('error', (err) => {
  console.error('[db] idle connection error:', err.message);
});

// Jalankan SET search_path setiap kali client baru terhubung ke pool
pool.on('connect', (client) => {
  client.query('SET search_path TO glc_mra, public')
    .catch(err => console.error('Error setting search_path:', err.message));
});

// Inisialisasi adapter database Prisma Pg
const adapter = new PrismaPg(pool);

// Inisialisasi Prisma Client dengan adapter (Prisma 7 standard)
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
