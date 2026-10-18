const prisma = require('../../api/db');
const { combineRoles } = require('../../api/roles');
const { pickTierSet } = require('./marketingTiers');

// Go-live readiness of the Marketing module per holding group and company for one fiscal year.
// Blocking checks stop a company from running plans end to end; warnings need a look.

const MARKETING_ROLES = ['marketing', 'marketing_manager'];
const SHIFT_ROLES = ['FINANCE_CONTROLLER', 'MARKETING_MANAGER']; // budget shifts always need these recipients

function resolveRecipient(contacts, role, companyId, masterId) {
  return contacts.find(c => c.role === role && c.company_id === companyId)
    || (masterId ? contacts.find(c => c.role === role && !c.company_id && c.company_master_id === masterId) : null)
    || contacts.find(c => c.role === role && !c.company_id && !c.company_master_id)
    || null;
}
const recipientSource = (c, companyId) => (!c ? 'missing' : c.company_id === companyId ? 'company' : c.company_master_id ? 'holding' : 'general');

// GET /readiness?fiscal_year=2026
async function getReadiness(req, res, next) {
  try {
    const fiscalYear = parseInt(req.query.fiscal_year, 10) || new Date().getFullYear();
    const [masters, companies, brands, budgets, users, access, contacts, rules, plans] = await Promise.all([
      prisma.m_company_master.findMany({ select: { id: true, name: true, sector: true }, orderBy: { name: 'asc' } }),
      prisma.m_company.findMany({ where: { is_active: true }, select: { id: true, name: true, company_master_id: true }, orderBy: { name: 'asc' } }),
      prisma.m_brand.findMany({ select: { id: true, name: true, company_id: true } }),
      prisma.m_marketing_budget.findMany({ where: { fiscal_year: fiscalYear }, select: { company_id: true, validation_status: true, is_locked: true } }),
      prisma.m_user.findMany({ where: { is_active: true }, select: { id: true, role: true, extra_roles: true } }),
      prisma.m_user_company_access.findMany({ select: { user_id: true, company_id: true } }),
      prisma.approval_role_contacts.findMany({ select: { role: true, email: true, company_id: true, company_master_id: true } }),
      prisma.approval_rules.findMany({ select: { module: true, step_number: true, approver_role: true, company_id: true, company_master_id: true, min_amount: true, max_amount: true } }),
      prisma.marketing_plans.groupBy({ by: ['company_id'], where: { fiscal_year: fiscalYear }, _count: { _all: true } }),
    ]);

    const userRoles = new Map(users.map(u => [u.id, combineRoles(u.role, u.extra_roles)]));
    const usersFor = (companyId, wanted) => {
      const ids = new Set(access.filter(a => a.company_id === companyId).map(a => a.user_id));
      return [...ids].filter(id => (userRoles.get(id) || []).some(r => wanted.includes(r))).length;
    };
    const planCount = new Map(plans.map(p => [p.company_id, p._count._all]));
    const masterById = new Map(masters.map(m => [m.id, m]));

    const rows = companies.filter(c => req.companyScope.all || req.companyScope.companyIds.includes(c.id)).map(company => {
      const masterId = company.company_master_id && masterById.has(company.company_master_id) ? company.company_master_id : null;
      const companyBrands = brands.filter(b => b.company_id === company.id);
      const companyBudgets = budgets.filter(b => b.company_id === company.id);
      const validated = companyBudgets.filter(b => b.validation_status === 'VALIDATED').length;
      const scope = { companyId: company.id, companyMasterId: masterId };
      const planTiers = pickTierSet(rules, { ...scope, module: 'MARKETING_PLAN' });
      const paymentTiers = pickTierSet(rules, { ...scope, module: 'PAYMENT_REQUEST' });
      const tierScope = set => (!set.length ? 'missing' : set[0].company_id ? 'company' : set[0].company_master_id ? 'holding' : 'general');
      const neededRoles = [...new Set([...planTiers, ...paymentTiers].map(r => r.approver_role).concat(SHIFT_ROLES))];
      const recipients = neededRoles.map(role => {
        const c = resolveRecipient(contacts, role, company.id, masterId);
        return { role, email: c?.email || null, source: recipientSource(c, company.id) };
      });
      const marketingUsers = usersFor(company.id, MARKETING_ROLES);
      const financeUsers = usersFor(company.id, ['finance']);

      const checks = [
        { key: 'brand', level: 'block', ok: companyBrands.length > 0, label: 'Brand registered', detail: companyBrands.length ? companyBrands.map(b => b.name).join(', ') : 'Budgets are kept per brand and LOB; add at least one brand.', fix: '/dashboard/master/brands' },
        { key: 'budget', level: 'block', ok: validated > 0, label: `Budget FY ${fiscalYear} validated`, detail: companyBudgets.length ? `${validated} of ${companyBudgets.length} validated by Finance` : 'No budget yet for this year.', fix: '/dashboard/marketing/budgeting' },
        { key: 'marketing_user', level: 'block', ok: marketingUsers > 0, label: 'Marketing user with access', detail: marketingUsers ? `${marketingUsers} user(s)` : 'No Marketing user has access to this company.', fix: '/dashboard/admin' },
        { key: 'payment_tier', level: 'block', ok: paymentTiers.length > 0, label: 'Payment approval tier', detail: paymentTiers.length ? `${tierScope(paymentTiers)} tier · ${new Set(paymentTiers.map(r => r.step_number)).size} step(s)` : 'No tier covers payment requests.', fix: '/dashboard/marketing-approval-settings' },
        { key: 'recipients', level: 'warn', ok: recipients.every(r => r.source === 'company' || r.source === 'holding'), label: 'Approval recipients set for this group', detail: recipients.some(r => r.source === 'missing') ? `Missing: ${recipients.filter(r => r.source === 'missing').map(r => r.role).join(', ')}` : recipients.some(r => r.source === 'general') ? `Using general recipients for ${recipients.filter(r => r.source === 'general').map(r => r.role).join(', ')}` : 'All from company or holding', fix: '/dashboard/marketing-approval-settings' },
        { key: 'finance_user', level: 'warn', ok: financeUsers > 0, label: 'Finance user with access', detail: financeUsers ? `${financeUsers} user(s)` : 'Nobody can validate budgets or decide reimbursements for this company.', fix: '/dashboard/admin' },
        { key: 'holding', level: 'warn', ok: !!masterId, label: 'Belongs to a holding group', detail: masterId ? masterById.get(masterId).name : 'Holding recipients and holding tiers cannot apply.', fix: '/dashboard/master/companies' },
      ];
      const blocking = checks.filter(c => c.level === 'block' && !c.ok).length;
      const warnings = checks.filter(c => c.level === 'warn' && !c.ok).length;
      return {
        company_id: company.id, company_name: company.name, company_master_id: masterId,
        plans: planCount.get(company.id) || 0,
        plan_tier_scope: tierScope(planTiers), payment_tier_scope: tierScope(paymentTiers),
        recipients, checks, blocking, warnings, status: blocking ? 'BLOCKED' : warnings ? 'REVIEW' : 'READY'
      };
    });

    const groups = [...masters.map(m => ({ id: m.id, name: m.name, sector: m.sector })), { id: null, name: 'No holding group', sector: null }]
      .map(g => {
        const companiesOf = rows.filter(r => r.company_master_id === g.id);
        return {
          ...g,
          companies: companiesOf,
          ready: companiesOf.filter(r => r.status === 'READY').length,
          review: companiesOf.filter(r => r.status === 'REVIEW').length,
          blocked: companiesOf.filter(r => r.status === 'BLOCKED').length,
        };
      })
      .filter(g => g.companies.length);

    res.json({
      fiscal_year: fiscalYear,
      summary: {
        companies: rows.length,
        ready: rows.filter(r => r.status === 'READY').length,
        review: rows.filter(r => r.status === 'REVIEW').length,
        blocked: rows.filter(r => r.status === 'BLOCKED').length,
      },
      groups
    });
  } catch (err) { next(err); }
}

module.exports = { getReadiness, resolveRecipient };
