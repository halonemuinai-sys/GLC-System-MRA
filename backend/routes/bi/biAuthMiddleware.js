const crypto = require('crypto');
const prisma = require('../../api/db');

// Scopes that have endpoints today. The admin form only offers these, and a key can
// only reach routes of the scopes it holds (see requireScope in biRouter).
const BI_SCOPES = {
  ga: {
    label: 'General Affairs',
    endpoints: [
      '/api/bi/ga/overview', '/api/bi/ga/expenses', '/api/bi/ga/assets', '/api/bi/ga/assets/list',
      '/api/bi/ga/vendors', '/api/bi/ga/maintenance', '/api/bi/ga/insurance', '/api/bi/ga/scorecard'
    ]
  }
};

// Older keys were issued with namespaced scopes; they map onto today's scope keys.
const SCOPE_ALIASES = { 'bi:ga:read': 'ga' };
const normalizeScopes = (scopes) => [...new Set((scopes || []).map(s => SCOPE_ALIASES[s] || s))];

// Cache key_hash -> { record, cachedAt } to avoid a DB hit per request. Revoking a key
// clears its entry immediately (forgetApiKey); the short TTL bounds staleness if the
// API ever runs as several processes.
const KEY_CACHE = new Map();
const CACHE_TTL_MS = 15_000;

// Fixed hourly window per key: id -> { windowStart, count }. In-memory, so the limit is
// per process; with a single PM2 instance it is exact.
const USAGE = new Map();
const HOUR_MS = 60 * 60 * 1000;

// last_used_at is written at most once per minute per key.
const LAST_USED_WRITE = new Map();
const LAST_USED_INTERVAL_MS = 60_000;

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function forgetApiKey(id) {
  for (const [hash, entry] of KEY_CACHE) {
    if (entry.record?.id === id) KEY_CACHE.delete(hash);
  }
  USAGE.delete(id);
}

function currentWindow(now = Date.now()) {
  return now - (now % HOUR_MS);
}

function getUsage(id, now = Date.now()) {
  const entry = USAGE.get(id);
  return entry && entry.windowStart === currentWindow(now) ? entry.count : 0;
}

async function verifyApiKey(req, res, next) {
  const raw = req.headers['x-api-key'];
  if (!raw) {
    return res.status(401).json({ error: 'API key diperlukan. Sertakan header X-API-Key.' });
  }

  const hash = hashKey(String(raw));
  const now = Date.now();

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

  // Hourly rate limit.
  const windowStart = currentWindow(now);
  const usage = USAGE.get(record.id);
  const count = usage && usage.windowStart === windowStart ? usage.count : 0;
  const limit = record.rate_limit_hour || 1000;
  const resetSeconds = Math.ceil((windowStart + HOUR_MS - now) / 1000);
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Reset', String(Math.ceil((windowStart + HOUR_MS) / 1000)));
  if (count >= limit) {
    res.set('X-RateLimit-Remaining', '0');
    res.set('Retry-After', String(resetSeconds));
    return res.status(429).json({ error: `Batas ${limit} request per jam tercapai. Coba lagi dalam ${Math.ceil(resetSeconds / 60)} menit.` });
  }
  USAGE.set(record.id, { windowStart, count: count + 1 });
  res.set('X-RateLimit-Remaining', String(limit - count - 1));

  if (now - (LAST_USED_WRITE.get(record.id) || 0) > LAST_USED_INTERVAL_MS) {
    LAST_USED_WRITE.set(record.id, now);
    prisma.m_api_keys.update({ where: { id: record.id }, data: { last_used_at: new Date() } }).catch(() => {});
  }

  req.apiKey = { id: record.id, label: record.label, scopes: normalizeScopes(record.scopes) };
  next();
}

// Route guard: the key must hold the given scope.
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey?.scopes?.includes(scope)) {
      return res.status(403).json({ error: `API key ini tidak memiliki akses scope "${scope}".` });
    }
    next();
  };
}

module.exports = { verifyApiKey, requireScope, hashKey, forgetApiKey, getUsage, normalizeScopes, BI_SCOPES };
