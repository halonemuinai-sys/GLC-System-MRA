const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

module.exports = router;
