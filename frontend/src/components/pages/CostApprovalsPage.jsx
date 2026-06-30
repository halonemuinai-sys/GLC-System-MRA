'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  Clock,
  User,
  Building,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Edit3,
  RefreshCw,
  Loader2,
  Paperclip,
  Check,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

export default function CostApprovalsPage() {
  const [tasks, setTasks] = useState([]);
  const [historyList, setHistoryList] = useState([]); // Mocked or loaded from DB if endpoint available
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'history'

  // Processing Task Modal
  const [activeTask, setActiveTask] = useState(null);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [comment, setComment] = useState('');
  
  // Signature Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Load Pending Tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/marketing/tasks');
      setTasks(res || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat tugas approval.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load Approval History (riwayat keputusan APPROVED/REJECTED yang sebenarnya)
  const loadHistory = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/marketing/history');
      setHistoryList(res || []);
    } catch (err) {
      console.error('Failed to load approval history', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // KPI Summary dihitung dari tasks (pending) & historyList (sudah diputuskan)
  const kpis = useMemo(() => {
    let totalPendingValue = 0;
    let overbudgetCount = 0;

    tasks.forEach(t => {
      const isPlan = !!t.marketing_plan_id;
      totalPendingValue += isPlan ? Number(t.marketing_plan?.total_budget || 0) : Number(t.payment_request?.amount || 0);
      if (!isPlan && t.payment_request?.status === 'OVERBUDGET_WARN') overbudgetCount++;
    });

    const approvedCount = historyList.filter(h => h.action === 'APPROVED').length;
    const rejectedCount = historyList.filter(h => h.action === 'REJECTED').length;

    return {
      pendingCount: tasks.length,
      totalPendingValue,
      overbudgetCount,
      approvedCount,
      rejectedCount
    };
  }, [tasks, historyList]);

  // Signature Canvas Handlers
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Get mouse/touch position relative to canvas
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e3a8a'; // Dark Navy Blue
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Process Approve or Reject
  const handleDecision = async (action) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    // Rejection validation (comment is mandatory)
    if (action === 'REJECT' && !comment.trim()) {
      setError('Komentar / Alasan Penolakan wajib diisi untuk tindakan REJECT.');
      setSubmitting(false);
      return;
    }

    let signatureBase64 = null;

    try {
      const payload = {
        action,
        comment,
        signature: signatureBase64
      };

      const res = await apiClient.post(`/api/marketing/approvals/${activeTask.id}`, payload);
      setSuccessMsg(`Persetujuan berhasil diproses: ${res.message || 'Sukses'}`);
      setIsProcessOpen(false);
      setComment('');
      loadTasks();
      loadHistory();

      // Clear success alert after 5s
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message || 'Gagal memproses persetujuan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <BadgeCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Cost & Budget Approvals
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
              Otorisasi pencairan dana marketing, penandatanganan rencana anggaran, dan penanganan overbudget eskalasi.
            </p>
          </div>
        </div>

        <button
          onClick={() => { loadTasks(); loadHistory(); }}
          className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-indigo-500 shadow-sm transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Segarkan Tugas
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-amber-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Clock className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Tugas Pending</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5">{kpis.pendingCount}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-blue-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Nilai Total Pending</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.totalPendingValue)}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-red-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <TrendingDown className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Eskalasi Overbudget</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5">{kpis.overbudgetCount}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-emerald-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <CheckCircle className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Disetujui (Riwayat)</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5">{kpis.approvedCount} <span className="text-xs font-normal text-neutral-400">/ {kpis.rejectedCount} ditolak</span></h3>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </motion.div>
      )}

      {error && !isProcessOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" /> {error}
        </motion.div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Approvals ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-white'
          }`}
        >
          <Check className="w-4 h-4" />
          Riwayat Approval ({historyList.length})
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Memuat daftar antrian persetujuan...</span>
        </div>
      ) : activeTab === 'pending' ? (
        /* Pending list Table */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
          {tasks.length === 0 ? (
            <div className="py-20 text-center text-xs text-neutral-450 font-medium flex flex-col items-center justify-center gap-2">
              <CheckCircle className="w-10 h-10 text-emerald-500/80 mb-2" />
              <span>Hebat! Tidak ada tugas pending yang memerlukan persetujuan Anda saat ini.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-4">Modul Dokumen</th>
                    <th className="px-5 py-4">Detail Pengajuan</th>
                    <th className="px-5 py-4">PT / Entitas</th>
                    <th className="px-5 py-4 text-right">Nilai Pengajuan</th>
                    <th className="px-5 py-4 text-center">Status / Eskalasi</th>
                    <th className="px-5 py-4">Tgl Pengajuan</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                  {tasks.map(task => {
                    const isPlan = !!task.marketing_plan_id;
                    const title = isPlan ? task.marketing_plan?.title : task.payment_request?.title;
                    const creatorName = isPlan ? task.marketing_plan?.creator?.name : task.payment_request?.creator?.name;
                    const compName = isPlan ? task.marketing_plan?.company?.name : task.payment_request?.marketing_plan_item?.marketing_plan?.company?.name;
                    const amount = isPlan ? Number(task.marketing_plan?.total_budget) : Number(task.payment_request?.amount);
                    const isOverbudget = !isPlan && task.payment_request?.status === 'OVERBUDGET_WARN';

                    return (
                      <tr key={task.id} className={`border-l-[3px] ${isOverbudget ? 'border-l-transparent hover:border-l-red-400' : 'border-l-transparent hover:border-l-indigo-400'} hover:bg-neutral-50/30 dark:hover:bg-neutral-800/5 text-neutral-700 dark:text-neutral-300 transition-colors`}>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase inline-block ${
                            isPlan ? 'bg-blue-500/10 text-blue-600 border border-blue-200' : 'bg-violet-500/10 text-violet-600 border border-violet-200'
                          }`}>
                            {isPlan ? 'Marketing Plan' : 'Payment Request'}
                          </span>
                          <p className="text-[10px] text-neutral-400 mt-1 font-mono">Step {task.step_number} Approval</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-neutral-900 dark:text-white text-xs">{title}</span>
                          <p className="text-[10px] text-neutral-400 font-normal mt-0.5">PIC: {creatorName || 'N/A'}</p>
                        </td>
                        <td className="px-5 py-4 text-neutral-900 dark:text-neutral-200">{compName}</td>
                        <td className="px-5 py-4 text-right font-black text-neutral-850 dark:text-white">
                          {formatIDR(amount)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isOverbudget ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide inline-block bg-amber-500/15 text-amber-700 dark:text-amber-400 animate-pulse border border-amber-300">
                              OVERBUDGET WARN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide inline-block bg-neutral-100 text-neutral-500 dark:bg-neutral-850">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-neutral-400 font-mono">
                          {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => {
                              setActiveTask(task);
                              setIsProcessOpen(true);
                              // Auto delay a tiny bit to draw clear canvas
                              setTimeout(clearCanvas, 100);
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl hover:shadow-md hover:shadow-indigo-500/10 text-[11px] font-black transition-all cursor-pointer"
                          >
                            Proses
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* History List Table */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">Tipe Dokumen</th>
                  <th className="px-5 py-4">Detail Pengajuan</th>
                  <th className="px-5 py-4">PT / Entitas</th>
                  <th className="px-5 py-4 text-right">Nilai Pengajuan</th>
                  <th className="px-5 py-4 text-center">Tindakan Anda</th>
                  <th className="px-5 py-4">Komentar</th>
                  <th className="px-5 py-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-neutral-450 font-normal">
                      Belum ada riwayat keputusan approval.
                    </td>
                  </tr>
                ) : historyList.map(hist => (
                  <tr key={hist.id} className={`border-l-[3px] ${hist.action === 'REJECTED' ? 'border-l-transparent hover:border-l-red-400' : 'border-l-transparent hover:border-l-emerald-400'} hover:bg-neutral-50/30 dark:hover:bg-neutral-800/5 text-neutral-700 dark:text-neutral-300 transition-colors`}>
                    <td className="px-5 py-4">
                      <span className="font-bold text-neutral-850 dark:text-neutral-250">{hist.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-neutral-900 dark:text-white text-xs">{hist.title}</span>
                      <p className="text-[10px] text-neutral-450 font-normal mt-0.5">Pengaju: {hist.creatorName}</p>
                    </td>
                    <td className="px-5 py-4 text-neutral-900 dark:text-neutral-200">{hist.companyName}</td>
                    <td className="px-5 py-4 text-right font-bold text-neutral-850 dark:text-white">{formatIDR(hist.amount)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block border ${
                        hist.action === 'REJECTED'
                          ? 'bg-red-500/10 text-red-600 border-red-300'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-300'
                      }`}>
                        {hist.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-neutral-500 font-mono italic max-w-[200px] truncate" title={hist.comment}>
                      &ldquo;{hist.comment}&rdquo;
                    </td>
                    <td className="px-5 py-4 text-neutral-400 font-mono">
                      {new Date(hist.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROCESS TASK MODAL */}
      <AnimatePresence>
        {isProcessOpen && activeTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsProcessOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-4xl z-55 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                <div>
                  <h3 className="text-md font-black text-neutral-850 dark:text-white">Proses Otorisasi Dokumen</h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">
                    Modul: {activeTask.marketing_plan_id ? 'Marketing Plan' : 'Payment Request'} (Step {activeTask.step_number})
                  </p>
                </div>
                <button
                  onClick={() => setIsProcessOpen(false)}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Internal Error inside Modal */}
                {error && (
                  <div className="bg-red-500/10 border border-red-200 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                  </div>
                )}

                {/* Main details */}
                <div className="bg-neutral-50 dark:bg-neutral-950 p-4.5 rounded-2xl border border-neutral-250 dark:border-neutral-800/80 space-y-3">
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-wider">Detail Pengajuan Dokumen</h4>
                  
                  {activeTask.marketing_plan_id ? (
                    /* Detail Marketing Plan */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-bold text-neutral-700 dark:text-neutral-350">
                      <div>Judul: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.marketing_plan.title}</span></div>
                      <div>Tahun Fiscal: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.marketing_plan.fiscal_year}</span></div>
                      <div>PT: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.marketing_plan.company?.name || ''}</span></div>
                      <div>Diajukan Oleh: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.marketing_plan.creator?.name || ''}</span></div>
                      <div className="sm:col-span-2">Deskripsi: <span className="font-normal text-neutral-550 dark:text-neutral-400">{activeTask.marketing_plan.description || '-'}</span></div>
                      <div className="sm:col-span-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs">
                        <span>Total Anggaran Plan:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{formatIDR(activeTask.marketing_plan.total_budget)}</span>
                      </div>
                    </div>
                  ) : (
                    /* Detail Payment Request */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-bold text-neutral-700 dark:text-neutral-350">
                      <div>Judul Pembayaran: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.payment_request.title}</span></div>
                      <div>Campaign Induk: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.payment_request.marketing_plan_item?.marketing_plan?.title}</span></div>
                      <div>PT: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.payment_request.marketing_plan_item?.marketing_plan?.company?.name || ''}</span></div>
                      <div>Diajukan Oleh: <span className="font-normal text-neutral-900 dark:text-white">{activeTask.payment_request.creator?.name || ''}</span></div>
                      {activeTask.payment_request.doc_url && (
                        <div className="sm:col-span-2">
                          Dokumen Lampiran: 
                          <a
                            href={activeTask.payment_request.doc_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 text-indigo-500 font-bold hover:underline inline-flex items-center gap-1.5"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> Lihat Lampiran
                          </a>
                        </div>
                      )}
                      {activeTask.payment_request.notes && <div className="sm:col-span-2">Catatan: <span className="font-normal text-neutral-550 dark:text-neutral-400">{activeTask.payment_request.notes}</span></div>}
                      
                      <div className="sm:col-span-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs">
                        <span>Nominal Realisasi Biaya:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{formatIDR(activeTask.payment_request.amount)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Overbudget escalation warning */}
                {!activeTask.marketing_plan_id && activeTask.payment_request.status === 'OVERBUDGET_WARN' && (
                  <div className="bg-red-500/10 border border-red-300 text-red-700 dark:text-red-400 text-xs font-bold p-4.5 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                      <span>PERINGATAN OVERBUDGET (DILUAR ANGGARAN)</span>
                    </div>
                    <p className="font-normal text-[11px] leading-relaxed text-red-650 dark:text-red-350">
                      Realisasi biaya ini bernilai <strong className="font-bold">{formatIDR(activeTask.payment_request.amount)}</strong> sedangkan sisa anggaran bulanan untuk CoA ini hanya tinggal <strong className="font-bold">{formatIDR(Number(activeTask.payment_request.marketing_plan_item?.budget_amount) - Number(activeTask.payment_request.marketing_plan_item?.actual_amount))}</strong>. Menyetujui pengajuan ini akan melampaui alokasi budget dan membutuhkan persetujuan CFO/CEO.
                    </p>
                  </div>
                )}

                {/* LOB / CoA item breakdown for plans */}
                {activeTask.marketing_plan_id && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-neutral-450 uppercase">Rincian Anggaran Campaign</h5>
                    <div className="border border-neutral-200 dark:border-neutral-850 rounded-2xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-850 text-neutral-400 font-bold uppercase">
                            <th className="px-4 py-2">Bulan</th>
                            <th className="px-4 py-2">CoA Account</th>
                            <th className="px-4 py-2">Brand / LOB</th>
                            <th className="px-4 py-2 text-right">Budget (IDR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-150 dark:divide-neutral-850 text-neutral-700 dark:text-neutral-300 font-medium">
                          {activeTask.marketing_plan.items?.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">Bulan {item.period_month}</td>
                              <td className="px-4 py-2">{item.m_coa?.code} - {item.m_coa?.name}</td>
                              <td className="px-4 py-2">{item.m_brand?.name || '-'} / {item.m_line_business?.name || '-'}</td>
                              <td className="px-4 py-2 text-right font-bold">{formatIDR(item.budget_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Input Comment */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                    Komentar / Catatan Approval
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Masukkan alasan jika menolak (REJECT), atau catatan pendukung untuk persetujuan (APPROVE)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3.5 py-3 text-xs text-neutral-850 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-neutral-400 font-normal">Komentar wajib diisi jika Anda menolak pengajuan.</p>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="px-6 py-4.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-950/10">
                <button
                  onClick={() => setIsProcessOpen(false)}
                  className="px-4 py-2 border border-neutral-250 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-450 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision('REJECT')}
                    disabled={submitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    Tolak (Reject)
                  </button>

                  <button
                    onClick={() => handleDecision('APPROVE')}
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Setujui (Approve)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
