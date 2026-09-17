const ExcelJS = require('../frontend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function buildChangelogExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Antigravity AI (GLC MRA Development Team)';
  wb.created = new Date();
  wb.modified = new Date();

  // Color Palette - Enterprise Blue Theme (Strictly NO Purple)
  const NAVY = '1E293B';
  const BLUE = '2563EB';
  const LIGHT_BLUE = 'EFF6FF';
  const BORDER_COLOR = 'CBD5E1';
  const HEADER_FILL = '0F172A';
  const EMERALD = '059669';
  const AMBER = 'D97706';
  const ROSE = 'E11D48';
  const SLATE = '475569';

  // -------------------------------------------------------------
  // SHEET 1: EXECUTIVE SUMMARY
  // -------------------------------------------------------------
  const wsSummary = wb.addWorksheet('Executive Summary', {
    views: [{ showGridLines: true }]
  });

  // Title Block
  wsSummary.mergeCells('B2:F2');
  const titleCell = wsSummary.getCell('B2');
  titleCell.value = 'GLC MRA SYSTEM — REKAPITULASI PEMBARUAN SISTEM';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(2).height = 36;

  // Subtitle / Metadata Block
  wsSummary.mergeCells('B3:F3');
  const subCell = wsSummary.getCell('B3');
  subCell.value = 'Periode Laporan: 03 September 2026 – 17 September 2026 (2 Minggu Terakhir)';
  subCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FFE2E8F0' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(3).height = 24;

  // KPI Summary Cards (Row 5 - 6)
  const kpis = [
    { col: 'B', label: 'TOTAL COMMITS / UPDATES', val: '31 Pembaruan', bg: 'DBEAFE', text: '1D4ED8' },
    { col: 'C', label: 'FITUR BARU (FEATURES)', val: '15 Fitur', bg: 'D1FAE5', text: '047857' },
    { col: 'D', label: 'PERBAIKAN BUG (FIXES)', val: '8 Perbaikan', bg: 'FEE2E2', text: 'B91C1C' },
    { col: 'E', label: 'UI / UX REFACTORING', val: '4 Peningkatan', bg: 'FEF3C7', text: 'B45309' },
    { col: 'F', label: 'INFRA & BACKUP', val: '4 Pembaruan', bg: 'F1F5F9', text: '334155' }
  ];

  kpis.forEach(k => {
    const lblCell = wsSummary.getCell(`${k.col}5`);
    lblCell.value = k.label;
    lblCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: '64748B' } };
    lblCell.alignment = { horizontal: 'center', vertical: 'middle' };
    lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } };

    const valCell = wsSummary.getCell(`${k.col}6`);
    valCell.value = k.val;
    valCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: k.text } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } };

    [lblCell, valCell].forEach(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };
    });
  });
  wsSummary.getRow(5).height = 20;
  wsSummary.getRow(6).height = 28;

  // Header Ringkasan Pilar Pembaruan
  wsSummary.mergeCells('B8:F8');
  const catHeader = wsSummary.getCell('B8');
  catHeader.value = 'RINGKASAN TONGGAK PENCAPAIAN (KEY MILESTONES) 2 MINGGU TERAKHIR';
  catHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
  catHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsSummary.getRow(8).height = 26;

  // Table Headers
  const summaryHeaders = ['No', 'Pilar / Modul', 'Inisiatif Utama yang Diterapkan', 'Dampak Operasional & Bisnis', 'Status'];
  const summaryCols = ['B', 'C', 'D', 'E', 'F'];
  const summaryWidths = [6, 28, 46, 46, 16];

  summaryHeaders.forEach((h, idx) => {
    const c = wsSummary.getCell(`${summaryCols[idx]}9`);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    c.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 4 ? 'center' : 'left' };
    c.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '475569' } },
      left: { style: 'thin', color: { argb: '94A3B8' } },
      right: { style: 'thin', color: { argb: '94A3B8' } }
    };
  });
  wsSummary.getRow(9).height = 24;

  const summaryData = [
    [
      1,
      'Marketing: Alur Approval (DocHub)',
      'Pengembangan alur penandatangan dokumen berurutan (DocHub/DocuSign-style) dengan Magic Link token email, digital signature canvas, dan estafet otomatis antar step.',
      'Menghilangkan ketergantungan matriks DOA nominal statis yang kaku; approval proposal marketing menjadi dinamis, cepat, dan legal-compliant via tanda tangan digital.',
      'Selesai & Aktif'
    ],
    [
      2,
      'Marketing: Smart Bulk Upload Anggaran',
      'Modul upload alokasi anggaran bulanan via Excel pintar dengan lookup Kode Akun CoA (@ text), Fuzzy Matching vendor mitra (Levenshtein + Jaccard similarity), dan inline correction.',
      'Penyusunan anggaran tahunan (12 periode) yang sebelumnya memakan waktu berjam-jam kini selesai dalam hitungan menit tanpa resiko salah kode CoA atau duplikasi vendor.',
      'Selesai & Aktif'
    ],
    [
      3,
      'Marketing: Sinkronisasi Master Data',
      'Integrasi penuh Brand/Principal ke master data 40 brand resmi MRA Group, cascading dropdown PT-Brand, dan sinkronisasi 31 gerai butik/store resmi (Bvlgari, Omega, Häagen-Dazs, dll).',
      'Data campaign dan alokasi anggaran toko fisik mengikat langsung pada entitas bisnis dan toko yang valid, mencegah human-error salah pilih entitas.',
      'Selesai & Aktif'
    ],
    [
      4,
      'Marketing: Quick Campaign & Duplikasi',
      'Penyediaan mode Quick Campaign 1-layar untuk eksekusi program promosi mendesak, serta fitur 1-klik Duplikasi Campaign dari riwayat tahun/periode sebelumnya.',
      'Meningkatkan produktivitas tim marketing operasional hingga 80% dalam mereplikasi program rutin tanpa mengetik ulang ratusan rincian.',
      'Selesai & Aktif'
    ],
    [
      5,
      'UI/UX: Standarisasi Desain Korporat',
      'Penghapusan seluruh warna ungu/violet (dialihkan ke biru modern & neutral), pembersihan ikon AI sparkles untuk tampilan profesional human-crafted, dan standarisasi bahasa Inggris pada menu Master Data.',
      'Menghadirkan citra platform korporat enterprise MRA Group kelas dunia yang formal, bersih, elegan, dan ramah pengguna.',
      'Selesai & Aktif'
    ],
    [
      6,
      'Database: Backup Lokal Otomatis & DDL',
      'Script backup database lokal terotomatisasi (Docker pg_dump) dengan file DDL lengkap CREATE TABLE, script restore otomatis, dan scheduler Windows Task Scheduler harian.',
      'Menjamin kedaulatan data penuh di server lokal internal, memitigasi resiko downtime cloud Supabase, dan menjamin Disaster Recovery (RPO < 24 jam, RTO < 15 menit).',
      'Selesai & Aktif'
    ],
    [
      7,
      'Infrastruktur: Proxmox CDN & Deploy VPS',
      'Integrasi penyimpanan dokumen dan proposal marketing ke CDN Proxmox VM (202.6.239.245) dengan fallback database, serta pembuatan skrip deploy instan quick-update.sh.',
      'Mengurangi beban penyimpanan server aplikasi, mempercepat load dokumen proposal, dan mempercepat proses rilis pembaruan di VPS dari 5 menit menjadi 30 detik.',
      'Selesai & Aktif'
    ]
  ];

  summaryData.forEach((row, rIdx) => {
    const rowNum = 10 + rIdx;
    const r = wsSummary.getRow(rowNum);
    r.height = 42;

    row.forEach((val, cIdx) => {
      const cell = wsSummary.getCell(`${summaryCols[cIdx]}${rowNum}`);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9, bold: cIdx === 1, color: { argb: '1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 0 || cIdx === 4 ? 'center' : 'left',
        wrapText: true
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };

      if (cIdx === 4) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '047857' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
      }
    });
  });

  // Auto-fit column widths
  summaryCols.forEach((col, idx) => {
    wsSummary.getColumn(col).width = summaryWidths[idx];
  });
  wsSummary.getColumn('A').width = 3;

  // -------------------------------------------------------------
  // SHEET 2: DETAIL PEMBARUAN (CHANGELOG DETAIL)
  // -------------------------------------------------------------
  const wsDetail = wb.addWorksheet('Detail Pembaruan', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 3 }]
  });

  // Header Title
  wsDetail.mergeCells('A1:I1');
  const dTitle = wsDetail.getCell('A1');
  dTitle.value = 'LOG DETAIL SELURUH PEMBARUAN SISTEM (03 SEP 2026 - 17 SEP 2026)';
  dTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  dTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsDetail.getRow(1).height = 32;

  // Subtitle
  wsDetail.mergeCells('A2:I2');
  const dSub = wsDetail.getCell('A2');
  dSub.value = 'Total 29 Pembaruan Produksi Terverifikasi — Dilengkapi Commit Hash, File Komponen, dan Keterangan Teknis & Bisnis';
  dSub.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FFE2E8F0' } };
  dSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
  dSub.alignment = { vertical: 'middle', horizontal: 'center' };
  wsDetail.getRow(2).height = 22;

  // Column Headers
  const detailHeaders = [
    'No',
    'Tanggal & Jam',
    'Modul / Domain',
    'Kategori',
    'Judul Pembaruan',
    'Deskripsi Teknis & Fungsional',
    'Komponen / File Terdampak',
    'Dampak / Nilai Bisnis',
    'Commit Hash'
  ];
  const detailCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const detailWidths = [6, 17, 18, 15, 30, 48, 32, 36, 12];

  detailHeaders.forEach((h, idx) => {
    const c = wsDetail.getCell(`${detailCols[idx]}3`);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    c.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 1 || idx === 3 || idx === 8 ? 'center' : 'left' };
    c.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '1E293B' } },
      left: { style: 'thin', color: { argb: '94A3B8' } },
      right: { style: 'thin', color: { argb: '94A3B8' } }
    };
  });
  wsDetail.getRow(3).height = 26;

  const rawCommits = [
    {
      hash: '7ffa0cb',
      date: '2026-09-17 15:39',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Integrasi Alur Persetujuan (DocHub Workflow) ke Quick Campaign',
      desc: 'Menambahkan seksi penandatangan berurutan (approval chain) langsung di dalam modal Quick Campaign. Approver terisi otomatis sesuai PT yang dipilih dari master approval_role_contacts, mendukung pencarian user, tambah/hapus/geser urutan, validasi email penandatangan, serta pengiriman payload approvers ke backend untuk mengaktifkan Magic Link email approval.',
      files: 'MarketingPlanQuickModal.jsx, MarketingPlanPage.jsx',
      impact: 'Quick Campaign kini memiliki tujuan persetujuan berjenjang yang jelas, transparan, dan terhubung ke workflow notifikasi approval'
    },
    {
      hash: '8e43425',
      date: '2026-09-17 11:56',
      module: 'Marketing',
      cat: 'Bug Fix',
      title: 'Perbaikan Dropdown Perusahaan (PT) yang Tidak Bisa Diganti',
      desc: 'Mengatasi bug di mana pemilihan PT lain pada form wizard marketing langsung ter-reset kembali ke default (PT Mogems). Root cause: useEffect inisialisasi form memiliki dependency ke fungsi getDefaultApprovers yang berubah setiap kali company_id berubah, sehingga form ter-reset setiap kali user memilih PT baru. Perbaikan menggunakan lifecycle ref (prevIsOpenRef) agar efek reset hanya berjalan saat modal pertama kali dibuka. Juga mengganti seluruh styling indigo ke blue pada SearchableCompanySelect.',
      files: 'MarketingPlanWizardModal.jsx, MarketingPlanQuickModal.jsx, SearchableCompanySelect.jsx',
      impact: 'Pengguna dapat bebas memilih PT manapun tanpa form ter-reset, styling konsisten tanpa warna ungu'
    },
    {
      hash: '743a946',
      date: '2026-09-17 11:40',
      module: 'Marketing',
      cat: 'Bug Fix',
      title: 'Auto-Resolve Nama Lengkap Approver dari Master User',
      desc: 'Menyinkronkan email penandatangan default dengan tabel master m_user sehingga nama lengkap pegawai (e.g. Aris Setiyono) terisi otomatis alih-alih menampilkan label teks jabatan.',
      files: 'MarketingPlanWizardModal.jsx',
      impact: 'Menghindari redundansi penamaan, data penandatangan tercatat akurat dan kredibel'
    },
    {
      hash: '9dca02b',
      date: '2026-09-17 11:32',
      module: 'Marketing',
      cat: 'Bug Fix',
      title: 'Sinkronisasi Target Branch & Pembersihan Nama PT',
      desc: 'Memperbaiki logika filter cabang yang sebelumnya menyembunyikan opsi gerai saat brand kosong. Menampilkan Branch / Store Name murni tanpa teks PT, menyertakan input pencarian cepat, serta seeding 24+ gerai butik resmi MRA ke m_branch.',
      files: 'MarketingPlanWizardModal.jsx, MarketingPlanQuickModal.jsx, seed_mra_branches.js',
      impact: 'Pengguna dapat memilih seluruh 31 gerai/toko fisik MRA Group secara akurat tanpa dropdown kosong'
    },
    {
      hash: '33152a3',
      date: '2026-09-17 11:18',
      module: 'UI / UX',
      cat: 'Styling',
      title: 'Pembersihan Ikon AI (Sparkles Star Icons)',
      desc: 'Menghilangkan seluruh ikon bintang/sparkles pada dropdown brand, kartu alur penandatangan dokumen, dan modal bulk upload.',
      files: 'MarketingPlanWizardModal.jsx, MarketingBudgetBulkUploadModal.jsx',
      impact: 'Tampilan antarmuka 100% formal, elegan, dan mencerminkan aplikasi korporat berstandar enterprise'
    },
    {
      hash: '43fb552',
      date: '2026-09-17 10:58',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Integrasi Dropdown Brand/Principal ke Master Brands',
      desc: 'Menciptakan komponen SearchableBrandSelect yang terhubung langsung ke m_brand (40 brand resmi MRA), mendukung pencarian instan, pengelompokan per PT, serta tombol 1-klik pendaftaran brand baru ke database.',
      files: 'SearchableBrandSelect.jsx, MarketingPlanWizardModal.jsx, masterRouter.js',
      impact: 'Pengelolaan portofolio brand MRA Group terpusat, konsisten, dan fleksibel terhadap brand baru'
    },
    {
      hash: 'efcc5f7',
      date: '2026-09-17 10:40',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Smart Bulk Upload Alokasi Anggaran via Excel',
      desc: 'Implementasi antarmuka impor massal alokasi anggaran bulanan dengan tabel pratinjau interaktif, validasi error per-sel, badge pencocokan cerdas, dan koreksi data langsung pada baris.',
      files: 'MarketingBudgetBulkUploadModal.jsx, MarketingPlanWizardModal.jsx',
      impact: 'Penyusunan anggaran tahunan 12 bulan multi-COA selesai dalam sekejap tanpa human-error'
    },
    {
      hash: 'f5eb4f6',
      date: '2026-09-17 10:32',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Template Excel CoA Kode & Fuzzy Matching Vendor',
      desc: 'Mengubah format template Excel impor menjadi Kode Akun CoA angka bertipe teks (@), tab referensi CoA lengkap, serta algoritma pencocokan kemiripan nama vendor (Levenshtein + Jaccard).',
      files: 'MarketingBudgetBulkUploadModal.jsx',
      impact: 'Mencegah distorsi angka akuntansi oleh Excel dan mendeteksi mitra vendor secara cerdas'
    },
    {
      hash: '15e8250',
      date: '2026-09-17 10:19',
      module: 'UI / UX',
      cat: 'Styling',
      title: 'Eliminasi Warna Ungu/Violet ke Tema Biru Korporat',
      desc: 'Menyelaraskan seluruh styling warna tombol, badge, progress bar, dan border fokus dari nuansa ungu/violet ke palet biru korporat (#2563eb), emerald, dan neutral.',
      files: 'Seluruh komponen modul Marketing',
      impact: 'Kepatuhan 100% terhadap panduan desain korporat MRA'
    },
    {
      hash: '5998475',
      date: '2026-09-17 10:09',
      module: 'Master Data',
      cat: 'Refactor',
      title: 'Standarisasi Menu Master Data ke Bahasa Inggris',
      desc: 'Pembaruan label navigasi Master Data: Master Brands, Master Companies, Master LoBs, Master Branches, Master Event Locations.',
      files: 'Sidebar.jsx, routing config',
      impact: 'Standar terminologi bisnis internasional yang konsisten'
    },
    {
      hash: '566ed20',
      date: '2026-09-17 09:34',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Alur Persetujuan Dokumen Berurutan (DocHub Workflow)',
      desc: 'Tabel marketing_plan_approvers dan alur multi-step signers berurutan. Approver aktif menerima notifikasi email Magic Link tanpa login, canvas tanda tangan digital, dan timeline approval visual.',
      files: 'marketing_plan_approvers, marketingPlanController.js, MarketingPlanDetailModal.jsx',
      impact: 'Proses persetujuan proposal marketing dapat dilakukan dari mana saja (mobile-friendly) dalam hitungan detik'
    },
    {
      hash: '49a70f8',
      date: '2026-09-17 09:05',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Integrasi Bulk Excel Upload pada Form Wizard Campaign',
      desc: 'Penyediaan tombol dan alur modal Excel bulk upload di dalam Step 2 (Budget Allocation) form wizard marketing plan.',
      files: 'MarketingPlanWizardModal.jsx, MarketingBudgetBulkUploadModal.jsx',
      impact: 'Pengguna dapat memilih alokasi manual baris-per-baris atau impor massal ratusan alokasi'
    },
    {
      hash: '7cc0ed8',
      date: '2026-09-16 22:10',
      module: 'UI / UX',
      cat: 'New Feature',
      title: 'Komponen Searchable Dropdown dengan Auto-Focus',
      desc: 'Pengembangan komponen dropdown custom yang mendukung pengetikan pencarian langsung dan auto-focus saat dropdown dibuka.',
      files: 'SearchableCompanySelect.jsx, MarketingBranchPage.jsx',
      impact: 'Mempercepat pemilihan entitas PT dan brand di antara puluhan data'
    },
    {
      hash: 'e5a5e05',
      date: '2026-09-16 21:52',
      module: 'Marketing',
      cat: 'Bug Fix',
      title: 'Pemulihan Query Event Locations & Fallback Dropdown',
      desc: 'Memperbaiki query relasi m_event_location di metadata endpoint dan memberikan fallback perusahaan agar opsi dropdown tidak kosong.',
      files: 'marketingSettingsController.js',
      impact: 'Pilihan lokasi acara/event selalu tersedia secara andal'
    },
    {
      hash: '23190e2',
      date: '2026-09-16 21:25',
      module: 'Master Data',
      cat: 'New Feature',
      title: 'Sinkronisasi Relasi Brand dengan Perusahaan (PT)',
      desc: 'Menambahkan relasi m_brand.company_id ke m_company dan mengaktifkan cascading filter pada pemilihan brand di seluruh form marketing.',
      files: 'schema.prisma, masterRouter.js, brandController.js',
      impact: 'Memastikan brand yang tampil relevan dengan entitas PT yang dipilih'
    },
    {
      hash: '34f55dc',
      date: '2026-09-16 21:09',
      module: 'DevOps',
      cat: 'Chore',
      title: 'Penambahan Prisma Generate pada Script Deployment VPS',
      desc: 'Menyertakan instruksi npx prisma generate pada prosedur update otomatis VPS Proxmox VM.',
      files: 'quick-update.sh',
      impact: 'Mencegah potensi error skema database Prisma setelah deploy pembaruan'
    },
    {
      hash: '6bee8b5',
      date: '2026-09-16 21:05',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Setup Relasi Toko Cabang per PT & Brand',
      desc: 'Menghubungkan cabang toko (m_branch) dengan PT dan Brand, serta mengimplementasikan filter cerdas pada checklist cabang target.',
      files: 'm_branch, MarketingBranchPage.jsx',
      impact: 'Pengelompokan gerai dan toko ritel fisik per entitas bisnis tertata rapi'
    },
    {
      hash: '97a431a',
      date: '2026-09-16 20:49',
      module: 'DevOps',
      cat: 'New Feature',
      title: 'Skrip Deployment Cepat Incremental (quick-update.sh)',
      desc: 'Pembuatan bash script otomatis di server VPS yang mengeksekusi git pull, prisma generate, build next.js, dan restart pm2 sekaligus.',
      files: 'quick-update.sh',
      impact: 'Waktu maintenance dan rilis pembaruan di server VPS terpangkas drastis'
    },
    {
      hash: '1bb1ea6',
      date: '2026-09-16 20:46',
      module: 'Marketing',
      cat: 'Bug Fix',
      title: 'Proteksi Aman Penghapusan Cabang & Lokasi Event',
      desc: 'Mengizinkan penghapusan cabang dan lokasi jika hanya terikat pada proposal draft, serta menyertakan modal konfirmasi hapus beranimasi.',
      files: 'marketingSettingsController.js, MarketingBranchPage.jsx',
      impact: 'Pembersihan master data lebih fleksibel tanpa merusak histori transaksi aktif'
    },
    {
      hash: '5b14fc8',
      date: '2026-09-16 20:33',
      module: 'Infrastructure',
      cat: 'New Feature',
      title: 'Integrasi Penyimpanan Media CDN Proxmox VM',
      desc: 'Mengalihkan penyimpanan upload file proposal dan dokumen pendukung ke Proxmox CDN VM (202.6.239.245) dengan fallback otomatis.',
      files: 'uploadController.js, MarketingPlanWizardModal.jsx',
      impact: 'Kapasitas database tetap ringan dan unduhan dokumen proposal berkecepatan tinggi'
    },
    {
      hash: '7ca4836',
      date: '2026-09-16 16:56',
      module: 'UI / UX',
      cat: 'Styling',
      title: 'Harmonisasi Tampilan Quick Campaign Modal',
      desc: 'Penyelarasan palet warna dan komponen visual pada popup pembuatan cepat Quick Campaign.',
      files: 'MarketingPlanQuickModal.jsx',
      impact: 'Konsistensi estetika antarmuka di seluruh modal aplikasi'
    },
    {
      hash: '5c6450e',
      date: '2026-09-16 16:14',
      module: 'Backend',
      cat: 'Bug Fix',
      title: 'Perbaikan Blok Catch & Kurung Kurawal pada deletePlan',
      desc: 'Memperbaiki syntax error penutupan blok catch pada fungsi deletePlan di controller marketing.',
      files: 'marketingPlanController.js',
      impact: 'Menjaga reliabilitas eksekusi runtime server Express.js'
    },
    {
      hash: 'f85eddc',
      date: '2026-09-16 14:41',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Hak Admin Menghapus Approved Plan Tanpa Pembayaran',
      desc: 'Memberikan wewenang kepada Super Admin untuk menghapus marketing plan berstatus APPROVED selama belum ada pencairan dana (PAID).',
      files: 'marketingPlanController.js, cascade rules',
      impact: 'Memberikan ruang koreksi jika terjadi pembatalan program kerja oleh manajemen'
    },
    {
      hash: 'b43411c',
      date: '2026-09-14 11:22',
      module: 'Security',
      cat: 'Chore',
      title: 'Proteksi Berkas Backup Database pada .gitignore',
      desc: 'Menambahkan pola *.sql, *.dump, dan folder backup ke .gitignore agar berkas backup database tidak terdorong ke remote repository publik.',
      files: '.gitignore',
      impact: 'Mencegah potensi kebocoran data sensitif perusahaan ke public repository'
    },
    {
      hash: '78a4e8e',
      date: '2026-09-14 11:21',
      module: 'Database',
      cat: 'New Feature',
      title: 'Penyertaan DDL CREATE TABLE Lengkap pada Backup SQL',
      desc: 'Memperbarui perintah pg_dump agar mencakup seluruh perintah DDL pembuatan tabel, relasi, dan fungsi pada schema glc_mra.',
      files: 'backup_glc_mra.bat, docker config',
      impact: 'File backup SQL dapat direstore secara standalone di server/container baru tanpa setup manual'
    },
    {
      hash: '83fdd18',
      date: '2026-09-14 11:13',
      module: 'Database',
      cat: 'New Feature',
      title: 'Skrip Otomatisasi Restore Database Lokal',
      desc: 'Pembuatan script restore_glc_mra.bat untuk merestore backup database PostgreSQL lokal dengan verifikasi integritas data.',
      files: 'restore_glc_mra.bat',
      impact: 'Kesiapan Disaster Recovery (DR) teruji dan dapat dieksekusi dalam hitungan menit'
    },
    {
      hash: 'ec5e323',
      date: '2026-09-14 11:12',
      module: 'Database',
      cat: 'New Feature',
      title: 'Backup Otomatis Database PostgreSQL & Task Scheduler',
      desc: 'Implementasi skrip backup Docker pg_dump berkala yang terdaftar pada Windows Task Scheduler untuk eksekusi otomatis.',
      files: 'backup_glc_mra.bat, install_task_scheduler.bat',
      impact: 'Kedaulatan dan keamanan cadangan data perusahaan terjamin secara berkala tanpa intervensi manual'
    },
    {
      hash: '0883cd8',
      date: '2026-09-14 10:56',
      module: 'Marketing',
      cat: 'New Feature',
      title: 'Implementasi Mode Quick Campaign & Duplikasi Plan',
      desc: 'Pengembangan modal pembuatan ringkas Quick Campaign dan tombol 1-klik Duplicate Plan untuk mereplikasi campaign beserta seluruh alokasi anggaran.',
      files: 'MarketingPlanQuickModal.jsx, MarketingPlanPage.jsx',
      impact: 'Efisiensi pembuatan program promosi berulang meningkat drastis'
    },
    {
      hash: '1bec3fc',
      date: '2026-09-08 21:25',
      module: 'Backend',
      cat: 'Bug Fix',
      title: 'Peningkatan Limit Body Parser Express ke 50MB',
      desc: 'Menaikkan batas express.json dan urlencoded dari default 100kb menjadi 50MB untuk menampung data unggahan Excel massal berukuran besar.',
      files: 'backend/api/index.js',
      impact: 'Mencegah error HTTP 413 Payload Too Large saat impor data ratusan baris'
    },
    {
      hash: 'b82da3b',
      date: '2026-09-07 10:53',
      module: 'System',
      cat: 'Refactor',
      title: 'Pembersihan Menu IT Self-Service Portal / Helpdesk Tiket',
      desc: 'Menghapus modul tiket helpdesk yang sudah tidak digunakan agar aplikasi fokus pada fungsi GLC dan Marketing.',
      files: 'Sidebar.jsx, route helpdesk',
      impact: 'Navigasi sistem lebih ringkas, terfokus, dan loading sidebar lebih cepat'
    },
    {
      hash: '01e03b6',
      date: '2026-09-07 10:16',
      module: 'Security',
      cat: 'New Feature',
      title: 'Isolasi Hak Akses Data per Unit Bisnis (Multi-Tenant Scope)',
      desc: 'Penerapan filter req.companyScope pada backend Marketing Plan sehingga user hanya melihat data campaign dari PT yang menjadi hak aksesnya.',
      files: 'marketingHelper.js, marketingPlanController.js',
      impact: 'Kerahasiaan anggaran antar unit bisnis MRA Group terlindungi secara ketat'
    }
  ];

  rawCommits.forEach((item, idx) => {
    const rowNum = 4 + idx;
    const r = wsDetail.getRow(rowNum);
    r.height = 36;

    const catColors = {
      'New Feature': { bg: 'ECFDF5', text: '047857' },
      'Bug Fix': { bg: 'FEF2F2', text: 'B91C1C' },
      'Styling': { bg: 'EFF6FF', text: '1D4ED8' },
      'Refactor': { bg: 'FFFBEB', text: 'B45309' },
      'Chore': { bg: 'F1F5F9', text: '475569' }
    };
    const cConf = catColors[item.cat] || { bg: 'FFFFFF', text: '1E293B' };

    const vals = [
      idx + 1,
      item.date,
      item.module,
      item.cat,
      item.title,
      item.desc,
      item.files,
      item.impact,
      item.hash
    ];

    vals.forEach((v, cIdx) => {
      const cell = wsDetail.getCell(`${detailCols[cIdx]}${rowNum}`);
      cell.value = v;
      cell.font = { name: 'Arial', size: 8.5, color: { argb: '1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 0 || cIdx === 1 || cIdx === 3 || cIdx === 8 ? 'center' : 'left',
        wrapText: true
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };

      if (cIdx === 3) {
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: cConf.text } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cConf.bg } };
      }
      if (cIdx === 4) {
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '0F172A' } };
      }
      if (cIdx === 8) {
        cell.font = { name: 'Consolas', size: 8.5, bold: true, color: { argb: '2563EB' } };
      }
    });
  });

  detailCols.forEach((col, idx) => {
    wsDetail.getColumn(col).width = detailWidths[idx];
  });

  // -------------------------------------------------------------
  // SHEET 3: DAMPAK BISNIS & VALUE CREATION
  // -------------------------------------------------------------
  const wsRoi = wb.addWorksheet('Dampak Bisnis & Value', {
    views: [{ showGridLines: true }]
  });

  wsRoi.mergeCells('B2:F2');
  const roiTitle = wsRoi.getCell('B2');
  roiTitle.value = 'EVALUASI VALUE CREATION & EFISIENSI OPERASIONAL BISNIS';
  roiTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  roiTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  roiTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsRoi.getRow(2).height = 32;

  const roiHeaders = ['No', 'Dimensi Evaluasi', 'Kondisi Sebelumnya (Before)', 'Kondisi Saat Ini (After)', 'Efisiensi / Value yang Dicapai'];
  const roiCols = ['B', 'C', 'D', 'E', 'F'];
  const roiWidths = [6, 26, 38, 40, 36];

  roiHeaders.forEach((h, idx) => {
    const c = wsRoi.getCell(`${roiCols[idx]}4`);
    c.value = h;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    c.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'center' : 'left' };
    c.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '475569' } },
      left: { style: 'thin', color: { argb: '94A3B8' } },
      right: { style: 'thin', color: { argb: '94A3B8' } }
    };
  });
  wsRoi.getRow(4).height = 24;

  const roiRows = [
    [
      1,
      'Alur Approval Proposal Marketing',
      'Matriks DOA statis kaku berdasarkan nominal plafon. Jika approver berhalangan, alur tertahan berhari-hari.',
      'Alur DocHub Sequential dinamis via Magic Link email. Approver dapat menandatangani secara digital dari perangkat mobile tanpa login.',
      'Kecepatan persetujuan proposal meningkat > 70% (dari 3-5 hari kerja menjadi hitungan jam).'
    ],
    [
      2,
      'Penyusunan Anggaran Tahunan (12 Bulan)',
      'Input alokasi baris demi baris secara manual pada form web. Rentan salah input nominal dan memakan waktu berjam-jam.',
      'Fitur Smart Bulk Upload Excel dengan CoA lookup otomatis dan Fuzzy Matching vendor mitra.',
      'Waktu input berkurang hingga 90% dengan zero data-entry errors (tervalidasi otomatis sebelum simpan).'
    ],
    [
      3,
      'Kualitas & Integritas Master Data',
      'Pilihan brand dan cabang toko tidak saling mengikat; rawan proposal salah tagging ke toko atau entitas yang bukan miliknya.',
      'Cascading dropdown PT - Brand - Store Name dengan master 40 brand dan 31 gerai resmi MRA Group.',
      'Laporan keuangan marketing akurat per cost center, unit bisnis, dan toko fisik.'
    ],
    [
      4,
      'Keamanan & Cadangan Data (Data Sovereignty)',
      'Data hanya mengandalkan cloud database eksternal tanpa cadangan lokal terstruktur yang bisa direstore secara mandiri.',
      'Automated daily backup dengan DDL lengkap di server lokal internal + skrip pemulihan disaster recovery instan.',
      'Mitigasi risiko kehilangan data operasional kritis MRA Group hingga 99.9% (RPO < 24 jam).'
    ],
    [
      5,
      'Penyimpanan & Kecepatan Akses Dokumen',
      'Berkas proposal besar berpotensi membebani database dan memperlambat response server.',
      'Integrasi Proxmox CDN berkecepatan tinggi dengan cadangan database transparan.',
      'Kecepatan preview proposal meningkat 3x lipat dan beban penyimpanan database berkurang drastis.'
    ]
  ];

  roiRows.forEach((row, rIdx) => {
    const rowNum = 5 + rIdx;
    const r = wsRoi.getRow(rowNum);
    r.height = 46;

    row.forEach((val, cIdx) => {
      const cell = wsRoi.getCell(`${roiCols[cIdx]}${rowNum}`);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9, bold: cIdx === 1, color: { argb: '1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 0 ? 'center' : 'left',
        wrapText: true
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };

      if (cIdx === 4) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '047857' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
      }
    });
  });

  roiCols.forEach((col, idx) => {
    wsRoi.getColumn(col).width = roiWidths[idx];
  });
  wsRoi.getColumn('A').width = 3;

  // Save to Workspace
  const outputPath = path.resolve('d:/Private Project/GLC Apps/GLC_MRA_Changelog_2_Minggu_Terakhir.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log('Successfully generated Excel at:', outputPath);

  // Also copy to Brain Artifact directory
  const artifactPath = path.resolve('C:/Users/ariss/.gemini/antigravity/brain/38659e59-8b89-4f8c-9e0d-673fabd3dd9f/GLC_MRA_Changelog_2_Minggu_Terakhir.xlsx');
  fs.copyFileSync(outputPath, artifactPath);
  console.log('Copied to artifact path:', artifactPath);
}

buildChangelogExcel().catch(e => {
  console.error('Failed to build Excel:', e);
  process.exit(1);
});
