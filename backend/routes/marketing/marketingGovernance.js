// Aturan governance Marketing HUB (Fase 1):
// - H-3   : plan diajukan minimal 3 bulan sebelum event; kalau kurang, wajib alasan
// - Closing window : closing dibuka mulai M+1 dan jatuh tempo akhir M+3 (M = bulan event selesai)
// - KPI   : skor pencapaian target vs aktual untuk evaluasi closing

const H3_MONTHS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function evaluateLateSubmission(eventStartDate, reason) {
  if (!eventStartDate) return { late: false, reason: null };
  const threshold = startOfToday();
  threshold.setMonth(threshold.getMonth() + H3_MONTHS);
  const late = new Date(eventStartDate) < threshold;
  const cleanReason = reason ? String(reason).trim() : '';
  if (late && !cleanReason) {
    return {
      late,
      error: 'Event kurang dari 3 bulan lagi (aturan H-3). Isi alasan pengajuan terlambat untuk melanjutkan.',
      code: 'LATE_SUBMISSION_REASON_REQUIRED'
    };
  }
  return { late, reason: late ? cleanReason : null };
}

function eventMonthDate(plan) {
  const ref = plan.event_end_date || plan.event_start_date || plan.end_date || plan.start_date;
  return ref ? new Date(ref) : null;
}

// Status jendela closing untuk 1 plan. closingStatus = status closing (atau null).
function closingWindow(plan, closingStatus) {
  const eventDate = eventMonthDate(plan);
  if (!eventDate) return null;
  const opensAt = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 1);
  const dueAt = new Date(eventDate.getFullYear(), eventDate.getMonth() + 4, 0); // hari terakhir M+3
  const today = startOfToday();
  const daysLeft = Math.round((dueAt - today) / DAY_MS);

  let state;
  if (plan.status === 'COMPLETED' || closingStatus === 'APPROVED') state = 'DONE';
  else if (plan.status !== 'APPROVED') state = 'NOT_APPLICABLE';
  else if (closingStatus === 'PENDING_APPROVAL') state = 'IN_REVIEW';
  else if (today < opensAt) state = 'NOT_YET';
  else if (today > dueAt) state = 'OVERDUE';
  else state = 'OPEN';

  return { opens_at: opensAt, due_at: dueAt, days_left: daysLeft, state };
}

const KPI_DEFS = [
  { key: 'sales', label: 'Sales', target: 'target_sales', actual: 'actual_sales', currency: true },
  { key: 'leads', label: 'Leads', target: 'target_leads', actual: 'actual_leads' },
  { key: 'reach', label: 'Reach', target: 'target_reach', actual: 'actual_reach' },
  { key: 'impressions', label: 'Impressions', target: 'target_impressions', actual: 'actual_impressions' },
  { key: 'roi', label: 'ROI (%)', target: 'target_roi_pct', actual: 'actual_roi_pct' }
];

// Pencapaian per indikator = aktual / target (dibatasi 150% agar 1 indikator tidak mendominasi).
function computeKpi(plan) {
  const rows = KPI_DEFS.map(def => {
    const target = plan[def.target] !== null && plan[def.target] !== undefined ? Number(plan[def.target]) : null;
    const actual = plan[def.actual] !== null && plan[def.actual] !== undefined ? Number(plan[def.actual]) : null;
    const achievement = target && target > 0 && actual !== null ? Math.round((actual / target) * 1000) / 10 : null;
    return { key: def.key, label: def.label, currency: !!def.currency, target, actual, achievement };
  });
  const scored = rows.filter(r => r.achievement !== null);
  const score = scored.length
    ? Math.round((scored.reduce((s, r) => s + Math.min(r.achievement, 150), 0) / scored.length) * 10) / 10
    : null;
  const rating = score === null ? 'NO_TARGET' : score >= 100 ? 'ACHIEVED' : score >= 80 ? 'NEARLY' : 'NOT_ACHIEVED';
  return { rows, score, rating };
}

// Batas pengajuan plan per kuartal (aturan COO).
function quarterConfigs(fiscalYear) {
  return [
    { quarter: 1, name: 'Q1 (Jan - Mar)', months: [1, 2, 3], deadline: `${fiscalYear - 1}-12-31` },
    { quarter: 2, name: 'Q2 (Apr - Jun)', months: [4, 5, 6], deadline: `${fiscalYear}-02-28` },
    { quarter: 3, name: 'Q3 (Jul - Sep)', months: [7, 8, 9], deadline: `${fiscalYear}-05-31` },
    { quarter: 4, name: 'Q4 (Okt - Des)', months: [10, 11, 12], deadline: `${fiscalYear}-10-31` }
  ];
}

module.exports = { H3_MONTHS, evaluateLateSubmission, closingWindow, computeKpi, quarterConfigs };
