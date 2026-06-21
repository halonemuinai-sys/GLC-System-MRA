const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const prisma = require('../api/db');
const { verifyToken, JWT_SECRET } = require('../api/authMiddleware');

const router = express.Router();

/**
 * POST /api/auth/login
 * Menangani proses masuk pengguna (Login)
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt received in backend:', { email, password });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Cari user di database m_user
    const user = await prisma.m_user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact administrator.' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Account password not configured. Please contact administrator.' });
    }

    // Bandingkan password input dengan password hash di database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Buat JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Kirim respon detail user (tanpa password)
    const { password: _, ...userData } = user;
    res.json({
      token,
      user: userData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Mendapatkan profil aktif user dari token JWT yang dikirimkan
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.m_user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { password: _, ...userData } = user;
    res.json(userData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 * Membuat token reset password dan mengirimkan link reset (dev: dikembalikan di response)
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.m_user.findUnique({ where: { email: normalizedEmail } });

    // Selalu balas success agar tidak membocorkan email mana yang terdaftar
    if (!user || !user.is_active) {
      return res.json({ success: true });
    }

    await prisma.password_reset_tokens.deleteMany({ where: { email: normalizedEmail } });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 jam

    await prisma.password_reset_tokens.create({
      data: { email: normalizedEmail, token, expires_at: expiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // TODO production: kirim resetUrl via email (SMTP/Resend). Untuk dev, link dikembalikan langsung.
    const isDev = process.env.NODE_ENV !== 'production';
    res.json({ success: true, ...(isDev ? { resetUrl } : {}) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Memvalidasi token reset dan menyimpan password baru
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    }

    const record = await prisma.password_reset_tokens.findUnique({ where: { token } });
    if (!record || record.expires_at < new Date()) {
      return res.status(400).json({ error: 'Link reset tidak valid atau sudah kadaluarsa.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.m_user.update({ where: { email: record.email }, data: { password: hashed } });
    await prisma.password_reset_tokens.delete({ where: { token } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
