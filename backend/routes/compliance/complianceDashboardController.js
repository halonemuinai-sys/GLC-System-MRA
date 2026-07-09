const prisma = require('../../api/db');
const {
  GENERIC_MODULES,
  COMPLIANCE_MODULES,
  MODULE_LABELS,
  computeExpiryStatus,
  withCombinedUrgency,
  withExpiryStatus,
  licenseToDocShape,
  monitoringToDocShape,
  sopToDocShape
} = require('./complianceHelper');

// GET /notifications
async function getNotifications(req, res, next) {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const [genericDocs, licenseDocs, monitoringDocs, sopDocs] = await Promise.all([
      prisma.legal_documents.findMany({
        where: {
          module: { in: GENERIC_MODULES },
          expiry_date: { not: null, lt: ninetyDaysFromNow }
        }
      }),
      prisma.compliance_licenses.findMany({
        where: {
          OR: [
            { expiry_date: { not: null, lt: ninetyDaysFromNow } },
            { next_audit_date: { not: null, lt: ninetyDaysFromNow } }
          ]
        }
      }),
      prisma.compliance_monitoring.findMany({
        where: {
          OR: [
            { due_date: { not: null, lt: ninetyDaysFromNow }, completion_date: null },
            { next_audit_date: { not: null, lt: ninetyDaysFromNow } }
          ]
        }
      }),
      prisma.compliance_sop.findMany({
        where: { expiry_date: { not: null, lt: ninetyDaysFromNow } }
      })
    ]);

    const perModule = {};
    genericDocs.forEach(d => {
      perModule[d.module] = (perModule[d.module] || 0) + 1;
    });
    if (licenseDocs.length > 0) perModule.license = licenseDocs.length;
    if (monitoringDocs.length > 0) perModule.monitoring = monitoringDocs.length;
    if (sopDocs.length > 0) perModule.sop = sopDocs.length;

    const MODULE_LINK = {
      license: '/dashboard/compliance/licenses',
      monitoring: '/dashboard/compliance/docs',
      sop: '/dashboard/compliance/sop',
      hr_compliance: '/dashboard/compliance/hr',
      tax_finance: '/dashboard/compliance/tax',
      product_regulatory: '/dashboard/compliance/product'
    };

    const items = [];
    genericDocs.forEach(d => {
      const { status, daysUntilExpiry } = computeExpiryStatus(d.expiry_date);
      if (status) items.push({ id: `${d.module}-${d.id}`, title: d.doc_name, subtitle: MODULE_LABELS[d.module] || d.module, date: d.expiry_date, daysLeft: daysUntilExpiry, status, link: MODULE_LINK[d.module] || '/dashboard/compliance/dashboard' });
    });
    licenseDocs.map(licenseToDocShape).map(withCombinedUrgency).forEach(d => {
      if (d.status) items.push({ id: `license-${d.id}`, title: d.doc_name, subtitle: MODULE_LABELS.license, date: d.expiry_date, daysLeft: d.days_until_expiry, status: d.status, link: MODULE_LINK.license });
    });
    monitoringDocs.map(monitoringToDocShape).map(withCombinedUrgency).forEach(d => {
      if (d.status) items.push({ id: `monitoring-${d.id}`, title: d.doc_name, subtitle: MODULE_LABELS.monitoring, date: d.expiry_date, daysLeft: d.days_until_expiry, status: d.status, link: MODULE_LINK.monitoring });
    });
    sopDocs.map(sopToDocShape).map(withExpiryStatus).forEach(d => {
      if (d.status) items.push({ id: `sop-${d.id}`, title: d.doc_name, subtitle: MODULE_LABELS.sop, date: d.expiry_date, daysLeft: d.days_until_expiry, status: d.status, link: MODULE_LINK.sop });
    });
    items.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({ total: genericDocs.length + licenseDocs.length + monitoringDocs.length + sopDocs.length, perModule, items: items.slice(0, 30) });
  } catch (err) {
    next(err);
  }
}

// GET /summary
async function getSummary(req, res, next) {
  try {
    const { companyId } = req.query;
    const genericWhere = { module: { in: GENERIC_MODULES } };
    const licenseWhere = {};
    const monitoringWhere = {};
    const sopWhere = {};
    if (companyId) {
      genericWhere.company_id = parseInt(companyId);
      licenseWhere.company_id = parseInt(companyId);
      monitoringWhere.company_id = parseInt(companyId);
      sopWhere.company_id = parseInt(companyId);
    }

    const [genericDocs, licenseDocs, monitoringDocs, sopDocs] = await Promise.all([
      prisma.legal_documents.findMany({
        where: genericWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.compliance_licenses.findMany({
        where: licenseWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.compliance_monitoring.findMany({
        where: monitoringWhere,
        include: { m_company: { select: { name: true } } }
      }),
      prisma.compliance_sop.findMany({
        where: sopWhere,
        include: { m_company: { select: { name: true } } }
      })
    ]);

    const allDocs = [...genericDocs, ...licenseDocs.map(licenseToDocShape), ...monitoringDocs.map(monitoringToDocShape), ...sopDocs.map(sopToDocShape)];
    const withStatus = allDocs.map(withCombinedUrgency);

    const kpi = {
      total: withStatus.length,
      active: withStatus.filter(d => d.doc_status === 'Active' || d.doc_status === 'Comply').length,
      expiringSoon: withStatus.filter(d => d.status === 'Warning' || d.status === 'Critical').length,
      expired: withStatus.filter(d => d.status === 'Expired').length
    };

    const byModule = COMPLIANCE_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: MODULE_LABELS[m],
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

    const byExpiryStatus = COMPLIANCE_MODULES.map(m => {
      const docs = withStatus.filter(d => d.module === m);
      return {
        module: m,
        label: MODULE_LABELS[m],
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
  getNotifications,
  getSummary
};
