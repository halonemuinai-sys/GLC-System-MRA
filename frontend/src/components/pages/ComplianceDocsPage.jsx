'use client';

import ComplianceDocPage from '@/components/pages/ComplianceDocPage';
import { ClipboardList } from 'lucide-react';

const CONFIG = {
  module: 'monitoring',
  title: 'Compliance Docs',
  subtitle: 'Monitoring kepatuhan regulasi internal dan eksternal GLC MRA.',
  icon: ClipboardList,
  categories: ['Audit Report', 'Compliance Checklist', 'Regulatory Update', 'Lainnya'],
  idLabel: 'Nomor Referensi',
  expiryLabel: 'Tgl Review',
  requireExpiry: false
};

export default function ComplianceDocsPage() {
  return <ComplianceDocPage config={CONFIG} />;
}
