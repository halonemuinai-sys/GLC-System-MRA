require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan semua origin secara dinamis dengan mengembalikan origin asal request
    // Ini mendukung credentials: true agar cookie & auth token tidak ke-block browser
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rute Dasar
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', (req, res) => {
  res.json({ message: 'GLC MRA System Backend API is running locally.' });
});

// Mount modular routes
const { verifyToken, checkRole } = require('./authMiddleware');
app.use('/api/auth', require('../routes/authRouter'));
app.use('/api/ga', require('../routes/gaRouter'));
app.use('/api/legal', require('../routes/legalRouter'));
app.use('/api/compliance', require('../routes/complianceRouter'));
app.use('/api/master', require('../routes/masterRouter'));
// Catatan: verifyToken TIDAK dipasang di level mount ini (beda dari router lain) —
// setiap route di marketingRouter.js sudah memanggil verifyToken sendiri-sendiri,
// KECUALI 2 endpoint /magic/:token yang sengaja publik untuk approval via email (magic link)
app.use('/api/marketing', require('../routes/marketingRouter'));
app.use('/api/admin', [verifyToken, checkRole(['admin'])], require('../routes/adminRouter'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[error]', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Health-Check & Test Database Connection
app.get('/api/health-check', async (req, res) => {
  try {
    // Menghitung jumlah user dari tabel m_user di skema glc_mra
    const userCount = await prisma.m_user.count();
    res.json({
      status: 'OK',
      database: 'Connected to Supabase (glc_mra)',
      stats: {
        totalUsers: userCount
      }
    });
  } catch (err) {
    console.error('Database connection test failed:', err.message);
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      message: err.message
    });
  }
});

// Port Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[server] Server GLC MRA berjalan di http://localhost:${PORT}`);
});

module.exports = app;
