const prisma = require('../../api/db');
const {
  LEGAL_GENERIC_MODULES,
  LEGAL_MODULES,
  LEGAL_MODULE_LABELS,
  computeExpiryStatus,
  withExpiryStatus,
  litigationToDocShape
} = require('./legalHelper');

// GET /dashboard-stats
async function getDashboardStats(req, res, next) {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalDocs,
      activeDocs,
      expiringDocs,
      totalInsurances,
      insurancePremiumSum
    ] = await Promise.all([
      prisma.documents.count(),
      prisma.documents.count({ where: { status: 'Active' } }),
      prisma.documents.count({
        where: {
          valid_until: { gte: new Date(), lte: thirtyDaysFromNow },
          status: 'Active'
        }
      }),
      prisma.insurances.count(),
      prisma.insurances.aggregate({ _sum: { premium_idr: true } })
    ]);

    res.json({
      totalDocuments: totalDocs,
      activeDocuments: activeDocs,
      expiringDocuments: expiringDocs,
      totalInsurances,
      totalInsurancePremiums: insurancePremiumSum._sum.premium_idr || 0
    });
  } catch (err) {
    next(err);
  }
}

// GET /notifications
async function getNotifications(req, res, next) {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const CLOSED_STATUSES = ['Won', 'Lost', 'Settlement', 'Closed'];

    const [genericDocs, litigationCases] = await Promise.all([
      prisma.legal_documents.findMany({
        where: {
          module: { in: LEGAL_GENERIC_MODULES },
          expiry_date: { not: null, lt: ninetyDaysFromNow }
        }
      }),
      prisma.legal_litigation.findMany({
        where: {
          case_status: { notIn: CLOSED_STATUSES },
          next_hearing_date: { not: null, lt: ninetyDaysFromNow }
        }
      })
    ]);

    const perModule = {};
    genericDocs.forEach(d => {
      perModule[d.module] = (perModule[d.module] || 0) + 1;
    });
    if (litigationCases.length > 0) perModule.litigation = litigationCases.length;

    const MODULE_LINK = { contract: '/dashboard/legal/contracts', corporate: '/dashboard/legal/corporate' };
    const items = [];
    genericDocs.forEach(d => {
      const { status, daysUntilExpiry } = computeExpiryStatus(d.expiry_date);
      if (status) items.push({ id: `${d.module}-${d.id}`, title: d.doc_name, subtitle: LEGAL_MODULE_LABELS[d.module] || d.module, date: d.expiry_date, daysLeft: daysUntilExpiry, status, link: MODULE_LINK[d.module] || '/dashboard/legal/dashboard' });
    });
    litigationCases.forEach(c => {
      const { status, daysUntilExpiry } = computeExpiryStatus(c.next_hearing_date);
      if (status) items.push({ id: `litigation-${c.id}`, title: c.doc_name, subtitle: 'Litigation & Dispute', date: c.next_hearing_date, daysLeft: daysUntilExpiry, status, link: '/dashboard/legal/litigation' });
    });
    items.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({ total: genericDocs.length + litigationCases.length, perModule, items: items.slice(0, 30) });
  } catch (err) {
    next(err);
  }
}

// GET /summary
async function getSummary(req, res, next) {
  try {
    const { companyId } = req.query;
    const genericWhere = { module: { in: LEGAL_GENERIC_MODULES } };
    const litigationWhere = {};
    if (companyId) {
      genericWhere.company_id = parseInt(companyId);
      litigationWhere.company_id = parseInt(companyId);
    }

    const [genericDocs, litigationCases] = await Promise.all([
      prisma.legal_documents.findMany({
        where: genericWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.legal_litigation.findMany({
        where: litigationWhere,
        include: { m_company: { select: { name: true } } }
      })
    ]);

    const allDocs = [...genericDocs, ...litigationCases.map(litigationToDocShape)];
    const withStatus = allDocs.map(withExpiryStatus);

    const CLOSED_STATUSES = ['Won', 'Lost', 'Settlement', 'Closed', 'Archived'];
    const kpi = {
      total: withStatus.length,
      active: withStatus.filter(d => !CLOSED_STATUSES.includes(d.doc_status)).length,
      expiringSoon: withStatus.filter(d => d.status === 'Warning' || d.status === 'Critical').length,
      expired: withStatus.filter(d => d.status === 'Expired').length
    };

    const byModule = LEGAL_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: LEGAL_MODULE_LABELS[m],
        total: docs.length,
        critical: docs.filter(d => d.status === 'Critical' || d.status === 'Expired').length
      };
    });

    const docStatusMap = {};
    withStatus.forEach(d => {
      const key = d.doc_status || 'Draft';
      docStatusMap[key] = (docStatusMap[key] || 0) + 1;
    });
    const byDocStatus = Object.entries(docStatusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const byExpiryStatus = LEGAL_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: LEGAL_MODULE_LABELS[m],
        Valid: docs.filter(d => d.status === 'Valid' || d.status === null).length,
        Warning: docs.filter(d => d.status === 'Warning').length,
        Critical: docs.filter(d => d.status === 'Critical').length,
        Expired: docs.filter(d => d.status === 'Expired').length
      };
    });

    const criticalDocs = withStatus
      .filter(d => d.status === 'Critical' || d.status === 'Warning' || d.status === 'Expired')
      .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
      .slice(0, 10);

    const companyMap = {};
    withStatus.forEach(d => {
      const name = d.m_company?.name || 'Unassigned';
      if (!companyMap[name]) companyMap[name] = { name, total: 0, expired: 0, critical: 0 };
      companyMap[name].total++;
      if (d.status === 'Expired') companyMap[name].expired++;
      if (d.status === 'Critical') companyMap[name].critical++;
    });
    const byCompany = Object.values(companyMap).sort((a, b) => b.total - a.total);

    res.json({ kpi, byModule, byDocStatus, byExpiryStatus, criticalDocs, byCompany });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getNotifications,
  getSummary
};
