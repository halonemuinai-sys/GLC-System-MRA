'use client';

import ComplianceDocPage from '@/components/pages/ComplianceDocPage';
import { Landmark } from 'lucide-react';

const CONFIG = {
  module: 'tax_finance',
  title: 'Tax & Finance',
  subtitle: 'Pengelolaan dokumen perpajakan dan kepatuhan keuangan GLC MRA.',
  icon: Landmark,
  categories: ['Tax Report', 'Transfer Pricing', 'Faktur Pajak', 'Lainnya'],
  idLabel: 'Nomor Dokumen / NPWP',
  expiryLabel: 'Tgl Jatuh Tempo / Deadline',
  requireExpiry: true
};

export default function ComplianceTaxPage() {
  return <ComplianceDocPage config={CONFIG} />;
}
