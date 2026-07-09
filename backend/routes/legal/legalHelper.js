const LEGAL_GENERIC_MODULES = ['contract', 'corporate'];
const LEGAL_MODULES = [...LEGAL_GENERIC_MODULES, 'litigation'];
const LEGAL_MODULE_LABELS = {
  contract: 'Contract & Agreement',
  corporate: 'Corporate Legal Documents',
  litigation: 'Litigation & Dispute'
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

function sortByExpiry(a, b) {
  if (!a.expiry_date && !b.expiry_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.expiry_date) return 1;
  if (!b.expiry_date) return -1;
  return new Date(a.expiry_date) - new Date(b.expiry_date);
}

function withHearingStatus(c) {
  const { status, daysUntilExpiry } = computeExpiryStatus(c.next_hearing_date);
  return { ...c, hearing_status: status, days_until_hearing: daysUntilExpiry };
}

function sortByHearing(a, b) {
  if (!a.next_hearing_date && !b.next_hearing_date) return new Date(b.created_at) - new Date(a.created_at);
  if (!a.next_hearing_date) return 1;
  if (!b.next_hearing_date) return -1;
  return new Date(a.next_hearing_date) - new Date(b.next_hearing_date);
}

function litigationToDocShape(c) {
  return {
    id: c.id,
    module: 'litigation',
    doc_name: c.doc_name,
    category: c.category,
    pic: c.pic,
    company_id: c.company_id,
    m_company: c.m_company,
    doc_status: c.case_status,
    confidentiality: c.confidentiality,
    expiry_date: c.next_hearing_date,
    created_at: c.created_at
  };
}

module.exports = {
  LEGAL_GENERIC_MODULES,
  LEGAL_MODULES,
  LEGAL_MODULE_LABELS,
  computeExpiryStatus,
  withExpiryStatus,
  sortByExpiry,
  withHearingStatus,
  sortByHearing,
  litigationToDocShape
};
