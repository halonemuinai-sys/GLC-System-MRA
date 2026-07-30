const crypto = require('crypto');
const prisma = require('../../api/db');

// Cache sederhana: key_hash -> { record, cachedAt }
// Mencegah DB hit setiap request tanpa perlu Redis
const KEY_CACHE = new Map();
const CACHE_TTL_MS = 60_000; // 1 menit

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

async function verifyApiKey(req, res, next) {
  const raw = req.headers['x-api-key'];
  if (!raw) {
    return res.status(401).json({ error: 'API key diperlukan. Sertakan header X-API-Key.' });
  }

  const hash = hashKey(raw);
  const now = Date.now();

  // Cek cache dulu
  let cached = KEY_CACHE.get(hash);
  if (!cached || now - cached.cachedAt > CACHE_TTL_MS) {
    try {
      const record = await prisma.m_api_keys.findUnique({ where: { key_hash: hash } });
      cached = { record, cachedAt: now };
      KEY_CACHE.set(hash, cached);
    } catch (err) {
      return next(err);
    }
  }

  const { record } = cached;

  if (!record) {
    return res.status(401).json({ error: 'API key tidak valid.' });
  }
  if (record.revoked_at) {
    return res.status(401).json({ error: 'API key telah dinonaktifkan.' });
  }

  // Update last_used_at secara async (fire-and-forget, tidak blokir response)
  prisma.m_api_keys.update({
    where: { key_hash: hash },
    data: { last_used_at: new Date() }
  }).catch(() => {});

  req.apiKey = { id: record.id, label: record.label, scopes: record.scopes };
  next();
}

module.exports = { verifyApiKey, hashKey };
