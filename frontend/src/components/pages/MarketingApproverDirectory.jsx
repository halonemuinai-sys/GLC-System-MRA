import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit3, Loader2, LockKeyhole, Power, Search, Trash2, X } from 'lucide-react';
import InlineHelp from '@/components/ui/InlineHelp';

export default function MarketingApproverDirectory({ signers, busyId, onEdit, onDelete, onToggle }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return signers.filter(signer =>
      (status === 'all' || Boolean(signer.is_active) === (status === 'active')) &&
      (!query || [signer.name, signer.email, signer.position].some(value => String(value || '').toLowerCase().includes(query)))
    );
  }, [signers, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const busy = busyId !== null;
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
      <div className="relative min-w-48 flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input aria-label="Cari approver" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Cari nama, email, atau jabatan..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
        {search && <button type="button" aria-label="Hapus pencarian" onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
      </div>
      <select aria-label="Filter status approver" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
      <span aria-live="polite" className="text-[11px] text-slate-400">{filtered.length} approver</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
          <tr><th className="w-[21%] px-4 py-2.5 font-semibold">Nama</th><th className="w-[25%] px-3 py-2.5 font-semibold">Email</th><th className="w-[19%] px-3 py-2.5 font-semibold">Jabatan</th><th className="w-[10%] px-3 py-2.5 font-semibold">Status</th><th className="w-[12%] px-3 py-2.5 font-semibold">Penggunaan</th><th className="w-[13%] px-3 py-2.5 text-right font-semibold">Aksi</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {!rows.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">{signers.length ? 'Tidak ada approver yang sesuai pencarian.' : 'Belum ada approver. Tambahkan nama dan email untuk memulai.'}</td></tr>}
          {rows.map(signer => {
            const canDelete = signer.can_delete === true;
            const reason = signer.delete_block_reason || 'Status penggunaan belum tersedia. Muat ulang direktori.';
            return <tr key={signer.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              <td title={signer.name} className="truncate px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{signer.name}</td>
              <td title={signer.email} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{signer.email}</td>
              <td title={signer.position || ''} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{signer.position || '—'}</td>
              <td className="px-3 py-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${signer.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}><span className="h-1 w-1 rounded-full bg-current" />{signer.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
              <td className="px-3 py-2 text-[10px] text-slate-400">{canDelete ? 'Belum dipakai' : <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400"><LockKeyhole className="h-3 w-3 shrink-0" /><InlineHelp summary={signer.has_transactions ? 'Transaksi' : signer.has_configuration ? 'Pengaturan' : 'Periksa'} label={`Penggunaan ${signer.name}`}>{reason}</InlineHelp></span>}</td>
              <td className="px-3 py-1.5"><div className="flex items-center justify-end gap-0.5">
                {busyId === signer.id && <Loader2 aria-label="Memproses approver" className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />}
                <button type="button" disabled={busy} title={`Ubah ${signer.name}`} onClick={() => onEdit(signer)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={busy} title={`${signer.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${signer.name}`} onClick={() => onToggle(signer)} className={`${actionClass} hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10`}><Power className="h-3.5 w-3.5" /></button>
                <span title={canDelete ? `Hapus ${signer.name}` : reason} tabIndex={canDelete ? undefined : 0} aria-label={canDelete ? undefined : reason} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><button type="button" aria-label={`Hapus ${signer.name}`} disabled={busy || !canDelete} onClick={() => onDelete(signer)} className={`${actionClass} enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button></span>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
      <label className="flex items-center gap-2">Baris per halaman<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <div className="flex items-center gap-3"><span>{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : '0'} dari {filtered.length}</span><div className="flex items-center gap-1"><button type="button" aria-label="Halaman sebelumnya" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button><span className="min-w-10 text-center tabular-nums">{currentPage} / {totalPages}</span><button type="button" aria-label="Halaman berikutnya" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button></div></div>
    </div>
  </div>;
}
