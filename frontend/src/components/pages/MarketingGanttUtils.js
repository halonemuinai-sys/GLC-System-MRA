import { CheckCircle, Clock, XCircle, Info } from 'lucide-react';

export const formatIDR = (val) => {
  if (!val && val !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
};

export const formatIDRCompact = (val) => {
  const n = Number(val || 0);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}Rb`;
  return `Rp ${n}`;
};

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
export const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const CURRENT_YEAR = new Date().getFullYear();

export const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60', icon: CheckCircle },
  PENDING_APPROVAL: { label: 'Pending', color: '#f97316', bg: 'bg-amber-500/10', text: 'text-amber-655 dark:text-amber-400', border: 'border-amber-200/60', icon: Clock },
  REJECTED: { label: 'Rejected', color: '#f43f5e', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200/60', icon: XCircle },
  DRAFT: { label: 'Draft', color: '#64748b', bg: 'bg-neutral-500/10', text: 'text-neutral-500', border: 'border-neutral-200/60', icon: Info },
};

export const GANTT_BAR_COLORS = {
  APPROVED: '#10b981',
  PENDING_APPROVAL: '#f97316',
  REJECTED: '#f43f5e',
  DRAFT: '#64748b',
};
