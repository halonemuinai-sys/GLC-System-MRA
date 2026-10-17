// Aturan governance Marketing (sama dengan backend routes/marketing/marketingGovernance.js).
export const H3_MONTHS = 3;

// true kalau event dimulai kurang dari 3 bulan dari hari ini (aturan H-3).
export function isLateSubmission(eventStartDate) {
  if (!eventStartDate) return false;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setMonth(threshold.getMonth() + H3_MONTHS);
  return new Date(eventStartDate) < threshold;
}

export function earliestOnTimeEventDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + H3_MONTHS);
  return d;
}

// Label & warna badge status jendela closing (closing_window.state dari API).
export const CLOSING_WINDOW_BADGE = {
  OPEN: { label: 'Closing Due', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  OVERDUE: { label: 'Closing Overdue', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  IN_REVIEW: { label: 'Closing Review', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' }
};
