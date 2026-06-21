'use client';

import ComplianceDocPage from '@/components/pages/ComplianceDocPage';
import { FlaskConical } from 'lucide-react';

const CONFIG = {
  module: 'product_regulatory',
  title: 'Product Regulatory',
  subtitle: 'Pengelolaan dokumen regulasi dan sertifikasi produk GLC MRA.',
  icon: FlaskConical,
  categories: ['COA', 'Health Certificate', 'Label Approval', 'Product Registration', 'Lainnya'],
  idLabel: 'Nomor Registrasi / Sertifikat',
  expiryLabel: 'Tgl Kadaluarsa Sertifikat',
  requireExpiry: true
};

export default function ComplianceProductPage() {
  return <ComplianceDocPage config={CONFIG} />;
}
