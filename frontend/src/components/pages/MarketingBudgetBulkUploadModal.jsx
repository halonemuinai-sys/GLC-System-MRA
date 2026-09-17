'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Trash2,
  Filter,
  Sparkles
} from 'lucide-react';
import ExcelJS from 'exceljs';

// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

// Helper: Format number with thousands separator
const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Month dictionary for flexible parsing
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Smart Cell Value Extractor (handles formula result, rich text, hyperlinks, dates)
export function extractCellValue(cell) {
  if (!cell) return null;
  const val = cell.value;
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if ('result' in val) return val.result;
    if (Array.isArray(val.richText)) return val.richText.map(r => r.text || '').join('');
    if ('text' in val) return val.text;
    if (val instanceof Date) return val;
  }
  return val;
}

// Smart Month Parser: handles 1-12, Indonesian/English names, abbreviations, dates, and "Bulan X"
export const parseMonth = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return val.getMonth() + 1;
  if (typeof val === 'number') {
    const intVal = Math.round(val);
    if (intVal >= 1 && intVal <= 12) return intVal;
    if (intVal > 1000) {
      // Excel serial date number
      const dt = new Date(Math.round((intVal - 25569) * 86400 * 1000));
      return dt.getMonth() + 1;
    }
  }
  const str = String(val).trim().toLowerCase();

  // Pattern like "Bulan 1", "Bln 02", "Month 3", "M04"
  const mMatch = str.match(/(?:bulan|bln|month|m)\s*(\d{1,2})/i);
  if (mMatch) {
    const n = parseInt(mMatch[1], 10);
    if (n >= 1 && n <= 12) return n;
  }

  // Pure integer string: "1" to "12" or "01" to "12"
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12 && String(num) === str.replace(/^0+/, '')) {
    return num;
  }

  // Indonesian and English month names & common abbreviations
  const monthMap = {
    jan: 1, januari: 1, january: 1,
    feb: 2, februari: 2, february: 2,
    mar: 3, maret: 3, march: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    agu: 8, ags: 8, agustus: 8, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oktober: 10, oct: 10, october: 10,
    nov: 11, november: 11,
    des: 12, desember: 12, dec: 12, december: 12
  };

  for (const [k, v] of Object.entries(monthMap)) {
    if (str === k || str.startsWith(k)) return v;
  }

  // Try parsing ISO/locale date string
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.getMonth() + 1;
  }

  return null;
};

// ─── Vendor Fuzzy Matching Helpers ──────────────────────────────────────────
export function normalizeVendorString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/\b(pt|cv|ud|tbk|ltd|inc|corp|co|fa|yayasan|koperasi)\b/gi, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function stringSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

function tokenSimilarity(s1, s2) {
  const tokens1 = new Set(s1.split(' ').filter(w => w.length > 1));
  const tokens2 = new Set(s2.split(' ').filter(w => w.length > 1));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = intersection / union;

  // Bonus for token containment (e.g. user typed "Kreasi Nusantara", vendor is "PT Media Kreasi Nusantara")
  let containment = 0;
  if (intersection === tokens1.size && tokens1.size >= 2) {
    containment = 0.85;
  } else if (intersection === tokens2.size && tokens2.size >= 2) {
    containment = 0.85;
  }

  return Math.max(jaccard, containment);
}

export function findBestVendorMatch(rawVendor, vendorsList = []) {
  if (!rawVendor || !vendorsList || vendorsList.length === 0) return null;
  const rawClean = String(rawVendor).trim();
  const rawLower = rawClean.toLowerCase();
  const normRaw = normalizeVendorString(rawClean);

  // 1. Direct exact match on vendor_name or vendor_code
  for (const v of vendorsList) {
    const vName = String(v.vendor_name || '').trim();
    const vCode = String(v.vendor_code || '').trim();
    if (vName.toLowerCase() === rawLower || (vCode && vCode.toLowerCase() === rawLower)) {
      return { vendor: v, score: 1.0, matchType: 'exact' };
    }
  }

  // 2. Exact match after normalization (ignoring PT/CV, punctuation, extra spaces)
  if (normRaw.length >= 2) {
    for (const v of vendorsList) {
      const normV = normalizeVendorString(v.vendor_name);
      if (normV === normRaw) {
        return { vendor: v, score: 0.98, matchType: 'normalized_exact' };
      }
    }
  }

  // 3. Fuzzy search among all vendors
  let bestVendor = null;
  let highestScore = 0;

  for (const v of vendorsList) {
    const vName = String(v.vendor_name || '').trim();
    const vLower = vName.toLowerCase();
    const normV = normalizeVendorString(vName);

    // Substring match on normalized string
    let subScore = 0;
    if (normRaw.length >= 4 && normV.length >= 4) {
      if (normV.includes(normRaw) || normRaw.includes(normV)) {
        const ratio = Math.min(normRaw.length, normV.length) / Math.max(normRaw.length, normV.length);
        subScore = 0.70 + (0.25 * ratio);
      }
    }

    // Levenshtein similarity on normalized string
    const levScoreNorm = normRaw && normV ? stringSimilarity(normRaw, normV) : 0;
    
    // Levenshtein similarity on full lower string
    const levScoreFull = stringSimilarity(rawLower, vLower);

    // Token similarity
    const tokScore = tokenSimilarity(normRaw, normV);

    // Composite score
    const compositeScore = Math.max(
      subScore,
      tokScore,
      levScoreNorm,
      levScoreFull,
      (levScoreNorm * 0.5) + (tokScore * 0.5)
    );

    if (compositeScore > highestScore) {
      highestScore = compositeScore;
      bestVendor = v;
    }
  }

  // Threshold: >= 0.65 to be accepted as a match
  if (bestVendor && highestScore >= 0.65) {
    return {
      vendor: bestVendor,
      score: highestScore,
      matchType: highestScore >= 0.9 ? 'high_confidence' : 'fuzzy'
    };
  }

  return null;
}

// ─── CoA Intelligent & Fuzzy Matching Helper ────────────────────────────────
export function findBestCoaMatch(rawCoa, coasList = []) {
  if (!rawCoa || !coasList || coasList.length === 0) return null;
  const rawStr = String(rawCoa).trim();
  const rawLower = rawStr.toLowerCase();
  const cleanAlnum = rawLower.replace(/[^a-z0-9]/gi, '');

  // 1. Direct exact match on code (e.g. "61101")
  for (const c of coasList) {
    if (c.code && String(c.code).trim().toLowerCase() === rawLower) {
      return { coa: c, score: 1.0, matchType: 'exact_code' };
    }
  }

  // 2. Alphanumeric match on code (e.g. "611-01" vs "61101" or float 61101.0)
  if (cleanAlnum) {
    for (const c of coasList) {
      if (c.code) {
        const cClean = String(c.code).replace(/[^a-z0-9]/gi, '').toLowerCase();
        if (cClean && cClean === cleanAlnum) {
          return { coa: c, score: 0.98, matchType: 'normalized_code' };
        }
      }
    }
  }

  // 3. String contains code prefix/suffix (e.g. "61101 - Advertising" or "[61101] Advertising")
  for (const c of coasList) {
    if (c.code && String(c.code).length >= 3) {
      const cCode = String(c.code).trim().toLowerCase();
      if (rawLower.startsWith(cCode) || rawLower.includes(`[${cCode}]`) || rawLower.includes(`(${cCode})`)) {
        return { coa: c, score: 0.95, matchType: 'code_contained' };
      }
    }
  }

  // 4. Exact match on CoA Name
  for (const c of coasList) {
    if (c.name && c.name.trim().toLowerCase() === rawLower) {
      return { coa: c, score: 0.95, matchType: 'exact_name' };
    }
  }

  // 5. Fuzzy match on CoA Name
  let bestCoa = null;
  let highestScore = 0;

  for (const c of coasList) {
    const cName = String(c.name || '').trim().toLowerCase();
    const tokScore = tokenSimilarity(rawLower, cName);
    const levScore = stringSimilarity(rawLower, cName);

    let containScore = 0;
    if (rawLower.length >= 4 && cName.length >= 4) {
      if (cName.includes(rawLower) || rawLower.includes(cName)) {
        containScore = 0.85;
      }
    }

    const composite = Math.max(tokScore, levScore, containScore);
    if (composite > highestScore) {
      highestScore = composite;
      bestCoa = c;
    }
  }

  if (bestCoa && highestScore >= 0.65) {
    return {
      coa: bestCoa,
      score: highestScore,
      matchType: 'fuzzy_name'
    };
  }

  return null;
}

// ─── Export Function: Generate Styled Excel Template ──────────────────────────
export async function downloadMarketingBudgetTemplate({
  metadata,
  currentItems = [],
  includeCurrentData = false,
  campaignTitle = '',
  fiscalYear = new Date().getFullYear()
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GLC MRA System';
  workbook.created = new Date();

  // 1. Sheet Utama: Alokasi_Anggaran
  const sheet = workbook.addWorksheet('Alokasi_Anggaran', {
    views: [{ showGridLines: true }]
  });

  // Title Row
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `TEMPLATE BULK UPLOAD ALOKASI ANGGARAN MARKETING (${campaignTitle || 'TAHUN ' + fiscalYear})`;
  titleCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Blue-800
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  // Subtitle / Guideline
  sheet.mergeCells('A2:G2');
  const noteCell = sheet.getCell('A2');
  noteCell.value = 'Petunjuk: Kolom bertanda (*) wajib diisi. Isi kolom "Kode Akun CoA *" dengan KODE Akun dari tab "Referensi_CoA" (contoh: 61101). Vendor partner mendukung fuzzy matching otomatis.';
  noteCell.font = { italic: true, size: 9, color: { argb: 'FF1E293B' } };
  noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Blue-100
  noteCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(2).height = 20;

  // Blank row
  sheet.getRow(3).height = 8;

  // Header row
  const headers = [
    { key: 'no', header: 'No', width: 6 },
    { key: 'period_month', header: 'Bulan (1-12 atau Nama Bulan) *', width: 28 },
    { key: 'coa_account', header: 'Kode Akun CoA *', width: 22 },
    { key: 'vendor_name', header: 'Vendor Partner', width: 32 },
    { key: 'qty', header: 'Qty *', width: 10 },
    { key: 'unit_price', header: 'Harga Satuan (IDR) *', width: 22 },
    { key: 'description', header: 'Catatan Biaya (Cost Notes)', width: 38 }
  ];

  const headerRow = sheet.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.header;
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue-600
    cell.alignment = { vertical: 'middle', horizontal: i === 0 || i === 2 || i === 4 ? 'center' : i === 5 ? 'right' : 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
    sheet.getColumn(i + 1).width = h.width;
  });
  headerRow.height = 24;

  // Data rows
  if (includeCurrentData && currentItems.length > 0) {
    currentItems.forEach((it, idx) => {
      const coaObj = metadata.coas?.find(c => String(c.id) === String(it.coa_id));
      const vendorObj = metadata.vendors?.find(v => String(v.id) === String(it.vendor_id));
      const mNum = parseInt(it.period_month, 10);
      const monthLabel = mNum >= 1 && mNum <= 12 ? MONTH_NAMES[mNum - 1] : it.period_month || 1;

      const row = sheet.addRow([
        idx + 1,
        monthLabel,
        coaObj ? (coaObj.code || coaObj.name) : '',
        vendorObj ? vendorObj.vendor_name : (it.vendor_id || ''),
        parseInt(it.qty || '1', 10),
        parseFloat(it.unit_price || '0'),
        it.description || ''
      ]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(3).numFmt = '@';
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(6).numFmt = '#,##0';
    });
  } else {
    // Sample rows with CoA codes
    const sampleRows = [
      [1, 'Januari', metadata.coas?.[0]?.code || '61101', 'PT Media Kreasi Nusantara', 1, 15000000, 'Billboard & OOH Placement Senayan'],
      [2, 'Januari', metadata.coas?.[1]?.code || '61102', 'Studio Visual Prima', 1, 4500000, 'Dokumentasi foto & video event'],
      [3, 'Februari', metadata.coas?.[2]?.code || '61103', 'Vendor Dekorasi Indonesia', 1, 12000000, 'Setup booth display & sound system'],
      [4, 'Maret', metadata.coas?.[3]?.code || '61104', '', 10, 500000, 'Voucher promosi loyalty customer']
    ];

    sampleRows.forEach(sr => {
      const row = sheet.addRow(sr);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(3).numFmt = '@';
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(6).numFmt = '#,##0';
    });
  }

  // 2. Sheet Referensi CoA
  const coaSheet = workbook.addWorksheet('Referensi_CoA');
  coaSheet.addRow(['Daftar Kode Akun CoA Resmi']).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
  coaSheet.addRow(['PENTING: Gunakan KODE Akun dari kolom A di bawah ini untuk dimasukkan ke kolom "Kode Akun CoA *" pada lembar Alokasi_Anggaran.']).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  coaSheet.addRow([]);

  const coaHeaderRow = coaSheet.addRow(['Kode Akun (Isi Ini)', 'Nama Akun CoA (Keterangan)']);
  coaHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  coaHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  coaSheet.getColumn(1).width = 24;
  coaSheet.getColumn(2).width = 44;

  if (metadata.coas && metadata.coas.length > 0) {
    metadata.coas.forEach(c => {
      const row = coaSheet.addRow([String(c.code || '-'), c.name]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(1).numFmt = '@';
    });
  }

  // 3. Sheet Referensi Vendor
  if (metadata.vendors && metadata.vendors.length > 0) {
    const vendorSheet = workbook.addWorksheet('Referensi_Vendor');
    vendorSheet.addRow(['Daftar Vendor Partner Rekanan']).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
    vendorSheet.addRow(['Catatan: Sistem mendukung Fuzzy Matching (pencocokan cerdas toleran salah ketik atau variasi penulisan PT/CV).']).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
    vendorSheet.addRow([]);

    const vHeader = vendorSheet.addRow(['Kode Vendor', 'Nama Vendor Rekanan']);
    vHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    vHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    vendorSheet.getColumn(1).width = 18;
    vendorSheet.getColumn(2).width = 42;

    metadata.vendors.forEach(v => {
      vendorSheet.addRow([v.vendor_code || '-', v.vendor_name]);
    });
  }

  // Download Trigger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Template_Alokasi_Anggaran_${(campaignTitle || 'Marketing').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Main Modal Component ───────────────────────────────────────────────────
export default function MarketingBudgetBulkUploadModal({
  isOpen,
  onClose,
  metadata = { coas: [], vendors: [] },
  onApply,
  currentItems = [],
  campaignTitle = '',
  fiscalYear = new Date().getFullYear(),
  t,
  lang = 'id'
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'append'
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'valid' | 'error'
  const fileInputRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedRows([]);
      setParseError(null);
      setParsing(false);
      setImportMode('replace');
      setFilterTab('all');
    }
  }, [isOpen]);

  // Inline Fix: Update CoA for a row
  const handleFixRowCoa = (rowNumber, newCoaId) => {
    const selectedCoa = metadata.coas?.find(c => String(c.id) === String(newCoaId));
    if (!selectedCoa) return;
    setParsedRows(prev => prev.map(row => {
      if (row.rowNumber !== rowNumber) return row;
      const newErrors = row.errors.filter(e => !e.toLowerCase().includes('coa'));
      return {
        ...row,
        coa_id: String(selectedCoa.id),
        coa_name: selectedCoa.name,
        coa_code: selectedCoa.code || '',
        errors: newErrors,
        isValid: newErrors.length === 0
      };
    }));
  };

  // Inline Fix: Update Month for a row
  const handleFixRowMonth = (rowNumber, newMonthNum) => {
    const mNum = parseInt(newMonthNum, 10);
    if (!(mNum >= 1 && mNum <= 12)) return;
    setParsedRows(prev => prev.map(row => {
      if (row.rowNumber !== rowNumber) return row;
      const newErrors = row.errors.filter(e => !e.toLowerCase().includes('bulan') && !e.toLowerCase().includes('month'));
      return {
        ...row,
        period_month: String(mNum),
        monthDisplay: MONTH_NAMES[mNum - 1],
        errors: newErrors,
        isValid: newErrors.length === 0
      };
    }));
  };

  // Inline Fix: Delete row
  const handleDeleteRow = (rowNumber) => {
    setParsedRows(prev => prev.filter(r => r.rowNumber !== rowNumber));
  };

  // Handle drag and drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Process and parse Excel file
  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    setParseError(null);
    setParsedRows([]);
    setFilterTab('all');

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await selectedFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      // Select worksheet: match by name or fallback to first sheet
      let sheet = workbook.getWorksheet('Alokasi_Anggaran');
      if (!sheet) {
        sheet = workbook.worksheets.find(ws => {
          const wsName = ws.name.toLowerCase();
          return wsName.includes('alokasi') || wsName.includes('anggaran') || wsName.includes('budget');
        }) || workbook.getWorksheet(1);
      }

      if (!sheet) {
        throw new Error('Lembar kerja (worksheet) tidak ditemukan di dalam file Excel.');
      }

      // Detect header row (search rows 1 to 15)
      let headerRowNumber = 4;
      let colMap = {
        month: 2,
        coa: 3,
        vendor: 4,
        qty: 5,
        price: 6,
        desc: 7
      };

      for (let r = 1; r <= 15; r++) {
        const row = sheet.getRow(r);
        const values = row.values || [];
        const joined = values.map(v => String(extractCellValue({ value: v }) || '').toLowerCase()).join(' ');

        if (joined.includes('bulan') || joined.includes('month') || joined.includes('coa') || joined.includes('akun') || joined.includes('kode')) {
          headerRowNumber = r;
          // Dynamically map column indexes
          row.eachCell((cell, colNumber) => {
            const val = String(extractCellValue(cell) || '').toLowerCase().trim();
            if (val.includes('bulan') || val.includes('month') || val.includes('period')) colMap.month = colNumber;
            else if (val.includes('kode') || val.includes('coa') || val.includes('akun') || val.includes('account')) colMap.coa = colNumber;
            else if (val.includes('vendor') || val.includes('partner') || val.includes('rekanan')) colMap.vendor = colNumber;
            else if (val.includes('qty') || val.includes('kuantitas') || val.includes('jumlah')) colMap.qty = colNumber;
            else if (val.includes('harga') || val.includes('price') || val.includes('satuan')) colMap.price = colNumber;
            else if (val.includes('catatan') || val.includes('notes') || val.includes('keterangan') || val.includes('deskripsi')) colMap.desc = colNumber;
          });
          break;
        }
      }

      // Parse data rows
      const items = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber) return; // Skip headers

        const rawMonth = extractCellValue(row.getCell(colMap.month));
        const rawCoa = extractCellValue(row.getCell(colMap.coa));
        const rawVendor = extractCellValue(row.getCell(colMap.vendor));
        const rawQty = extractCellValue(row.getCell(colMap.qty));
        const rawPrice = extractCellValue(row.getCell(colMap.price));
        const rawDesc = extractCellValue(row.getCell(colMap.desc));

        // Skip completely empty row
        const hasContent = [rawMonth, rawCoa, rawVendor, rawQty, rawPrice, rawDesc].some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!hasContent) return;

        // Skip summary / total row
        const rowTexts = [rawMonth, rawCoa, rawVendor, rawDesc].map(v => String(v || '').toLowerCase()).join(' ');
        if (rowTexts.includes('total') || rowTexts.includes('jumlah') || rowTexts.includes('subtotal') || rowTexts.includes('grand total')) {
          return;
        }

        const errors = [];
        const warnings = [];

        // 1. Month validation
        const monthNum = parseMonth(rawMonth);
        if (!monthNum) {
          errors.push(`Bulan "${rawMonth || '-'}" tidak valid`);
        }

        // 2. CoA validation (prioritize Code, fallback to Name, with fuzzy matching)
        let matchedCoa = null;
        let coaMatchInfo = null;
        if (rawCoa !== null && rawCoa !== undefined && String(rawCoa).trim() !== '') {
          coaMatchInfo = findBestCoaMatch(rawCoa, metadata.coas || []);
          if (coaMatchInfo && coaMatchInfo.coa) {
            matchedCoa = coaMatchInfo.coa;
            if (coaMatchInfo.matchType === 'fuzzy_name') {
              warnings.push(`Akun "${rawCoa}" dicocokkan otomatis ke "[${matchedCoa.code || '-'}] ${matchedCoa.name}" (kemiripan ${Math.round(coaMatchInfo.score * 100)}%)`);
            }
          }
        }

        if (!matchedCoa) {
          errors.push(`Kode Akun CoA "${rawCoa || '-'}" tidak terdaftar di master CoA`);
        }

        // 3. Vendor matching with intelligent Fuzzy Matching
        let vendorId = '';
        let vendorName = '';
        let matchInfo = null;

        if (rawVendor !== null && rawVendor !== undefined && String(rawVendor).trim() !== '') {
          const searchVendor = String(rawVendor).trim();
          matchInfo = findBestVendorMatch(searchVendor, metadata.vendors || []);

          if (matchInfo && matchInfo.vendor) {
            vendorId = String(matchInfo.vendor.id);
            vendorName = matchInfo.vendor.vendor_name;

            if (matchInfo.matchType === 'fuzzy' || matchInfo.matchType === 'high_confidence') {
              warnings.push(`Vendor "${searchVendor}" dicocokkan otomatis ke "${matchInfo.vendor.vendor_name}" (kemiripan ${Math.round(matchInfo.score * 100)}%)`);
            }
          } else {
            // New/custom vendor not present in master
            vendorId = searchVendor;
            vendorName = searchVendor;
          }
        }

        // 4. Smart Qty parsing (extract numeric count)
        let qtyNum = 1;
        if (rawQty !== null && rawQty !== undefined) {
          if (typeof rawQty === 'number') {
            qtyNum = Math.max(1, Math.round(rawQty));
          } else {
            const matchQty = String(rawQty).match(/\d+/);
            if (matchQty) {
              qtyNum = Math.max(1, parseInt(matchQty[0], 10));
            }
          }
        }

        // 5. Smart Price parsing (handles Rupiah symbols, Indonesian dots, US commas, formula results)
        let unitPrice = 0;
        if (rawPrice !== null && rawPrice !== undefined) {
          if (typeof rawPrice === 'number') {
            unitPrice = Math.max(0, Math.round(rawPrice));
          } else {
            const strPrice = String(rawPrice).trim();
            const cleaned = strPrice
              .replace(/^(rp|idr|\$)\.?\s*/i, '')
              .replace(/[,.]-$/, '')
              .trim();

            if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
              const normalized = cleaned.replace(/\./g, '').replace(',', '.');
              unitPrice = Math.round(parseFloat(normalized)) || 0;
            } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
              const normalized = cleaned.replace(/,/g, '');
              unitPrice = Math.round(parseFloat(normalized)) || 0;
            } else {
              const digitsOnly = cleaned.replace(/[^\d]/g, '');
              unitPrice = parseInt(digitsOnly, 10) || 0;
            }
          }
        }

        if (unitPrice <= 0) {
          warnings.push('Harga satuan 0');
        }

        const subTotal = qtyNum * unitPrice;

        items.push({
          rowNumber,
          period_month: monthNum ? String(monthNum) : '1',
          monthDisplay: monthNum ? MONTH_NAMES[monthNum - 1] : String(rawMonth || '-'),
          coa_id: matchedCoa ? String(matchedCoa.id) : '',
          coa_name: matchedCoa ? matchedCoa.name : String(rawCoa || '-'),
          coa_code: matchedCoa?.code || '',
          raw_vendor: String(rawVendor || '').trim(),
          vendor_id: vendorId,
          vendor_name: vendorName,
          vendor_match_type: matchInfo ? matchInfo.matchType : (vendorName ? 'new' : 'empty'),
          vendor_match_score: matchInfo ? matchInfo.score : 0,
          qty: String(qtyNum),
          unit_price: String(unitPrice),
          budget_amount: String(subTotal),
          description: String(rawDesc || '').trim(),
          isValid: errors.length === 0,
          errors,
          warnings
        });
      });

      if (items.length === 0) {
        throw new Error('Tidak ada baris data alokasi yang ditemukan setelah baris header.');
      }

      setParsedRows(items);
    } catch (err) {
      setParseError(err.message || 'Gagal membaca file Excel. Pastikan format file sesuai template.');
    } finally {
      setParsing(false);
    }
  };

  // Stats calculation
  const validCount = useMemo(() => parsedRows.filter(r => r.isValid).length, [parsedRows]);
  const errorCount = useMemo(() => parsedRows.filter(r => !r.isValid).length, [parsedRows]);
  const totalParsedBudget = useMemo(() => {
    return parsedRows
      .filter(r => r.isValid)
      .reduce((sum, r) => sum + (parseFloat(r.budget_amount) || 0), 0);
  }, [parsedRows]);

  const displayedRows = useMemo(() => {
    if (filterTab === 'valid') return parsedRows.filter(r => r.isValid);
    if (filterTab === 'error') return parsedRows.filter(r => !r.isValid);
    return parsedRows;
  }, [parsedRows, filterTab]);

  // Apply to wizard
  const handleApply = () => {
    const validItems = parsedRows.filter(r => r.isValid).map(r => ({
      period_month: r.period_month,
      coa_id: r.coa_id,
      vendor_id: r.vendor_id,
      qty: r.qty,
      unit_price: r.unit_price,
      budget_amount: r.budget_amount,
      description: r.description,
      event_location_id: '',
      branch_id: 'global'
    }));

    if (validItems.length === 0) return;

    onApply(validItems, importMode);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-4xl z-70 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">
                    Bulk Upload Alokasi Anggaran (Monthly Budget)
                  </h3>
                  <p className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-0.5">
                    Unggah file Excel (.xlsx) untuk mengisi rincian alokasi biaya bulanan secara massal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Step 1: Download Template Helper */}
              <div className="bg-gradient-to-r from-blue-50/70 via-blue-50/40 to-neutral-50 dark:from-blue-950/20 dark:via-neutral-900 dark:to-neutral-900 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                      Unduh Template Excel Resmi
                    </h4>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      Format siap pakai dengan header baku, contoh baris, serta tab referensi akun CoA & Vendor resmi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadMarketingBudgetTemplate({
                      metadata,
                      campaignTitle,
                      fiscalYear,
                      includeCurrentData: false
                    })}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Template (.xlsx)
                  </button>

                  {currentItems.length > 0 && currentItems.some(it => it.coa_id || it.unit_price) && (
                    <button
                      type="button"
                      onClick={() => downloadMarketingBudgetTemplate({
                        metadata,
                        currentItems,
                        campaignTitle,
                        fiscalYear,
                        includeCurrentData: true
                      })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      title="Ekspor baris yang sedang dikerjakan ke Excel"
                    >
                      Ekspor Draft Saat Ini
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-500'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 bg-neutral-50/50 dark:bg-neutral-950/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    file
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {parsing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : file ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>

                  {file ? (
                    <div>
                      <p className="text-xs font-black text-neutral-900 dark:text-white flex items-center justify-center gap-2">
                        {file.name}
                        <span className="text-[10px] font-normal text-neutral-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        File terpilih. Klik atau tarik file lain untuk mengganti.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Tarik & Lepas file Excel (.xlsx) di sini, atau <span className="text-blue-600 dark:text-blue-400 underline">pilih file</span>
                      </p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        Mendukung format file .xlsx, .xls, atau .csv (Maksimal 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Banner */}
              {parseError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Gagal Memproses File Excel:</span>
                    <span className="text-[11px] leading-relaxed mt-0.5 block">{parseError}</span>
                  </div>
                </div>
              )}

              {/* Parsing Results Summary */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Baris</p>
                      <p className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">{parsedRows.length}</p>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-3">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Baris Valid</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{validCount}</p>
                    </div>
                    <div className={`border rounded-2xl p-3 ${
                      errorCount > 0
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40'
                        : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800'
                    }`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${errorCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                        Perlu Perhatian
                      </p>
                      <p className={`text-lg font-black mt-0.5 ${errorCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                        {errorCount}
                      </p>
                    </div>
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl p-3">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Anggaran</p>
                      <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 truncate" title={formatIDR(totalParsedBudget)}>
                        {formatIDR(totalParsedBudget)}
                      </p>
                    </div>
                  </div>

                  {/* Warning detail if any */}
                  {errorCount > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <span className="font-bold block">Terdapat {errorCount} baris yang memerlukan perbaikan:</span>
                        Anda dapat langsung memilih Akun CoA atau Bulan yang benar pada baris bertanda merah di bawah, atau menghapus baris yang tidak diinginkan.
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                    {/* Filter Tabs Bar */}
                    <div className="px-3.5 py-2 bg-neutral-100/70 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setFilterTab('all')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            filterTab === 'all'
                              ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                          }`}
                        >
                          Semua
                          <span className="text-[10px] bg-neutral-200/70 dark:bg-neutral-800 px-1.5 py-0.2 rounded-full font-mono">
                            {parsedRows.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('valid')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            filterTab === 'valid'
                              ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                          }`}
                        >
                          Valid
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-mono font-bold">
                            {validCount}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('error')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            filterTab === 'error'
                              ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                          }`}
                        >
                          Perlu Perhatian
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            errorCount > 0
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-black'
                              : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500'
                          }`}>
                            {errorCount}
                          </span>
                        </button>
                      </div>

                      <span className="text-[10px] text-neutral-400 hidden sm:inline">
                        Koreksi langsung Akun CoA & Bulan pada tabel jika bertanda merah
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto scrollbar-thin">
                      <table className="w-full text-left text-[10px] border-collapse table-fixed">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-extrabold uppercase tracking-wider sticky top-0 z-10">
                            <th className="px-2 py-2 text-center w-8">No</th>
                            <th className="px-2 py-2 w-16">Status</th>
                            <th className="px-2 py-2 w-28">Bulan</th>
                            <th className="px-2 py-2 w-52">Kode & Akun CoA</th>
                            <th className="px-2 py-2 w-40">Vendor Partner</th>
                            <th className="px-2 py-2 text-center w-12">Qty</th>
                            <th className="px-2 py-2 text-right pr-3 w-28">Harga Satuan</th>
                            <th className="px-2 py-2 text-right pr-3 w-28">Sub Total</th>
                            <th className="px-2 py-2 w-32">Catatan</th>
                            <th className="px-2 py-2 text-center w-10">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                          {displayedRows.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-neutral-400 text-xs">
                                Tidak ada data baris pada filter ini.
                              </td>
                            </tr>
                          ) : (
                            displayedRows.map((r, idx) => (
                              <tr
                                key={r.rowNumber || idx}
                                className={
                                  !r.isValid
                                    ? 'bg-red-50/40 dark:bg-red-950/10 text-red-900 dark:text-red-300'
                                    : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'
                                }
                              >
                                <td className="px-2 py-1.5 text-center text-neutral-400 font-bold">{idx + 1}</td>
                                <td className="px-2 py-1.5">
                                  {r.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                      <Check className="w-3 h-3" /> Valid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md" title={r.errors.join(', ')}>
                                      <X className="w-3 h-3" /> Perbaiki
                                    </span>
                                  )}
                                </td>

                                {/* Bulan Column with Inline Correction if Error */}
                                <td className="px-2 py-1.5">
                                  {r.errors.some(e => e.toLowerCase().includes('bulan') || e.toLowerCase().includes('month')) ? (
                                    <div className="space-y-0.5">
                                      <select
                                        value={r.period_month || '1'}
                                        onChange={(e) => handleFixRowMonth(r.rowNumber, e.target.value)}
                                        className="w-full text-[9px] bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded px-1 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                      >
                                        <option value="">Pilih Bulan</option>
                                        {MONTH_NAMES.map((m, mIdx) => (
                                          <option key={mIdx + 1} value={mIdx + 1}>{mIdx + 1} - {m}</option>
                                        ))}
                                      </select>
                                      <span className="block text-[8px] text-red-500 font-normal">Bulan invalid</span>
                                    </div>
                                  ) : (
                                    <span className="truncate font-semibold block">{r.monthDisplay}</span>
                                  )}
                                </td>

                                {/* CoA Column with Inline Correction if Error */}
                                <td className="px-2 py-1.5">
                                  {r.errors.some(e => e.toLowerCase().includes('coa')) ? (
                                    <div className="space-y-0.5 py-0.5">
                                      <select
                                        value={r.coa_id || ''}
                                        onChange={(e) => handleFixRowCoa(r.rowNumber, e.target.value)}
                                        className="w-full text-[9px] bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded px-1.5 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                      >
                                        <option value="">-- Pilih Akun CoA --</option>
                                        {metadata.coas?.map(coa => (
                                          <option key={coa.id} value={coa.id}>
                                            [{coa.code || '-'}] {coa.name}
                                          </option>
                                        ))}
                                      </select>
                                      <span className="block text-[8px] text-red-500 font-normal truncate" title={r.errors.find(e => e.toLowerCase().includes('coa'))}>
                                        {r.errors.find(e => e.toLowerCase().includes('coa'))}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5 truncate">
                                      <div className="flex items-center gap-1.5 truncate">
                                        {r.coa_code && (
                                          <span className="font-mono text-[9px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 px-1 py-0.5 rounded font-bold shrink-0">
                                            {r.coa_code}
                                          </span>
                                        )}
                                        <span className="truncate font-medium">{r.coa_name}</span>
                                      </div>
                                      {r.warnings?.some(w => w.toLowerCase().includes('dicocokkan') && w.toLowerCase().includes('akun')) && (
                                        <span className="text-[8px] text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                                          <Sparkles className="w-2.5 h-2.5 shrink-0" /> Cocok otomatis
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Vendor Partner */}
                                <td className="px-2 py-1.5 truncate text-neutral-600 dark:text-neutral-300" title={r.vendor_name}>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="truncate font-medium">{r.vendor_name || '-'}</span>
                                    {r.vendor_match_type && r.vendor_match_type !== 'exact' && r.vendor_match_type !== 'new' && r.vendor_match_type !== 'empty' && (
                                      <span
                                        className="shrink-0 text-[8px] font-black bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 px-1 py-0.5 rounded cursor-help flex items-center gap-0.5"
                                        title={`Fuzzy matched dari: "${r.raw_vendor}" (Kemiripan ${Math.round(r.vendor_match_score * 100)}%)`}
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                                        {Math.round(r.vendor_match_score * 100)}%
                                      </span>
                                    )}
                                    {r.vendor_match_type === 'new' && r.vendor_name && (
                                      <span
                                        className="shrink-0 text-[8px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1 py-0.5 rounded"
                                        title="Vendor rekanan baru (akan otomatis dicatat)"
                                      >
                                        Baru
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-2 py-1.5 text-center">{r.qty}</td>
                                <td className="px-2 py-1.5 text-right pr-3 font-mono">
                                  {formatThousands(r.unit_price)}
                                </td>
                                <td className="px-2 py-1.5 text-right pr-3 font-mono font-bold text-neutral-900 dark:text-white">
                                  {formatThousands(r.budget_amount)}
                                </td>
                                <td className="px-2 py-1.5 truncate text-neutral-500 dark:text-neutral-400" title={r.description}>
                                  {r.description || '-'}
                                </td>

                                {/* Action: Delete Row */}
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(r.rowNumber)}
                                    title="Hapus baris ini dari pratinjau"
                                    className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mode Pilihan: Replace vs Append */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                          Metode Penerapan ke Tabel:
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          Tentukan apakah data Excel mengganti seluruh baris atau ditambahkan ke bawahnya.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          importMode === 'replace'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                        }`}
                      >
                        Ganti Semua Baris (Replace)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('append')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          importMode === 'append'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                        }`}
                      >
                        Tambahkan ke Baris (Append)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-955/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Data yang diimpor dapat ditinjau dan disesuaikan kembali sebelum pengajuan final.
              </span>

              <div className="flex items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-200 dark:border-neutral-750 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={validCount === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Terapkan {validCount > 0 ? `${validCount} Baris ` : ''}ke Alokasi Anggaran
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
