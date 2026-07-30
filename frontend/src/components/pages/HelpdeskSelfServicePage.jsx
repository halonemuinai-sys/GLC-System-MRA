'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Code2, Wifi, Key, Printer, Smartphone, HelpCircle,
  Mail, RefreshCw, Database, ShieldOff, Package, Download,
  Folder, Globe, Truck, CheckCircle, ArrowLeft, Send,
  Loader2, AlertTriangle, ClipboardList, ChevronRight, Headphones,
  User, Building, Clock, BadgeCheck
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';

// ── Definisi kategori lengkap ──────────────────────────────────────────────────

const INSIDEN = [
  {
    id: 'Hardware',
    label: 'Hardware',
    desc: 'Laptop, PC, mouse, keyboard, monitor',
    icon: Monitor,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    fields: [
      { name: 'device_type', label: 'Jenis Perangkat', type: 'text', placeholder: 'Contoh: Laptop Dell Latitude', required: true },
      { name: 'asset_tag', label: 'Asset Tag / No. Seri', type: 'text', placeholder: 'Kosongkan jika tidak tahu', required: false },
      { name: 'symptom', label: 'Gejala Masalah', type: 'textarea', placeholder: 'Jelaskan gejala yang terjadi...', required: true },
    ]
  },
  {
    id: 'Software / Aplikasi',
    label: 'Software / Aplikasi',
    desc: 'Error, crash, instalasi bermasalah',
    icon: Code2,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    fields: [
      { name: 'app_name', label: 'Nama Aplikasi', type: 'text', placeholder: 'Contoh: Microsoft Excel, Retailsoft POS', required: true },
      { name: 'error_message', label: 'Pesan Error (jika ada)', type: 'text', placeholder: 'Salin pesan error yang muncul', required: false },
    ]
  },
  {
    id: 'Network / Internet',
    label: 'Network / Internet',
    desc: 'Koneksi LAN, WiFi, VPN lambat/putus',
    icon: Wifi,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    fields: [
      { name: 'location', label: 'Lokasi / Ruangan', type: 'text', placeholder: 'Contoh: Lantai 3, Ruang Marketing', required: true },
      { name: 'connection_type', label: 'Jenis Koneksi', type: 'select', options: ['WiFi', 'LAN / Kabel', 'VPN', 'Tidak tahu'], required: true },
    ]
  },
  {
    id: 'Akses & Password',
    label: 'Akses & Password',
    desc: 'Login gagal, reset password, akses diblokir',
    icon: Key,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    fields: [
      { name: 'system_name', label: 'Sistem / Aplikasi', type: 'text', placeholder: 'Contoh: Email, ERP Retailsoft, GLC Apps', required: true },
      { name: 'username', label: 'Username / Email Login', type: 'text', placeholder: 'Username yang bermasalah', required: false },
    ]
  },
  {
    id: 'Printer / Scanner',
    label: 'Printer / Scanner',
    desc: 'Masalah cetak, scan, fotokopi',
    icon: Printer,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    fields: [
      { name: 'device_name', label: 'Nama / Lokasi Printer', type: 'text', placeholder: 'Contoh: Canon LBP246 - Lantai 2', required: true },
      { name: 'issue_type', label: 'Jenis Masalah', type: 'select', options: ['Tidak bisa print', 'Kertas macet', 'Hasil cetak buram', 'Tidak bisa scan', 'Lainnya'], required: true },
    ]
  },
  {
    id: 'HP / Telepon',
    label: 'HP / Telepon',
    desc: 'Smartphone kantor, ekstensi PABX',
    icon: Smartphone,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-500/10',
    fields: [
      { name: 'device_info', label: 'Nomor Ekstensi / Tipe HP', type: 'text', placeholder: 'Contoh: Ext. 101 / Samsung A54', required: false },
    ]
  },
  {
    id: 'Lainnya',
    label: 'Lainnya',
    desc: 'Kendala IT di luar kategori di atas',
    icon: HelpCircle,
    color: 'text-neutral-500 dark:text-neutral-400',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    fields: []
  },
];

const SERVICE_REQUESTS = [
  {
    id: 'Pembuatan Email Baru',
    label: 'Pembuatan Email Baru',
    desc: 'Email karyawan baru (@mraretail.co.id)',
    icon: Mail,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    fields: [
      { name: 'full_name',     label: 'Nama Lengkap Karyawan', type: 'text', placeholder: 'Sesuai KTP / SK Pengangkatan', required: true },
      { name: 'nik',           label: 'NIK Karyawan', type: 'text', placeholder: 'Nomor Induk Karyawan', required: true },
      { name: 'department',    label: 'Departemen / Divisi', type: 'text', placeholder: 'Contoh: Marketing, Finance', required: true },
      { name: 'position',      label: 'Jabatan', type: 'text', placeholder: 'Contoh: Staff Marketing', required: true },
      { name: 'start_date',    label: 'Tanggal Mulai Kerja', type: 'date', required: true },
      { name: 'manager_name',  label: 'Nama Atasan Langsung', type: 'text', placeholder: 'Untuk CC email persetujuan', required: false },
    ]
  },
  {
    id: 'Reset Password / Akun',
    label: 'Reset Password / Akun',
    desc: 'Reset akun email, ERP, atau sistem lain',
    icon: RefreshCw,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    fields: [
      { name: 'target_email',  label: 'Email / Username Target', type: 'text', placeholder: 'Email atau username yang ingin direset', required: true },
      { name: 'system_name',   label: 'Sistem / Aplikasi', type: 'select', options: ['Email (Google Workspace)', 'ERP Retailsoft', 'GLC Apps', 'VPN', 'Windows Login', 'Lainnya'], required: true },
      { name: 'reason',        label: 'Alasan Reset', type: 'text', placeholder: 'Contoh: Lupa password, akun terkunci', required: true },
    ]
  },
  {
    id: 'Akun ERP Retailsoft',
    label: 'Akun ERP Retailsoft',
    desc: 'Buat / ubah akses Retailsoft POS & Back Office',
    icon: Database,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    fields: [
      { name: 'full_name',     label: 'Nama Lengkap Karyawan', type: 'text', required: true },
      { name: 'nik',           label: 'NIK Karyawan', type: 'text', required: true },
      { name: 'store_branch',  label: 'Toko / Cabang', type: 'text', placeholder: 'Nama toko atau kode cabang', required: true },
      { name: 'request_type',  label: 'Jenis Permintaan', type: 'select', options: ['Buat Akun Baru', 'Ubah Level Akses', 'Tambah Cabang', 'Nonaktifkan Akun'], required: true },
      { name: 'access_level',  label: 'Level Akses Diminta', type: 'select', options: ['Cashier', 'Supervisor', 'Store Manager', 'Area Manager', 'Back Office Viewer', 'Back Office Full'], required: true },
      { name: 'start_date',    label: 'Tanggal Efektif', type: 'date', required: false },
    ]
  },
  {
    id: 'Perubahan Akses ERP',
    label: 'Perubahan Akses ERP',
    desc: 'Mutasi jabatan, tambah lokasi, upgrade akses',
    icon: ShieldOff,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    fields: [
      { name: 'full_name',     label: 'Nama Karyawan', type: 'text', required: true },
      { name: 'nik',           label: 'NIK Karyawan', type: 'text', required: true },
      { name: 'current_access', label: 'Akses Saat Ini', type: 'text', placeholder: 'Deskripsi akses yang dimiliki sekarang', required: false },
      { name: 'new_access',    label: 'Akses yang Diminta', type: 'text', placeholder: 'Deskripsi perubahan yang dibutuhkan', required: true },
      { name: 'reason',        label: 'Alasan Perubahan', type: 'text', placeholder: 'Contoh: Mutasi ke cabang Surabaya', required: true },
    ]
  },
  {
    id: 'Nonaktifkan Akun',
    label: 'Nonaktifkan Akun Karyawan',
    desc: 'Karyawan resign / PHK — matikan semua akses',
    icon: ShieldOff,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    fields: [
      { name: 'full_name',     label: 'Nama Karyawan', type: 'text', required: true },
      { name: 'nik',           label: 'NIK Karyawan', type: 'text', required: true },
      { name: 'email',         label: 'Email Karyawan', type: 'text', required: true },
      { name: 'last_date',     label: 'Tanggal Terakhir Bekerja', type: 'date', required: true },
      { name: 'systems',       label: 'Sistem yang Perlu Dinonaktifkan', type: 'textarea', placeholder: 'Contoh: Email, ERP Retailsoft, GLC Apps, VPN', required: false },
    ]
  },
  {
    id: 'Instalasi Software',
    label: 'Instalasi Software',
    desc: 'Minta instalasi / lisensi software baru',
    icon: Download,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    fields: [
      { name: 'software_name', label: 'Nama Software', type: 'text', placeholder: 'Contoh: Adobe Acrobat, AutoCAD', required: true },
      { name: 'purpose',       label: 'Kebutuhan / Tujuan', type: 'textarea', placeholder: 'Jelaskan mengapa software ini dibutuhkan', required: true },
      { name: 'device_target', label: 'Perangkat / Asset Tag', type: 'text', placeholder: 'PC/laptop yang akan diinstall', required: false },
    ]
  },
  {
    id: 'Permintaan Perangkat Baru',
    label: 'Permintaan Perangkat',
    desc: 'Laptop, mouse, headset, monitor, dsb',
    icon: Package,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    fields: [
      { name: 'device_type',   label: 'Jenis Perangkat', type: 'select', options: ['Laptop', 'PC Desktop', 'Monitor', 'Mouse / Keyboard', 'Headset', 'Webcam', 'Printer', 'Lainnya'], required: true },
      { name: 'specs',         label: 'Spesifikasi / Merek (jika ada)', type: 'text', placeholder: 'Opsional', required: false },
      { name: 'purpose',       label: 'Justifikasi Kebutuhan', type: 'textarea', placeholder: 'Jelaskan mengapa perangkat ini diperlukan', required: true },
      { name: 'urgency',       label: 'Tingkat Urgensi', type: 'select', options: ['Segera (< 1 minggu)', 'Normal (1-2 minggu)', 'Bisa ditunggu (> 2 minggu)'], required: true },
    ]
  },
  {
    id: 'Akun VPN',
    label: 'Pembuatan Akun VPN',
    desc: 'Akses jaringan kantor dari luar',
    icon: Globe,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    fields: [
      { name: 'full_name',     label: 'Nama Karyawan', type: 'text', required: true },
      { name: 'nik',           label: 'NIK Karyawan', type: 'text', required: true },
      { name: 'access_need',   label: 'Sistem yang Perlu Diakses via VPN', type: 'textarea', placeholder: 'Contoh: ERP Retailsoft, Server File', required: true },
      { name: 'work_location', label: 'Lokasi Kerja (WFH / Cabang)', type: 'text', placeholder: 'Contoh: WFH Jakarta, Cabang Surabaya', required: true },
    ]
  },
  {
    id: 'Akses Folder / Drive',
    label: 'Akses Folder / Drive Jaringan',
    desc: 'Buka akses shared drive, folder server',
    icon: Folder,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    fields: [
      { name: 'full_name',     label: 'Nama Karyawan', type: 'text', required: true },
      { name: 'folder_path',   label: 'Path / Nama Folder', type: 'text', placeholder: 'Contoh: \\\\server\\Finance\\2024', required: true },
      { name: 'access_level',  label: 'Level Akses', type: 'select', options: ['Read Only (Baca)', 'Read & Write (Baca + Edit)', 'Full Control'], required: true },
      { name: 'reason',        label: 'Alasan Diperlukan', type: 'text', required: true },
    ]
  },
  {
    id: 'Akun Sistem Lain',
    label: 'Akun Sistem Lain',
    desc: 'CRM, sistem absensi, aplikasi khusus',
    icon: Globe,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',
    fields: [
      { name: 'system_name',   label: 'Nama Sistem / Aplikasi', type: 'text', placeholder: 'Contoh: CRM Salesforce, Absensi Fingerspot', required: true },
      { name: 'full_name',     label: 'Nama Karyawan', type: 'text', required: true },
      { name: 'nik',           label: 'NIK Karyawan', type: 'text', required: true },
      { name: 'access_level',  label: 'Level Akses', type: 'text', placeholder: 'Contoh: User biasa, Admin', required: true },
    ]
  },
  {
    id: 'Relokasi Perangkat',
    label: 'Relokasi Perangkat',
    desc: 'Pindah / swap perangkat antar lokasi',
    icon: Truck,
    color: 'text-stone-600 dark:text-stone-400',
    bg: 'bg-stone-100 dark:bg-stone-800',
    fields: [
      { name: 'asset_tag',     label: 'Asset Tag / Deskripsi Perangkat', type: 'text', required: true },
      { name: 'from_location', label: 'Dari (Lokasi Asal)', type: 'text', required: true },
      { name: 'to_location',   label: 'Ke (Lokasi Tujuan)', type: 'text', required: true },
      { name: 'reason',        label: 'Alasan Relokasi', type: 'text', required: false },
    ]
  },
];

// ── Dynamic Field Component ────────────────────────────────────────────────────

function DynamicField({ field, value, onChange }) {
  const base = 'w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all';

  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(field.name, e.target.value)} className={base} required={field.required}>
        <option value="">Pilih...</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea value={value || ''} onChange={e => onChange(field.name, e.target.value)}
        placeholder={field.placeholder} rows={3} required={field.required}
        className={`${base} resize-none leading-relaxed`} />
    );
  }
  return (
    <input type={field.type} value={value || ''} onChange={e => onChange(field.name, e.target.value)}
      placeholder={field.placeholder} required={field.required}
      className={base} />
  );
}

// ── Category Card ──────────────────────────────────────────────────────────────

function CategoryCard({ cat, selected, onClick }) {
  const Icon = cat.icon;
  return (
    <button type="button" onClick={() => onClick(cat)}
      className={`w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/40'
      }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cat.bg}`}>
        <Icon className={`w-4.5 h-4.5 ${cat.color}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-bold leading-tight ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-800 dark:text-neutral-200'}`}>{cat.label}</p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">{cat.desc}</p>
      </div>
      {selected && <BadgeCheck className="w-4 h-4 text-indigo-500 ml-auto shrink-0" />}
    </button>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  OPEN:        { label: 'Terbuka',     cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  IN_PROGRESS: { label: 'Diproses',   cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  PENDING:     { label: 'Menunggu',   cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' },
  RESOLVED:    { label: 'Selesai',    cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  CLOSED:      { label: 'Ditutup',    cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' },
};
const PRIORITY_STYLE = {
  HIGH:   'text-red-600 dark:text-red-400',
  MEDIUM: 'text-amber-600 dark:text-amber-400',
  LOW:    'text-emerald-600 dark:text-emerald-400',
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function HelpdeskSelfServicePage() {
  const userName = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return Cookies.get('glc_user_name') || Cookies.get('glc_user_email') || 'Karyawan';
  }, []);

  const [view, setView] = useState('wizard'); // 'wizard' | 'my-tickets'
  const [step, setStep] = useState(1); // 1 = type+category, 2 = form details
  const [ticketType, setTicketType] = useState('insiden'); // 'insiden' | 'service_request'
  const [selectedCat, setSelectedCat] = useState(null);
  const [formData, setFormData] = useState({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);

  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const categories = ticketType === 'insiden' ? INSIDEN : SERVICE_REQUESTS;

  const handleSelectCat = (cat) => {
    setSelectedCat(cat);
    setFormData({});
  };

  const handleFieldChange = useCallback((name, val) => {
    setFormData(prev => ({ ...prev, [name]: val }));
  }, []);

  const handleNext = () => {
    if (!selectedCat) return;
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCat || !title.trim() || !description.trim()) {
      setError('Judul dan deskripsi wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/helpdesk/tickets', {
        title: title.trim(),
        description: description.trim(),
        category: selectedCat.id,
        ticketType,
        formData: Object.keys(formData).length > 0 ? formData : null
      });
      setSubmitted(res.ticket);
    } catch (err) {
      setError(err.message || 'Gagal mengirim tiket. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await apiClient.get('/api/helpdesk/tickets');
      setMyTickets(res || []);
    } catch {
      setMyTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleViewMyTickets = () => {
    setView('my-tickets');
    loadMyTickets();
  };

  const resetWizard = () => {
    setStep(1); setSelectedCat(null); setFormData({});
    setTitle(''); setDescription(''); setSubmitted(null); setError(null);
    setTicketType('insiden');
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto pt-10">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white">Tiket Berhasil Dikirim!</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Tim IT akan segera menangani laporan Anda</p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">ID Tiket</span>
              <span className="font-black text-neutral-800 dark:text-neutral-200 font-mono">#{submitted.id.slice(0,8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Kategori</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{submitted.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Prioritas</span>
              <span className={`font-bold ${PRIORITY_STYLE[submitted.priority]}`}>{submitted.priority}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400">Cek status tiket di menu <strong>Tiket Saya</strong>, atau tunggu notifikasi dari tim IT.</p>
          <div className="flex gap-2">
            <button onClick={resetWizard}
              className="flex-1 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-all cursor-pointer">
              Buat Tiket Baru
            </button>
            <button onClick={handleViewMyTickets}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer">
              Tiket Saya
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── MY TICKETS VIEW ─────────────────────────────────────────────────────────
  if (view === 'my-tickets') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('wizard')}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">Tiket Saya</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Riwayat laporan & permintaan IT Anda</p>
          </div>
          <button onClick={loadMyTickets} className="ml-auto p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loadingTickets ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingTickets ? (
          <div className="flex items-center justify-center py-16 gap-2 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Memuat...</span>
          </div>
        ) : myTickets.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Belum ada tiket</p>
            <button onClick={() => setView('wizard')} className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Buat tiket pertama →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map(t => {
              const s = STATUS_STYLE[t.status] || STATUS_STYLE.OPEN;
              return (
                <div key={t.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-neutral-900 dark:text-white leading-tight">{t.title}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{t.category} {t.subType ? `· ${t.subType}` : ''}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-neutral-400 dark:text-neutral-500">
                    <span className={`font-bold ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    <span>·</span>
                    <span className="font-mono">#{t.id.slice(0,8).toUpperCase()}</span>
                    <span>·</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {t.assignee && <><span>·</span><span>Ditangani: {t.assignee.name}</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── WIZARD ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">IT Self-Service Portal</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Halo, <span className="font-semibold text-neutral-700 dark:text-neutral-300">{userName}</span> — ada yang bisa dibantu?</p>
          </div>
        </div>
        <button onClick={handleViewMyTickets}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all cursor-pointer">
          <ClipboardList className="w-3.5 h-3.5" /> Tiket Saya
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
          {step > 1 ? <BadgeCheck className="w-3.5 h-3.5" /> : <span>1</span>}
          Pilih Kategori
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
          <span>2</span> Detail & Kirim
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Type + Category ────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            className="space-y-5">

            {/* Type toggle */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Jenis Permintaan</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setTicketType('insiden'); setSelectedCat(null); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    ticketType === 'insiden'
                      ? 'border-red-400 bg-red-50 dark:bg-red-500/10'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/40'
                  }`}>
                  <AlertTriangle className={`w-6 h-6 ${ticketType === 'insiden' ? 'text-red-500' : 'text-neutral-400'}`} />
                  <div className="text-center">
                    <p className={`text-xs font-black ${ticketType === 'insiden' ? 'text-red-600 dark:text-red-400' : 'text-neutral-700 dark:text-neutral-300'}`}>Laporkan Insiden</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Ada yang rusak / tidak bisa dipakai</p>
                  </div>
                </button>
                <button type="button" onClick={() => { setTicketType('service_request'); setSelectedCat(null); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    ticketType === 'service_request'
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/40'
                  }`}>
                  <Send className={`w-6 h-6 ${ticketType === 'service_request' ? 'text-indigo-500' : 'text-neutral-400'}`} />
                  <div className="text-center">
                    <p className={`text-xs font-black ${ticketType === 'service_request' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'}`}>Service Request</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Buat akun, minta perangkat, dll</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                {ticketType === 'insiden' ? 'Kategori Masalah' : 'Kategori Permintaan'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map(cat => (
                  <CategoryCard key={cat.id} cat={cat} selected={selectedCat?.id === cat.id} onClick={handleSelectCat} />
                ))}
              </div>
            </div>

            <button onClick={handleNext} disabled={!selectedCat}
              className="w-full py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer">
              Lanjut <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: Detail Form ────────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            className="space-y-4">

            {/* Selected category recap */}
            <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
              {(() => { const SelIcon = selectedCat.icon; return (
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selectedCat.bg}`}>
                <SelIcon className={`w-4 h-4 ${selectedCat.color}`} />
              </div>
              ); })()}
              <div className="flex-1">
                <p className="text-xs font-black text-neutral-800 dark:text-neutral-200">{selectedCat.label}</p>
                <p className="text-[10px] text-neutral-400">{ticketType === 'insiden' ? 'Insiden' : 'Service Request'}</p>
              </div>
              <button onClick={() => setStep(1)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dynamic fields per category */}
              {selectedCat.fields.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Informasi Tambahan</p>
                  {selectedCat.fields.map(field => (
                    <div key={field.name} className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      <DynamicField field={field} value={formData[field.name]} onChange={handleFieldChange} />
                    </div>
                  ))}
                </div>
              )}

              {/* Title + Description */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Deskripsi Masalah / Permintaan</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Judul <span className="text-red-400">*</span></label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                    placeholder="Ringkasan singkat masalah atau permintaan Anda..."
                    className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Detail {ticketType === 'insiden' ? 'Masalah' : 'Permintaan'} <span className="text-red-400">*</span>
                  </label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4}
                    placeholder={ticketType === 'insiden'
                      ? 'Jelaskan apa yang terjadi, sejak kapan, dan sudah dicoba apa saja...'
                      : 'Jelaskan kebutuhan Anda lebih detail...'}
                    className="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none leading-relaxed" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Mengirim...' : 'Kirim Laporan'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
