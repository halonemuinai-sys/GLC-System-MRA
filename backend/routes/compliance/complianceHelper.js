const GENERIC_MODULES = ['hr_compliance', 'tax_finance', 'product_regulatory'];
const COMPLIANCE_MODULES = ['license', 'monitoring', 'sop', ...GENERIC_MODULES];

const MODULE_LABELS = {
  license: 'License & Permit',
  monitoring: 'Compliance Docs',
  sop: 'SOP & Policy',
  hr_compliance: 'HR & Employment',
  tax_finance: 'Tax & Finance',
  product_regulatory: 'Product Regulatory'
};

function computeExpiryStatus(expiryDate) {
  if (!expiryDate) return { status: null, daysUntilExpiry: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  let status;
  if (daysUntilExpiry < 0) status = 'Expired';
  else if (daysUntilExpiry < 30) status = 'Critical';
  else if (daysUntilExpiry < 90) status = 'Warning';
  else status = 'Valid';
  return { status, daysUntilExpiry };
}

function withExpiryStatus(doc) {
  const { status, daysUntilExpiry } = computeExpiryStatus(doc.expiry_date);
  return { ...doc, status, days_until_expiry: daysUntilExpiry };
}

function withAuditStatus(doc) {
  if (!doc.next_audit_date) return { ...doc, audit_status: null, days_until_audit: null };
  const { status, daysUntilExpiry } = computeExpiryStatus(doc.next_audit_date);
  return { ...doc, audit_status: status, days_until_audit: daysUntilExpiry };
}

function withCombinedUrgency(doc) {
  const primary = computeExpiryStatus(doc.expiry_date);
  if (!doc.next_audit_date) {
    return { ...doc, status: primary.status, days_until_expiry: primary.daysUntilExpiry };
  }
  const audit = computeExpiryStatus(doc.next_audit_date);
  const URGENCY_RANK = { Expired: 3, Critical: 2, Warning: 1, Valid: 0 };
  const primaryRank = primary.status ? URGENCY_RANK[primary.status] : -1;
  const auditRank = audit.status ? URGENCY_RANK[audit.status] : -1;
  if (auditRank > primaryRank) {
    return { ...doc, status: audit.status, days_until_expiry: audit.daysUntilExpiry };
  }
  return { ...doc, status: primary.status, days_until_expiry: primary.daysUntilExpiry };
}

function sortByExpiry(a, b) {
  if (!a.expiry_date && !b.expiry_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.expiry_date) return 1;
  if (!b.expiry_date) return -1;
  return new Date(a.expiry_date) - new Date(b.expiry_date);
}

function licenseToDocShape(lic) {
  return {
    id: lic.id,
    module: 'license',
    doc_name: lic.doc_name,
    category: lic.category,
    pic: lic.pic,
    company_id: lic.company_id,
    m_company: lic.m_company,
    doc_status: lic.doc_status,
    confidentiality: lic.confidentiality,
    expiry_date: lic.expiry_date,
    next_audit_date: lic.next_audit_date,
    created_at: lic.created_at
  };
}

function sopToDocShape(rec) {
  return {
    id: rec.id,
    module: 'sop',
    doc_name: rec.doc_name,
    category: rec.category,
    pic: rec.pic,
    company_id: rec.company_id,
    m_company: rec.m_company,
    doc_status: rec.doc_status,
    confidentiality: rec.confidentiality,
    expiry_date: rec.expiry_date,
    created_at: rec.created_at
  };
}

function monitoringToDocShape(rec) {
  return {
    id: rec.id,
    module: 'monitoring',
    doc_name: rec.doc_name,
    category: rec.category,
    pic: rec.pic,
    company_id: rec.company_id,
    m_company: rec.m_company,
    doc_status: rec.compliance_status,
    confidentiality: rec.confidentiality,
    expiry_date: rec.due_date,
    next_audit_date: rec.next_audit_date,
    created_at: rec.created_at
  };
}

function computeTimelineStatus(dueDate, completionDate) {
  if (!dueDate) return { status: null, daysOutstanding: null };
  if (completionDate) return { status: 'Completed', daysOutstanding: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysOutstanding = Math.round((today - due) / (1000 * 60 * 60 * 24));

  let status;
  if (daysOutstanding > 0) status = 'Overdue';
  else if (daysOutstanding >= -7) status = 'Due Soon';
  else status = 'On Track';
  return { status, daysOutstanding };
}

function withTimelineStatus(rec) {
  const { status, daysOutstanding } = computeTimelineStatus(rec.due_date, rec.completion_date);
  return { ...rec, status, days_outstanding: daysOutstanding };
}

function sortByDueDate(a, b) {
  if (!a.due_date && !b.due_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return new Date(a.due_date) - new Date(b.due_date);
}

module.exports = {
  GENERIC_MODULES,
  COMPLIANCE_MODULES,
  MODULE_LABELS,
  computeExpiryStatus,
  withExpiryStatus,
  withAuditStatus,
  withCombinedUrgency,
  sortByExpiry,
  licenseToDocShape,
  sopToDocShape,
  monitoringToDocShape,
  computeTimelineStatus,
  withTimelineStatus,
  sortByDueDate
};
