'use client';

import LegalDocPage from '@/components/pages/LegalDocPage';
import { FileSignature } from 'lucide-react';

const CONFIG = {
  module: 'contract',
  title: 'Contract & Agreement',
  subtitle: 'Monitoring seluruh perjanjian dan kontrak kerja sama MRA Group.',
  icon: FileSignature,
  categories: ['Vendor Agreement', 'Lease Agreement', 'NDA', 'Distribution Agreement', 'Lainnya'],
  idLabel: 'Nomor Kontrak',
  expiryLabel: 'Tgl Berakhir Kontrak',
  requireExpiry: true
};

export default function LegalContractsPage() {
  return <LegalDocPage config={CONFIG} />;
}
