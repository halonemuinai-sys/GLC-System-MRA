// Include all ID-based references, including other modules sharing this master.
const signerUsageInclude = {
  _count: { select: {
    approval_role_contacts: true,
    marketing_plans: true,
    payment_requests: true,
    marketing_plan_amendments: true,
    approval_history: true,
    marketing_budget_shifts: true,
    asset_disposals: true,
    asset_handovers: true,
    closings_submitted: true,
    closings_to_approve: true,
    closing_approval_steps: true,
  } },
};

const normalizeEmail = email => String(email || '').trim().toLowerCase();
const TRANSACTION_MESSAGE = 'This approver is used in transactions or approval history and cannot be deleted. Deactivate it instead.';
const CONFIGURATION_MESSAGE = 'This approver is still used in automatic recipient settings. Change those recipients before deleting.';

async function withSignerUsage(db, signers) {
  if (!signers.length) return [];
  const emails = [...new Set(signers.map(signer => normalizeEmail(signer.email)).filter(Boolean))];
  // These legacy document snapshots have no signer_id. Batch by email to avoid
  // one usage query per directory row; all statuses (including drafts) count.
  const sources = [
    [db.marketing_plan_approvers, 'approver_email', 'transaction'],
    [db.approval_magic_links, 'recipient_email', 'transaction'],
    [db.m_marketing_budget_shift_approver, 'approver_email', 'transaction'],
    [db.approval_role_contacts, 'email', 'configuration'],
  ];
  const results = await Promise.all(sources.map(async ([model, field, type]) => ({
    field, type,
    rows: await model.groupBy({ by: [field], where: { [field]: { in: emails, mode: 'insensitive' } }, _count: { _all: true } }),
  })));
  const emailUsage = new Map();
  for (const { rows, field, type } of results) {
    for (const row of rows) {
      const email = normalizeEmail(row[field]);
      const usage = emailUsage.get(email) || { transaction: false, configuration: false };
      if (row._count._all > 0) usage[type] = true;
      emailUsage.set(email, usage);
    }
  }
  return signers.map(({ _count = {}, ...signer }) => {
    const snapshot = emailUsage.get(normalizeEmail(signer.email));
    const hasTransactions = Boolean(snapshot?.transaction || Object.entries(_count).some(([key, count]) => key !== 'approval_role_contacts' && count > 0));
    const hasConfiguration = Boolean(_count.approval_role_contacts > 0 || snapshot?.configuration);
    const reason = hasTransactions ? TRANSACTION_MESSAGE : hasConfiguration ? CONFIGURATION_MESSAGE : null;
    return { ...signer, has_transactions: hasTransactions, has_configuration: hasConfiguration, can_delete: !reason, delete_block_reason: reason, email_locked: Boolean(reason) };
  });
}

module.exports = { signerUsageInclude, withSignerUsage, normalizeEmail, TRANSACTION_MESSAGE };
