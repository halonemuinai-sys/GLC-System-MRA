// Readable event / transaction number for a Marketing Plan, e.g. EVT-2026-0083.
// Search accepts the full number, "EVT-0083", "#83" or "83" (see getPlans / getPayments).
export function eventNumber(plan) {
  if (!plan?.id) return '';
  return `EVT-${plan.fiscal_year || '----'}-${String(plan.id).padStart(4, '0')}`;
}
