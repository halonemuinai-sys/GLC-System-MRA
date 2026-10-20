const prisma = require('./db');

// Safeguards for approval links (marketing plan / payment, campaign closing, BAP, BAST).
// Links are bearer links; decisions taken through them are rate limited per IP and logged
// with the approver e-mail, IP and browser so they can be traced.

function clientIp(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || req.ip || req.socket?.remoteAddress || '').slice(0, 64);
}

// E-mail the approval link was sent to, for the audit trail (null when unknown).
async function linkRecipient(scope, token) {
  if (!token) return null;
  if (scope === 'MKT') {
    const link = await prisma.approval_magic_links.findUnique({ where: { token }, select: { recipient_email: true } });
    return link?.recipient_email || null;
  }
  if (scope === 'CLOSING') {
    const closing = await prisma.marketing_plan_closings.findUnique({
      where: { magic_link_token: token },
      select: { current_step: true, approvers: { select: { step_number: true, signer: { select: { email: true } } } } }
    });
    return closing?.approvers.find(a => a.step_number === closing.current_step)?.signer?.email || null;
  }
  if (scope === 'BAP' || scope === 'BAST') {
    const model = scope === 'BAP' ? prisma.asset_disposals : prisma.asset_handovers;
    const doc = await model.findUnique({ where: { magic_link_token: token }, select: { approver: { select: { email: true } } } });
    return doc?.approver?.email || null;
  }
  return null;
}

// Audit trail of a decision taken through a link: who (e-mail), from where (IP, browser).
function logLinkDecision(scope, recordId, action, req, email) {
  return prisma.audit_log.create({
    data: {
      table_name: `magic_${scope.toLowerCase()}`.slice(0, 50),
      record_id: recordId,
      action: 'LINK_DEC',
      new_data: { scope, action, email, ip: clientIp(req), user_agent: String(req.headers?.['user-agent'] || '').slice(0, 255) }
    }
  }).catch(err => console.error('[magic] decision log failed:', err.message));
}

// Simple per-IP limiter for the public approval endpoints (no extra dependency).
function linkRateLimit({ windowMs = 10 * 60 * 1000, max = 60 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = clientIp(req) || 'unknown';
    const entry = hits.get(ip);
    if (!entry || now - entry.start > windowMs) hits.set(ip, { start: now, count: 1 });
    else if (++entry.count > max) return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
    next();
  };
}

module.exports = { clientIp, linkRecipient, logLinkDecision, linkRateLimit };
