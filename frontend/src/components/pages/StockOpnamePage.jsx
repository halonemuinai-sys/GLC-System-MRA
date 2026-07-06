'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, QrCode, ClipboardCheck, ArrowLeft, Loader2, Trash2, X, AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

const CHECK_STATUS_BADGE = {
  Found: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Missing: 'bg-red-500/10 text-red-600 dark:text-red-400',
  Pending: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300'
};

const CHECK_STATUS_LABEL = { Found: 'Ditemukan', Missing: 'Hilang', Pending: 'Pending' };

const defaultForm = { session_name: '', description: '', company_id: '', category_id: '' };

function ProgressBar({ progress, colorClass = 'bg-indigo-600' }) {
  return (
    <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${progress}%` }} />
    </div>
  );
}

export default function StockOpnamePage() {
  const { lang, t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [checks, setChecks] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanMsg, setScanMsg] = useState({ text: '', type: '' });
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const scanInputRef = useRef(null);

  useEffect(() => {
    loadSessions();
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => {});
    apiClient.get('/api/ga/assets-categories').then(setCategories).catch(() => {});
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/ga/stock-opname');
      setSessions(res.sessions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setFormErr('');
    if (!form.session_name.trim()) { setFormErr('Nama sesi wajib diisi.'); return; }
    setSaving(true);
    try {
      await apiClient.post('/api/ga/stock-opname', form);
      setShowCreate(false);
      setForm({ ...defaultForm });
      loadSessions();
    } catch (err) {
      setFormErr(err.message || 'Gagal membuat sesi.');
    } finally {
      setSaving(false);
    }
  };

  const openSession = async (session) => {
    setActiveSession(session);
    setDetailLoading(true);
    try {
      const res = await apiClient.get('/api/ga/stock-opname', { params: { id: session.id } });
      setChecks(res.checks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/ga/stock-opname/${sessionToDelete.id}`);
      setSessionToDelete(null);
      loadSessions();
    } catch (err) {
      alert(err.message || 'Gagal menghapus sesi.');
    } finally {
      setDeleting(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code || !activeSession) return;
    setScanInput('');
    setScanMsg({ text: 'Memproses...', type: 'info' });
    try {
      const res = await apiClient.post('/api/ga/stock-opname/scan', { session_id: activeSession.id, asset_code: code, check_status: 'Found' });
      const wasPending = checks.find(c => c.asset_code === code)?.check_status === 'Pending';
      setScanMsg({ text: `Ditemukan: ${res.asset.asset_name}`, type: 'success' });
      setChecks(checks.map(c => c.asset_code === code ? { ...c, check_status: 'Found' } : c));
      if (wasPending) {
        setActiveSession(prev => ({ ...prev, checked_count: prev.checked_count + 1, found_count: prev.found_count + 1 }));
      }
    } catch (err) {
      setScanMsg({ text: err.message || 'Gagal memproses scan.', type: 'error' });
    }
    scanInputRef.current?.focus();
  };

  useEffect(() => {
    if (scanMode && scanInputRef.current) scanInputRef.current.focus();
  }, [scanMode]);

  const inputCls = 'w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500';

  // ── DETAIL VIEW ──────────────────────────────────────────────
  if (activeSession) {
    const pending = activeSession.total_assets - activeSession.checked_count;
    const pct = activeSession.total_assets ? Math.round((activeSession.checked_count / activeSession.total_assets) * 100) : 0;

    return (
      <div className="space-y-6 relative pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button type="button" onClick={() => setActiveSession(null)} className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline mb-2 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Sesi
            </button>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{activeSession.session_name}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Total {activeSession.total_assets} aset dalam sesi ini.</p>
          </div>
          <button type="button" onClick={() => { setScanMsg({ text: '', type: '' }); setScanMode(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit">
            <QrCode className="w-4 h-4" /> {t('stockOpname_scanMode')}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Total Aset</p>
            <p className="text-xl font-black text-neutral-800 dark:text-white">{activeSession.total_assets}</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Sudah Dicek</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{activeSession.checked_count}</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Ditemukan</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeSession.found_count}</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Sisa (Pending)</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">{pending}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Progress Pengecekan</span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
          </div>
          <ProgressBar progress={pct} />
        </div>

        {/* Asset check table */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          {detailLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-neutral-400">Memuat data pengecekan...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-4">Status</th>
                    <th className="p-4">Kode Aset</th>
                    <th className="p-4">Nama Aset</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Perusahaan</th>
                    <th className="p-4">{t('stockOpname_colLocation')}</th>
                    <th className="p-4">{t('stockOpname_colCondition')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  {checks.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${CHECK_STATUS_BADGE[c.check_status] || CHECK_STATUS_BADGE.Pending}`}>
                          {CHECK_STATUS_LABEL[c.check_status] || c.check_status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-neutral-600 dark:text-neutral-400">{c.asset_code}</td>
                      <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{c.asset_name}</td>
                      <td className="p-4 text-neutral-500">{c.category || '-'}</td>
                      <td className="p-4 text-neutral-500">{c.company || '-'}</td>
                      <td className="p-4 text-neutral-500">{c.room || '-'}</td>
                      <td className="p-4 text-neutral-500">{c.current_condition || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scan Modal */}
        <AnimatePresence>
          {scanMode && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setScanMode(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]" />
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                  className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center">
                  <button onClick={() => setScanMode(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-white mb-3">{t('stockOpname_scanMode')}</h3>
                  <QrCode className="w-12 h-12 text-indigo-400 opacity-50 mb-3" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
                    Scan barcode aset atau <strong>ketik kode aset</strong> secara manual, lalu tekan <strong>Enter</strong>.<br />
                    Aset otomatis tersimpan sebagai <strong>Ditemukan</strong>.
                  </p>

                  {scanMsg.text && (
                    <div className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-center border mb-4 ${
                      scanMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' :
                      scanMsg.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30' :
                      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30'
                    }`}>
                      {scanMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleScanSubmit} className="w-full">
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      className="w-full text-center text-lg font-mono font-bold tracking-widest bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-3 text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                      placeholder={t('stockOpname_scanPrompt')}
                      autoFocus
                    />
                  </form>

                  <button type="button" onClick={() => setScanMode(false)} className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                    Selesai Scan
                  </button>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── SESSION LIST ─────────────────────────────────────────────
  return (
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-indigo-500" />
            {t('stockOpname_title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Verifikasi fisik aset menggunakan barcode scanner.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit">
          <Plus className="w-4 h-4" /> {t('stockOpname_newSession')}
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-neutral-400">Memuat sesi...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            <p className="font-bold text-neutral-600 dark:text-neutral-300 mb-1">Belum ada sesi Stock Opname</p>
            Buat sesi baru untuk memulai verifikasi fisik aset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Nama Sesi</th>
                  <th className="p-4">Deskripsi</th>
                  <th className="p-4">Tanggal Mulai</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {sessions.map(s => {
                  const pct = s.total_assets ? Math.round((s.checked_count / s.total_assets) * 100) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{s.session_name}</td>
                      <td className="p-4 text-neutral-500 max-w-xs truncate">{s.description || '-'}</td>
                      <td className="p-4 text-neutral-500 whitespace-nowrap">{new Date(s.started_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{s.status}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5 min-w-[150px]">
                          <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{s.checked_count} / {s.total_assets}</span>
                          <div className="w-16 flex-shrink-0"><ProgressBar progress={pct} colorClass={s.status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-600'} /></div>
                          <span className="text-[10px] font-bold text-neutral-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setSessionToDelete(s)} className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Hapus Sesi">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => openSession(s)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                            Buka
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]" />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto relative">
                <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                <h3 className="text-sm font-bold text-neutral-800 dark:text-white mb-4">Buat Sesi Stock Opname Baru</h3>

                {formErr && <div className="bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-semibold px-3 py-2 rounded-xl mb-3">{formErr}</div>}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nama Sesi *</label>
                    <input className={inputCls} placeholder="Contoh: Audit Q2 2026 — MRA Group" value={form.session_name} onChange={e => setForm({ ...form, session_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Deskripsi</label>
                    <textarea rows={2} className={inputCls} placeholder="Catatan tambahan tentang sesi ini..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Filter Perusahaan</label>
                      <select className={inputCls} value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}>
                        <option value="">— Semua Perusahaan —</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Filter Kategori</label>
                      <select className={inputCls} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                        <option value="">— Semua Kategori —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-3 py-2">
                    Sistem akan mengambil <strong>semua aset aktif</strong> sesuai filter ke dalam daftar pengecekan.
                  </p>
                </div>

                <div className="flex gap-3 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button type="button" onClick={() => setShowCreate(false)} disabled={saving} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50">
                    Batal
                  </button>
                  <button type="button" onClick={handleCreate} disabled={saving} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mulai Sesi'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} onClick={() => setSessionToDelete(null)} className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <motion.div className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-sm" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  <div className="relative w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center"><AlertTriangle className="w-6 h-6 animate-pulse" /></div>
                </div>
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Konfirmasi Hapus Sesi</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus sesi <strong className="text-red-500 dark:text-red-400 font-bold">"{sessionToDelete.session_name}"</strong>? Semua data pengecekan akan hilang.
                </p>
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button type="button" onClick={() => setSessionToDelete(null)} disabled={deleting} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50">
                    Batal
                  </button>
                  <button type="button" onClick={confirmDeleteSession} disabled={deleting} className="flex-1 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Ya, Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
