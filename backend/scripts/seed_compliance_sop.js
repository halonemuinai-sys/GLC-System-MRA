require('dotenv').config();
const prisma = require('../api/db');

// Helper to compute a date offset from today (in days, can be negative)
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function run() {
  const companies = await prisma.m_company.findMany({ select: { id: true, name: true }, take: 5, orderBy: { id: 'asc' } });
  if (companies.length === 0) {
    console.log('No companies found in m_company — seed master data first.');
    return;
  }
  const pick = (i) => companies[i % companies.length].id;

  const records = [
    {
      doc_name: 'SOP Pengadaan Barang & Jasa',
      category: 'Procurement Policy',
      id_number: 'SOP-PROC-001',
      version: '2.1',
      company_id: pick(0),
      business_unit: 'Procurement & General Affairs',
      process_owner: 'Budi Santoso',
      document_owner: 'Aris Setiawan',
      pic: 'Dewi Lestari',
      issue_date: daysFromNow(-400),
      effective_date: daysFromNow(-390),
      review_date: daysFromNow(60),
      expiry_date: daysFromNow(330),
      last_revision_date: daysFromNow(-30),
      doc_status: 'Active',
      risk_level: 'Medium',
      document_classification: 'Controlled Document',
      confidentiality: 'Internal',
      controlled_copy: 'Yes',
      regulatory_reference: 'Peraturan Internal Procurement No. 02/2024',
      policy_objective: 'Memastikan proses pengadaan barang dan jasa berjalan transparan, efisien, dan akuntabel.',
      scope_of_application: 'Berlaku untuk seluruh unit kerja yang melakukan pengadaan barang/jasa di atas Rp10.000.000.',
      related_sop_policy: 'SOP Pembayaran Vendor',
      revision_notes: 'Revisi ambang batas approval dari Rp5jt menjadi Rp10jt.',
      training_required: 'Yes',
      training_status: 'Completed',
      distribution_status: 'Fully Distributed',
      acknowledgement_status: 'Acknowledged',
      review_frequency: 'Annual',
      retention_period: '5 Tahun',
      archive_status: 'Active Archive',
      document_url: 'https://drive.google.com/drive/folders/dummy-sop-procurement',
      supporting_documents: 'Form PR, Form PO, Checklist Vendor',
      legal_compliance_notes: 'Selaras dengan kebijakan anti-fraud perusahaan.',
      notes: 'Direview setiap tahun bersamaan dengan audit internal.'
    },
    {
      doc_name: 'Kebijakan Keamanan Informasi',
      category: 'IT Security Policy',
      id_number: 'POL-ITSEC-004',
      version: '3.0',
      company_id: pick(1),
      business_unit: 'IT & Infrastructure',
      process_owner: 'Hendra Wijaya',
      document_owner: 'Siti Rahma',
      pic: 'Reza Pahlevi',
      issue_date: daysFromNow(-200),
      effective_date: daysFromNow(-190),
      review_date: daysFromNow(20),
      expiry_date: daysFromNow(165),
      last_revision_date: daysFromNow(-10),
      doc_status: 'Under Review',
      risk_level: 'Critical',
      document_classification: 'Controlled Document',
      confidentiality: 'Confidential',
      controlled_copy: 'Yes',
      regulatory_reference: 'UU No 27/2022 Pelindungan Data Pribadi',
      policy_objective: 'Melindungi aset informasi perusahaan dari ancaman keamanan siber.',
      scope_of_application: 'Berlaku untuk seluruh karyawan dan pihak ketiga yang mengakses sistem informasi perusahaan.',
      related_sop_policy: 'SOP Penanganan Insiden Keamanan',
      revision_notes: 'Penambahan ketentuan kerja remote & BYOD.',
      training_required: 'Yes',
      training_status: 'On Going',
      distribution_status: 'Partially Distributed',
      acknowledgement_status: 'Pending',
      review_frequency: 'Semi Annual',
      retention_period: '10 Tahun',
      archive_status: 'Active Archive',
      document_url: 'https://drive.google.com/drive/folders/dummy-policy-itsecurity',
      supporting_documents: 'NDA, Acceptable Use Policy',
      legal_compliance_notes: 'Wajib disosialisasikan ke seluruh karyawan baru saat onboarding.',
      notes: 'Sedang dalam proses review tahunan oleh tim IT Security.'
    },
    {
      doc_name: 'Pedoman Etika Bisnis (Code of Conduct)',
      category: 'Code of Conduct',
      id_number: 'POL-COC-001',
      version: '1.4',
      company_id: pick(0),
      business_unit: 'Human Resources',
      process_owner: 'Yusuf Ginanjar',
      document_owner: 'Toni Kurniawan',
      pic: 'Dinda Lestari',
      issue_date: daysFromNow(-700),
      effective_date: daysFromNow(-690),
      review_date: daysFromNow(150),
      expiry_date: daysFromNow(665),
      last_revision_date: daysFromNow(-180),
      doc_status: 'Active',
      risk_level: 'High',
      document_classification: 'Controlled Document',
      confidentiality: 'Public',
      controlled_copy: 'Yes',
      regulatory_reference: 'Peraturan Perusahaan Bab 3 Etika Kerja',
      policy_objective: 'Menetapkan standar etika dan perilaku bagi seluruh karyawan dan manajemen.',
      scope_of_application: 'Berlaku untuk seluruh karyawan, manajemen, dan jajaran direksi.',
      related_sop_policy: 'Whistleblowing Policy',
      revision_notes: 'Penambahan ketentuan anti-gratifikasi.',
      training_required: 'Yes',
      training_status: 'Completed',
      distribution_status: 'Fully Distributed',
      acknowledgement_status: 'Acknowledged',
      review_frequency: 'Every 2 Years',
      retention_period: 'Permanent',
      archive_status: 'Active Archive',
      document_url: 'https://drive.google.com/drive/folders/dummy-policy-coc',
      supporting_documents: 'Form Pernyataan Komitmen Karyawan',
      legal_compliance_notes: 'Wajib ditandatangani setiap karyawan baru.',
      notes: 'Bagian dari paket onboarding karyawan baru.'
    },
    {
      doc_name: 'SOP Pelaporan Keuangan Bulanan',
      category: 'Finance SOP',
      id_number: 'SOP-FIN-012',
      version: '1.2',
      company_id: pick(2),
      business_unit: 'Finance & Accounting',
      process_owner: 'Roni Sihombing',
      document_owner: 'Dian Permata',
      pic: 'Hendra Wijaya',
      issue_date: daysFromNow(-150),
      effective_date: daysFromNow(-140),
      review_date: daysFromNow(-5),
      expiry_date: daysFromNow(215),
      last_revision_date: daysFromNow(-60),
      doc_status: 'Active',
      risk_level: 'Medium',
      document_classification: 'Controlled Document',
      confidentiality: 'Internal',
      controlled_copy: 'Yes',
      regulatory_reference: 'PSAK 1 Penyajian Laporan Keuangan',
      policy_objective: 'Memastikan pelaporan keuangan bulanan akurat dan tepat waktu.',
      scope_of_application: 'Berlaku untuk seluruh tim Finance & Accounting di semua entitas.',
      related_sop_policy: 'SOP Rekonsiliasi Bank',
      revision_notes: 'Penyesuaian deadline closing dari H+5 menjadi H+3.',
      training_required: 'No',
      training_status: '',
      distribution_status: 'Fully Distributed',
      acknowledgement_status: 'Acknowledged',
      review_frequency: 'Quarterly',
      retention_period: '10 Tahun',
      archive_status: 'Active Archive',
      document_url: 'https://drive.google.com/drive/folders/dummy-sop-finance',
      supporting_documents: 'Template Laporan Bulanan, Checklist Closing',
      legal_compliance_notes: '',
      notes: 'Review jatuh tempo minggu ini — perlu dijadwalkan.'
    },
    {
      doc_name: 'Kebijakan Privasi Data Pelanggan',
      category: 'Data Privacy Policy',
      id_number: 'POL-DPP-002',
      version: '1.0',
      company_id: pick(3),
      business_unit: 'Legal & Compliance',
      process_owner: 'Aris Setiawan',
      document_owner: 'Budi Santoso',
      pic: 'Siti Rahma',
      issue_date: daysFromNow(-60),
      effective_date: daysFromNow(-50),
      review_date: daysFromNow(280),
      expiry_date: daysFromNow(305),
      last_revision_date: null,
      doc_status: 'Approved',
      risk_level: 'High',
      document_classification: 'Controlled Document',
      confidentiality: 'Restricted',
      controlled_copy: 'Yes',
      regulatory_reference: 'UU No 27/2022 Pelindungan Data Pribadi',
      policy_objective: 'Menetapkan standar perlindungan data pribadi pelanggan sesuai regulasi.',
      scope_of_application: 'Berlaku untuk seluruh unit yang mengelola data pelanggan.',
      related_sop_policy: 'Kebijakan Keamanan Informasi',
      revision_notes: 'Dokumen baru, belum ada revisi.',
      training_required: 'Yes',
      training_status: 'Not Started',
      distribution_status: 'Not Distributed',
      acknowledgement_status: 'Not Acknowledged',
      review_frequency: 'Annual',
      retention_period: '10 Tahun',
      archive_status: 'Active Archive',
      document_url: 'https://drive.google.com/drive/folders/dummy-policy-dataprivacy',
      supporting_documents: 'DPIA Template',
      legal_compliance_notes: 'Menunggu sosialisasi ke seluruh unit terkait.',
      notes: 'Baru disahkan, distribusi belum dimulai.'
    }
  ];

  let created = 0;
  for (const r of records) {
    const rec = await prisma.compliance_sop.create({ data: r });
    await prisma.compliance_sop_audit_logs.create({
      data: { record_id: rec.id, doc_name: rec.doc_name, action: 'CREATE', performed_by: 'Seed Script' }
    });
    created++;
  }

  console.log(`Seeded ${created} compliance_sop dummy records.`);
}

run().catch(console.error).finally(() => process.exit(0));
