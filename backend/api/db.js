const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Inisialisasi pool koneksi dari pg driver
const { parse } = require('pg-connection-string');
const dbConfig = parse(process.env.DATABASE_URL);
dbConfig.ssl = { rejectUnauthorized: false };
const pool = new Pool(dbConfig);

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
