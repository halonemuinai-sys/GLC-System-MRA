'use client';

import ComplianceDocPage from '@/components/pages/ComplianceDocPage';
import { BookOpen } from 'lucide-react';

const CONFIG = {
  module: 'sop',
  title: 'SOP & Policy',
  subtitle: 'Pengelolaan SOP dan kebijakan internal GLC MRA.',
  icon: BookOpen,
  categories: ['SOP Operasional', 'Code of Conduct', 'Procurement Policy', 'Lainnya'],
  idLabel: 'Kode SOP / Nomor Dokumen',
  expiryLabel: 'Tgl Review / Revisi',
  requireExpiry: true
};

export default function ComplianceSopPage() {
  return <ComplianceDocPage config={CONFIG} />;
}
