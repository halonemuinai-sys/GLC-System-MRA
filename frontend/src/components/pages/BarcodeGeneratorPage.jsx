'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  Printer, Download, QrCode, Barcode,
  Palette, Copy, Check, Plus, Trash2, Package, Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const FORMAT_OPTIONS = [
  { value: 'CODE128', label: 'Code 128', example: 'ABC-12345' },
  { value: 'CODE39', label: 'Code 39', example: 'ASSET-001' },
  { value: 'EAN13', label: 'EAN-13', example: '5901234123457' },
  { value: 'EAN8', label: 'EAN-8', example: '96385074' },
  { value: 'UPC', label: 'UPC-A', example: '012345678905' },
  { value: 'ITF14', label: 'ITF-14', example: '00012345678905' }
];

const PRESETS = [
  { bg: '#ffffff', line: '#000000', label: 'Hitam & Putih', id: 'bw' },
  { bg: '#0f172a', line: '#60a5fa', label: 'Dark Blue', id: 'dark-blue' },
  { bg: '#f0fdf4', line: '#15803d', label: 'Hijau', id: 'green' },
  { bg: '#fff7ed', line: '#c2410c', label: 'Oranye', id: 'orange' },
  { bg: '#fdf4ff', line: '#7e22ce', label: 'Ungu', id: 'purple' }
];

const defaultConfig = {
  format: 'CODE128',
  type: 'barcode',
  width: 2,
  height: 80,
  fontSize: 14,
  textMargin: 4,
  margin: 12,
  background: '#ffffff',
  lineColor: '#000000',
  showText: true,
  qrErrorLevel: 'M',
  qrSize: 200
};

function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function BarcodePreview({ item, config }) {
  const svgRef = useRef(null);
  const canvRef = useRef(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    if (item.type === 'barcode') {
      if (!svgRef.current) return;
      try {
        JsBarcode(svgRef.current, item.text || ' ', {
          format: item.format,
          width: config.width,
          height: config.height,
          fontSize: config.fontSize,
          textMargin: config.textMargin,
          margin: config.margin,
          background: config.background,
          lineColor: config.lineColor,
          displayValue: config.showText,
          text: config.showText ? (item.label || item.text) : undefined,
          valid: (v) => { if (!v) setErr('Teks tidak valid untuk format ini'); }
        });
      } catch (e) {
        setErr(e.message || 'Error');
      }
    } else {
      if (!canvRef.current) return;
      QRCode.toCanvas(canvRef.current, item.text || ' ', {
        width: config.qrSize,
        margin: 2,
        errorCorrectionLevel: config.qrErrorLevel,
        color: { dark: config.lineColor, light: config.background }
      }).catch((e) => setErr(e.message));
    }
  }, [item, config]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[180px]">
      {item.type === 'barcode' ? <svg ref={svgRef} /> : <canvas ref={canvRef} />}
      {err && <span className="text-[11px] text-red-500 font-semibold mt-2">{err}</span>}
    </div>
  );
}

function PrintCard({ item, config }) {
  const svgRef = useRef(null);
  const canvRef = useRef(null);
  const cardRef = useRef(null);
  const lblRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) cardRef.current.style.background = config.background;
    if (lblRef.current) lblRef.current.style.color = config.lineColor;

    if (item.type === 'barcode' && svgRef.current) {
      try {
        JsBarcode(svgRef.current, item.text || ' ', {
          format: item.format, width: config.width, height: config.height,
          fontSize: config.fontSize, textMargin: config.textMargin, margin: config.margin,
          background: config.background, lineColor: config.lineColor,
          displayValue: config.showText,
          text: config.showText ? (item.label || item.text) : undefined
        });
      } catch {}
    } else if (item.type === 'qr' && canvRef.current) {
      QRCode.toCanvas(canvRef.current, item.text || ' ', {
        width: config.qrSize, margin: 2,
        errorCorrectionLevel: config.qrErrorLevel,
        color: { dark: config.lineColor, light: config.background }
      }).catch(() => {});
    }
  }, [item, config]);

  return (
    <div ref={cardRef} className="barcode-print-card inline-flex flex-col items-center gap-1.5 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl" style={{ pageBreakInside: 'avoid' }}>
      {item.type === 'barcode' ? <svg ref={svgRef} /> : <canvas ref={canvRef} />}
      {item.label && <span ref={lblRef} className="barcode-print-label text-[10px] font-bold text-center max-w-[180px]">{item.label}</span>}
    </div>
  );
}

export default function BarcodeGeneratorPage() {
  const [config, setConfig] = useState({ ...defaultConfig });
  const [items, setItems] = useState([
    { id: uid(), text: 'MRA-ASSET-001', label: 'MRA-ASSET-001', format: 'CODE128', type: 'barcode' }
  ]);
  const [activeId, setActiveId] = useState(items[0].id);
  const [tab, setTab] = useState('design');
  const [bulkText, setBulkText] = useState('');
  const [copied, setCopied] = useState('');
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetCompanyId, setAssetCompanyId] = useState('');
  const [assetCategoryId, setAssetCategoryId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);

  const cfg = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const activeItem = items.find(i => i.id === activeId) || items[0];

  useEffect(() => {
    apiClient.get('/api/ga/assets', { params: { limit: 500 } })
      .then(res => setAssets(res.data || []))
      .catch(() => {})
      .finally(() => setAssetsLoading(false));
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => {});
    apiClient.get('/api/ga/assets-categories').then(setCategories).catch(() => {});
  }, []);

  const addItem = () => {
    const id = uid();
    setItems(p => [...p, { id, text: `ITEM-${id}`, label: `ITEM-${id}`, format: config.format, type: config.type }]);
    setActiveId(id);
  };

  const removeItem = (id) => {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    if (activeId === id) setActiveId(next[0]?.id || '');
  };

  const updateItem = (id, patch) => setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));

  const importBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const newItems = lines.map(l => {
      const [text, label] = l.split('\t');
      const id = uid();
      return { id, text: text.trim(), label: (label || text).trim(), format: config.format, type: config.type };
    });
    setItems(p => [...p, ...newItems]);
    setActiveId(newItems[0].id);
    setBulkText('');
  };

  const addFromAsset = (a) => {
    const id = uid();
    setItems(p => [...p, { id, text: a.asset_code, label: `${a.asset_code} – ${a.asset_name}`, format: 'CODE128', type: 'barcode' }]);
    setActiveId(id);
  };

  const downloadSingle = useCallback(() => {
    const svg = document.querySelector('.preview-area svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeItem.text}.svg`; a.click();
    URL.revokeObjectURL(url);
  }, [activeItem]);

  const printAll = () => {
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    const cards = document.querySelectorAll('.barcode-print-card');
    w.document.write(`
      <html><head><title>Barcode Print</title>
      <style>
        body { font-family: sans-serif; padding: 16px; }
        .wrap { display: flex; flex-wrap: wrap; gap: 16px; }
        .barcode-print-card { display: inline-flex; flex-direction: column; align-items: center; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; gap: 6px; page-break-inside: avoid; }
        .barcode-print-label { font-size: 10px; font-weight: 700; text-align: center; max-width: 180px; }
        @media print { @page { margin: 10mm; } }
      </style></head>
      <body><div class="wrap">
        ${Array.from(cards).map(c => c.outerHTML).join('')}
      </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 1500);
  };

  const filteredAssets = assets.filter(a => {
    const matchSearch = !assetSearch || a.asset_code?.toLowerCase().includes(assetSearch.toLowerCase()) || a.asset_name?.toLowerCase().includes(assetSearch.toLowerCase());
    const matchCompany = !assetCompanyId || String(a.company_id) === String(assetCompanyId);
    const matchCategory = !assetCategoryId || String(a.asset_category_id) === String(assetCategoryId);
    return matchSearch && matchCompany && matchCategory;
  });

  const inputCls = 'w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500';

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Barcode className="w-6 h-6 text-indigo-500" />
          Barcode Generator
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Generate &amp; cetak barcode / QR Code untuk aset, dokumen, dan label kustom.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1">
            {['design', 'bulk', 'assets'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${tab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'}`}
              >
                {t === 'design' ? 'Desain' : t === 'bulk' ? 'Bulk' : 'Aset'}
              </button>
            ))}
          </div>

          {/* DESIGN TAB */}
          {tab === 'design' && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Tipe Output</p>
                <div className="grid grid-cols-2 gap-2">
                  {['barcode', 'qr'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { cfg('type', t); updateItem(activeId, { type: t }); }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl border-2 transition-all font-bold text-xs cursor-pointer ${config.type === t ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-500'}`}
                    >
                      {t === 'barcode' ? <Barcode className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                      {t === 'barcode' ? 'Barcode' : 'QR Code'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Konten</p>
                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Teks / Kode</label>
                  <input className={inputCls} value={activeItem.text} placeholder="Masukkan kode atau teks..."
                    onChange={e => updateItem(activeId, { text: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Label (teks di bawah)</label>
                  <input className={inputCls} value={activeItem.label} placeholder="Label opsional..."
                    onChange={e => updateItem(activeId, { label: e.target.value })} />
                </div>
              </div>

              {config.type === 'barcode' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Format Barcode</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FORMAT_OPTIONS.map(f => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => { cfg('format', f.value); updateItem(activeId, { format: f.value }); }}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${activeItem.format === f.value ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-500'}`}
                      >
                        <span className="block text-[11px] font-bold">{f.label}</span>
                        <span className="block text-[9px] opacity-60 font-medium mt-0.5">{f.example}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {config.type === 'barcode' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Ukuran</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-neutral-400">Lebar</span><span className="text-[10px] font-bold text-indigo-500">{config.width}px</span></div>
                      <input type="range" min={1} max={5} step={0.5} value={config.width} title="Lebar Garis" onChange={e => cfg('width', parseFloat(e.target.value))} className="w-full accent-indigo-600 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-neutral-400">Tinggi</span><span className="text-[10px] font-bold text-indigo-500">{config.height}px</span></div>
                      <input type="range" min={40} max={160} step={5} value={config.height} title="Tinggi Barcode" onChange={e => cfg('height', parseInt(e.target.value))} className="w-full accent-indigo-600 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-neutral-400">Font</span><span className="text-[10px] font-bold text-indigo-500">{config.fontSize}px</span></div>
                      <input type="range" min={8} max={24} step={1} value={config.fontSize} title="Ukuran Font" onChange={e => cfg('fontSize', parseInt(e.target.value))} className="w-full accent-indigo-600 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-neutral-400">Margin</span><span className="text-[10px] font-bold text-indigo-500">{config.margin}px</span></div>
                      <input type="range" min={0} max={40} step={2} value={config.margin} title="Margin" onChange={e => cfg('margin', parseInt(e.target.value))} className="w-full accent-indigo-600 mt-1" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                    <input type="checkbox" checked={config.showText} onChange={e => cfg('showText', e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600 rounded" />
                    <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Tampilkan teks label</span>
                  </label>
                </div>
              )}

              {config.type === 'qr' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">QR Settings</p>
                  <div>
                    <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-neutral-400">Ukuran</span><span className="text-[10px] font-bold text-indigo-500">{config.qrSize}px</span></div>
                    <input type="range" min={100} max={400} step={20} value={config.qrSize} title="Ukuran QR Code" onChange={e => cfg('qrSize', parseInt(e.target.value))} className="w-full accent-indigo-600 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Error Correction</label>
                    <select className={inputCls} value={config.qrErrorLevel} onChange={e => cfg('qrErrorLevel', e.target.value)} title="QR Error Correction Level">
                      <option value="L">L — Low (7%)</option>
                      <option value="M">M — Medium (15%)</option>
                      <option value="Q">Q — Quartile (25%)</option>
                      <option value="H">H — High (30%)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5"><Palette className="w-3 h-3" /> Warna</p>
                <div className="flex gap-1.5">
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => { cfg('background', p.bg); cfg('lineColor', p.line); }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 cursor-pointer ${config.background === p.bg && config.lineColor === p.line ? 'border-indigo-500' : 'border-neutral-200 dark:border-neutral-800'}`}
                      style={{ background: p.bg }}
                    >
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.line }} />
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">BG</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.background} onChange={e => cfg('background', e.target.value)} title="BG Picker" className="w-8 h-8 rounded-lg border-0 cursor-pointer overflow-hidden" />
                      <input className={`${inputCls} font-mono !text-[10px] !py-1`} value={config.background} onChange={e => cfg('background', e.target.value)} title="BG Hex" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Line</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.lineColor} onChange={e => cfg('lineColor', e.target.value)} title="Line Picker" className="w-8 h-8 rounded-lg border-0 cursor-pointer overflow-hidden" />
                      <input className={`${inputCls} font-mono !text-[10px] !py-1`} value={config.lineColor} onChange={e => cfg('lineColor', e.target.value)} title="Line Hex" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BULK TAB */}
          {tab === 'bulk' && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Import Massal</p>
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed font-semibold">
                  Satu baris = satu barcode.<br />
                  Format: <code className="bg-white/60 dark:bg-black/20 px-1 rounded">KODE[Tab]LABEL</code>
                </p>
              </div>
              <textarea
                rows={8}
                className={`${inputCls} font-mono resize-none`}
                placeholder={'MRA-001\tAsset Laptop\nMRA-002\tAsset Monitor\nMRA-003'}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <button type="button" onClick={importBulk} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Import {bulkText.split('\n').filter(Boolean).length} Item
              </button>
            </div>
          )}

          {/* ASSETS TAB */}
          {tab === 'assets' && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Dari Data Aset</p>
              <input className={inputCls} placeholder="Cari kode / nama aset..." value={assetSearch} onChange={e => setAssetSearch(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <select className={`${inputCls} !py-1.5`} value={assetCompanyId} onChange={e => setAssetCompanyId(e.target.value)} title="Filter Perusahaan">
                  <option value="">-- Perusahaan --</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className={`${inputCls} !py-1.5`} value={assetCategoryId} onChange={e => setAssetCategoryId(e.target.value)} title="Filter Kategori">
                  <option value="">-- Kategori --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                {assetsLoading ? (
                  <div className="py-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : filteredAssets.length === 0 ? (
                  <div className="py-10 text-center text-[11px] text-neutral-400">Tidak ada aset ditemukan.</div>
                ) : (
                  filteredAssets.slice(0, 50).map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => addFromAsset(a)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:border-indigo-400 transition-all cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0"><Package className="w-3.5 h-3.5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-neutral-800 dark:text-white truncate">{a.asset_code}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{a.asset_name}</p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Tambah Item
              </button>
              <button type="button" onClick={printAll} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20">
                <Printer className="w-3.5 h-3.5" /> Print ({items.length})
              </button>
              <button type="button" onClick={downloadSingle} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer">
                <Download className="w-3.5 h-3.5" /> SVG
              </button>
            </div>
            <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              {items.length} Item
            </div>
          </div>

          {/* Item list tabs */}
          {items.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {items.map((item, i) => (
                <div key={item.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`px-3 py-1.5 rounded-l-lg border text-[10px] font-bold transition-all cursor-pointer ${activeId === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                  >
                    {item.text.slice(0, 10)}{item.text.length > 10 ? '…' : ''} #{i + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title="Hapus"
                    className={`px-1.5 py-1.5 rounded-r-lg border border-l-0 transition-all cursor-pointer ${activeId === item.id ? 'bg-indigo-600 border-indigo-600 text-white/70 hover:text-white' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preview area */}
          <div className="preview-area bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center">
            <BarcodePreview item={activeItem} config={config} />
            <button type="button" onClick={() => copyText(activeItem.text)} className="flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer">
              {copied === activeItem.text ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied === activeItem.text ? 'Disalin!' : 'Salin Teks'}
            </button>
          </div>

          {/* Print preview grid */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Preview Print — {items.length} item</p>
              <button type="button" onClick={printAll} className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                <Printer className="w-3 h-3" /> Print
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {items.map(item => <PrintCard key={item.id} item={item} config={config} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
