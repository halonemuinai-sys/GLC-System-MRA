const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

// Folder penyimpanan file upload di server (Proxmox: /var/www/glc-system/uploads, di luar repo
// supaya tidak tersentuh git pull / deploy). Lokal default: backend/uploads (di-gitignore).
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
const PUBLIC_PREFIX = '/api/files';

// File disajikan dari domain aplikasi sendiri, jadi hanya tipe "pasif" yang diizinkan
// (tanpa HTML/SVG/JS yang bisa dipakai untuk XSS).
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.xlsx', '.xls', '.csv', '.docx', '.doc', '.pptx', '.ppt', '.txt'
]);
const INLINE_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif']);

function safeSegment(value, fallback) {
  const clean = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return clean || fallback;
}

// Simpan buffer ke UPLOAD_DIR/<folder>/<yyyy>/<mm>/<random>-<nama>. Mengembalikan path relatif.
function saveUpload(buffer, originalName, folder) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const err = new Error(`Tipe file ${ext || '(tanpa ekstensi)'} tidak diizinkan. Gunakan PDF, gambar, atau dokumen Office.`);
    err.status = 400;
    throw err;
  }
  const now = new Date();
  const relDir = path.posix.join(
    safeSegment(folder, 'general'),
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0')
  );
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  const fileName = `${crypto.randomBytes(8).toString('hex')}-${baseName}${ext}`;

  const absDir = path.join(UPLOAD_DIR, relDir);
  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(path.join(absDir, fileName), buffer);
  return path.posix.join(relDir, fileName);
}

function publicUrl(req, relPath) {
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${host}${PUBLIC_PREFIX}/${relPath}`;
}

// Static handler untuk /api/files — tanpa directory listing, gambar/PDF inline, lainnya diunduh.
const serveUploads = express.static(UPLOAD_DIR, {
  index: false,
  dotfiles: 'deny',
  fallthrough: false,
  setHeaders(res, filePath) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!INLINE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  }
});

module.exports = { UPLOAD_DIR, PUBLIC_PREFIX, saveUpload, publicUrl, serveUploads };
