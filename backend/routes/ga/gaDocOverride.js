// Admin decision on a Berita Acara (BAP / BAST) from inside the app, instead of the
// designated approver using the e-mail link. It needs a reason, is written to audit_log
// and is shown on the document so it can be told apart from a normal approval.

const MIN_REASON = 8;

function overrideReason(body) {
  const reason = typeof body?.override_reason === 'string' ? body.override_reason.trim() : '';
  if (reason.length < MIN_REASON) return { error: `Enter a reason of at least ${MIN_REASON} characters for approving on the approver's behalf.` };
  return { reason: reason.slice(0, 500) };
}

// table: 'asset_disposals' | 'asset_handovers'; decision: 'APPROVE' | 'REJECT'
function logOverride(db, table, id, userId, decision, reason) {
  return db.audit_log.create({
    data: { table_name: table, record_id: id, action: 'OVERRIDE', user_id: userId || null, new_data: { decision, reason } }
  });
}

// Latest admin decision on a document, with the admin's name, or null.
async function loadOverride(db, table, id) {
  const row = await db.audit_log.findFirst({
    where: { table_name: table, record_id: id, action: 'OVERRIDE' },
    orderBy: { id: 'desc' },
    include: { m_user: { select: { full_name: true } } }
  });
  if (!row) return null;
  return { decision: row.new_data?.decision || null, reason: row.new_data?.reason || null, by: row.m_user?.full_name || null, at: row.created_at };
}

module.exports = { overrideReason, logOverride, loadOverride, MIN_REASON };
