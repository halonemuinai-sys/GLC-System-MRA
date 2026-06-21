'use client';

import ComplianceDocPage from '@/components/pages/ComplianceDocPage';
import { UserCheck } from 'lucide-react';

const CONFIG = {
  module: 'hr_compliance',
  title: 'HR & Employment',
  subtitle: 'Pengelolaan dokumen ketenagakerjaan dan kepatuhan HR GLC MRA.',
  icon: UserCheck,
  categories: ['PKWT', 'PKWTT', 'Employee Warning Letter', 'Company Regulation', 'Lainnya'],
  idLabel: 'Nomor Dokumen / Karyawan',
  expiryLabel: 'Tgl Berakhir Kontrak',
  requireExpiry: true
};

export default function ComplianceHrPage() {
  return <ComplianceDocPage config={CONFIG} />;
}
