// Preview of the recipient lookup used by the automatic approval path.
// This resolves people by role, not workflow order or required approval steps.
export function resolveRecipientPreview(contacts, role, company) {
  if (!company) return { contact: null, source: null };
  const sameId = (a, b) => a != null && b != null && String(a) === String(b);
  const companyContact = contacts.find(contact => contact.role === role && sameId(contact.company_id, company.id));
  if (companyContact) return { contact: companyContact, source: 'company' };
  const holdingContact = contacts.find(contact => contact.role === role && !contact.company_id && sameId(contact.company_master_id, company.company_master_id));
  if (holdingContact) return { contact: holdingContact, source: 'holding' };
  const generalContact = contacts.find(contact => contact.role === role && !contact.company_id && !contact.company_master_id);
  return { contact: generalContact || null, source: generalContact ? 'general' : null };
}
