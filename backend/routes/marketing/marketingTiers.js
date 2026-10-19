// Approval tiers can be general, per holding group (company_master_id) or per company (company_id).
// For a document, the most specific scope that has any tier for that module is used as a whole:
// company set → holding set → general set. Steps are never mixed between scopes.

const matchesAmount = (rule, amount) => Number(rule.min_amount) <= amount && (rule.max_amount === null || rule.max_amount === undefined || Number(rule.max_amount) >= amount);

function tierScope(rule) {
  if (rule.company_id) return 'company';
  if (rule.company_master_id) return 'holding';
  return 'general';
}

// rules: all approval_rules of one module (or mixed; filtered by module when given).
function pickTierSet(rules, { companyId = null, companyMasterId = null, module = null } = {}) {
  const pool = module ? rules.filter(r => r.module === module) : rules;
  const byCompany = companyId ? pool.filter(r => r.company_id === companyId) : [];
  if (byCompany.length) return byCompany;
  const byHolding = companyMasterId ? pool.filter(r => !r.company_id && r.company_master_id === companyMasterId) : [];
  if (byHolding.length) return byHolding;
  return pool.filter(r => !r.company_id && !r.company_master_id);
}

// Rules of the applicable set that cover an amount, one per step, ordered by step.
// Bands usually touch (0–10 jt and 10–50 jt both include exactly 10 jt). At such a boundary the
// higher band wins for that step, so an amount never gets the same step twice.
function tierStepsFor(rules, scope, amount) {
  const byStep = new Map();
  for (const rule of pickTierSet(rules, scope)) {
    if (!matchesAmount(rule, amount)) continue;
    const current = byStep.get(rule.step_number);
    if (!current || Number(rule.min_amount) > Number(current.min_amount)) byStep.set(rule.step_number, rule);
  }
  return [...byStep.values()].sort((a, b) => a.step_number - b.step_number);
}

async function loadTierSteps(db, module, companyId, amount) {
  const company = companyId ? await db.m_company.findUnique({ where: { id: companyId }, select: { company_master_id: true } }) : null;
  const rules = await db.approval_rules.findMany({ where: { module }, orderBy: { step_number: 'asc' } });
  return tierStepsFor(rules, { companyId, companyMasterId: company?.company_master_id ?? null, module }, amount);
}

module.exports = { matchesAmount, tierScope, pickTierSet, tierStepsFor, loadTierSteps };
