'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Upload,
  AlertTriangle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import ExcelJS from 'exceljs';

export default function GaAssetsImportModal({
  showImportModal,
  setShowImportModal,
  categories,
  locations,
  conditions,
  statuses,
  companies,
  submitting,
  handleUploadImport,
  importPreview,
  setImportPreview,
  importErrors,
  setImportErrors,
  importingFile,
  setImportingFile
}) {

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Template Import Asset');

      // Styles
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      const centerAlignment = { horizontal: 'center', vertical: 'middle' };
      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };

      const headers = [
        'Nama Aset *', 'Kode Aset', 'Kategori Aset', 'Tipe Aset',
        'Lokasi', 'Ruangan', 'PIC', 'Tanggal Perolehan (YYYY-MM-DD)',
        'Harga Perolehan (IDR)', 'Masa Manfaat (Bulan)', 'Kondisi *',
        'Status *', 'Nama Perusahaan (PT) *', 'Deskripsi / Spesifikasi',
        'Informasi Tambahan', 'Link Referensi'
      ];

      const headerRow = sheet.getRow(1);
      headerRow.values = headers;
      headerRow.height = 28;

      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = centerAlignment;
        cell.border = thinBorder;
      });

      const sampleRow = sheet.getRow(2);
      sampleRow.values = [
        'Laptop ThinkPad L13', 'AST-2026-001',
        categories[0]?.name || 'Elektronik', 'Laptop',
        locations[0]?.name || locations[0]?.full_name || 'MRA Head Office',
        'Lantai 5 - GA', 'John Doe', '2026-01-15',
        15000000, 36, conditions[0]?.name || 'Baik',
        statuses[0]?.name || 'Aktif', companies[0]?.name || 'PT MRA',
        'ThinkPad L13 Gen 2, Intel i5, 16GB RAM, 512GB SSD',
        'Aset untuk staff baru GA', 'https://drive.google.com/drive/folders/example'
      ];
      sampleRow.height = 20;
      sampleRow.eachCell(cell => {
        cell.border = thinBorder;
        cell.font = { size: 9 };
      });

      sheet.columns = [
        { width: 25 }, { width: 18 }, { width: 20 }, { width: 18 },
        { width: 22 }, { width: 18 }, { width: 18 }, { width: 25 },
        { width: 20 }, { width: 20 }, { width: 15 }, { width: 15 },
        { width: 25 }, { width: 35 }, { width: 25 }, { width: 25 }
      ];

      const refSheet = workbook.addWorksheet('Panduan & Referensi');
      refSheet.getColumn(1).width = 30;
      refSheet.getColumn(2).width = 30;
      refSheet.getColumn(3).width = 30;
      refSheet.getColumn(4).width = 30;
      refSheet.getColumn(5).width = 30;

      refSheet.getCell('A1').value = 'DAFTAR PERUSAHAAN (PT) *';
      refSheet.getCell('A1').font = { bold: true };
      companies.forEach((comp, index) => {
        refSheet.getCell(`A${index + 2}`).value = comp.name;
      });

      refSheet.getCell('B1').value = 'KATEGORI ASET';
      refSheet.getCell('B1').font = { bold: true };
      categories.forEach((cat, index) => {
        refSheet.getCell(`B${index + 2}`).value = cat.name;
      });

      refSheet.getCell('C1').value = 'LOKASI';
      refSheet.getCell('C1').font = { bold: true };
      locations.forEach((loc, index) => {
        refSheet.getCell(`C${index + 2}`).value = loc.name || loc.full_name;
      });

      refSheet.getCell('D1').value = 'KONDISI ASET *';
      refSheet.getCell('D1').font = { bold: true };
      conditions.forEach((cond, index) => {
        refSheet.getCell(`D${index + 2}`).value = cond.name;
      });

      refSheet.getCell('E1').value = 'STATUS ASET *';
      refSheet.getCell('E1').font = { bold: true };
      statuses.forEach((stat, index) => {
        refSheet.getCell(`E${index + 2}`).value = stat.name;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Template_Import_Asset.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mendownload template: ' + err.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    setImportErrors([]);
    setImportPreview([]);

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const sheet = workbook.getWorksheet(1);
      const parsedData = [];
      const validationErrors = [];

      let lastRow = 1;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const hasValue = row.values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (hasValue) lastRow = rowNumber;
        }
      });

      const expectedHeaders = [
        'Nama Aset *', 'Kode Aset', 'Kategori Aset', 'Tipe Aset',
        'Lokasi', 'Ruangan', 'PIC', 'Tanggal Perolehan (YYYY-MM-DD)',
        'Harga Perolehan (IDR)', 'Masa Manfaat (Bulan)', 'Kondisi *',
        'Status *', 'Nama Perusahaan (PT) *', 'Deskripsi / Spesifikasi',
        'Informasi Tambahan', 'Link Referensi'
      ];

      const firstRow = sheet.getRow(1);
      const hdrs = [];
      for (let c = 1; c <= expectedHeaders.length; c++) {
        hdrs.push(firstRow.getCell(c).value?.toString().trim());
      }

      const missingHeaders = expectedHeaders.filter((h, idx) => {
        const actual = hdrs[idx];
        return !actual || !actual.toLowerCase().includes(h.replace(/\s*\*+$/, '').toLowerCase().trim());
      });

      if (missingHeaders.length > 8) {
        validationErrors.push('Struktur header Excel tidak sesuai template. Pastikan Anda mengunduh dan menggunakan template yang benar.');
        setImportErrors(validationErrors);
        setImportingFile(false);
        return;
      }

      const parseExcelDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString().split('T')[0];
        if (typeof val === 'number') {
          const date = new Date(Math.round((val - 25569) * 86400 * 1000));
          return date.toISOString().split('T')[0];
        }
        const match = String(val).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (match) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
        return String(val).trim();
      };

      for (let r = 2; r <= lastRow; r++) {
        const row = sheet.getRow(r);
        
        const asset_name = row.getCell(1).value?.toString().trim();
        const asset_code = row.getCell(2).value?.toString().trim() || null;
        const asset_category_name = row.getCell(3).value?.toString().trim() || null;
        const asset_type_name = row.getCell(4).value?.toString().trim() || null;
        const location_name = row.getCell(5).value?.toString().trim() || null;
        const room = row.getCell(6).value?.toString().trim() || null;
        const pic_name = row.getCell(7).value?.toString().trim() || null;
        const acquisition_date = parseExcelDate(row.getCell(8).value);
        const acquisition_cost = row.getCell(9).value ? Number(row.getCell(9).value) : 0;
        const useful_life_months = row.getCell(10).value ? Number(row.getCell(10).value) : null;
        const condition_name = row.getCell(11).value?.toString().trim() || null;
        const status_name = row.getCell(12).value?.toString().trim() || null;
        const company_name = row.getCell(13).value?.toString().trim();
        const details = row.getCell(14).value?.toString().trim() || null;
        const information = row.getCell(15).value?.toString().trim() || null;
        
        let reference_link = null;
        const cell16 = row.getCell(16);
        if (cell16.value && typeof cell16.value === 'object' && cell16.value.hyperlink) {
          reference_link = cell16.value.hyperlink;
        } else {
          reference_link = cell16.value?.toString().trim() || null;
        }

        if (!asset_name && !company_name) continue;

        const errorsInRow = [];
        if (!asset_name) errorsInRow.push('Nama Aset wajib diisi.');
        if (!company_name) {
          errorsInRow.push('Nama Perusahaan (PT) wajib diisi.');
        } else {
          const matchedCompany = companies.find(c => c.name.trim().toLowerCase() === company_name.trim().toLowerCase());
          if (!matchedCompany) errorsInRow.push(`Perusahaan "${company_name}" tidak ditemukan.`);
        }

        if (asset_category_name) {
          const matchedCat = categories.find(c => c.name.trim().toLowerCase() === asset_category_name.trim().toLowerCase());
          if (!matchedCat) errorsInRow.push(`Kategori "${asset_category_name}" tidak ditemukan.`);
        }

        if (location_name) {
          const matchedLoc = locations.find(l => (l.name || l.full_name || '').trim().toLowerCase() === location_name.trim().toLowerCase());
          if (!matchedLoc) errorsInRow.push(`Lokasi "${location_name}" tidak ditemukan.`);
        }

        if (condition_name) {
          const matchedCond = conditions.find(c => c.name.trim().toLowerCase() === condition_name.trim().toLowerCase());
          if (!matchedCond) errorsInRow.push(`Kondisi "${condition_name}" tidak ditemukan.`);
        }

        if (status_name) {
          const matchedStat = statuses.find(s => s.name.trim().toLowerCase() === status_name.trim().toLowerCase());
          if (!matchedStat) errorsInRow.push(`Status "${status_name}" tidak ditemukan.`);
        }

        if (acquisition_date && isNaN(Date.parse(acquisition_date))) {
          errorsInRow.push('Format Tanggal Perolehan tidak valid (harus YYYY-MM-DD).');
        }

        if (errorsInRow.length > 0) {
          validationErrors.push(`Baris ${r}: ${errorsInRow.join(' ')}`);
        }

        parsedData.push({
          rowNum: r, asset_name, asset_code, asset_category_name,
          asset_type_name, location_name, room, pic_name,
          acquisition_date, acquisition_cost, useful_life_months,
          condition_name, status_name, company_name, details,
          information, reference_link, hasError: errorsInRow.length > 0
        });
      }

      setImportPreview(parsedData);
      setImportErrors(validationErrors);
    } catch (err) {
      setImportErrors(['Gagal memproses file: ' + err.message]);
    } finally {
      setImportingFile(false);
    }
  };

  return (
    <AnimatePresence>
      {showImportModal && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
              className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col max-h-[85vh]">
              
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  Import Data from Excel - Asset Management
                </h3>
                <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/60 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-neutral-850 dark:text-neutral-250 mb-1">1. Unduh Template Excel</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">Gunakan template resmi kami agar format kolom sesuai dan proses import berjalan lancar.</p>
                  </div>
                  <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-md">
                    <Download className="w-3.5 h-3.5" />
                    Unduh Template
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-850 dark:text-neutral-250">2. Pilih File Excel (.xlsx)</h4>
                  <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors relative cursor-pointer flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                    <input type="file" accept=".xlsx" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                    <p className="font-medium text-neutral-600 dark:text-neutral-400 text-[11px]">Klik untuk memilih file excel template yang telah diisi</p>
                  </div>
                </div>

                {importingFile && (
                  <div className="flex items-center justify-center py-4 gap-2 text-neutral-500">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span>Membaca dan memvalidasi file excel...</span>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 p-4 rounded-2xl space-y-1">
                    <h5 className="font-bold flex items-center gap-1.5 text-[11px] mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-red-500" />
                      Ditemukan Kesalahan Validasi Data ({importErrors.length}):
                    </h5>
                    <div className="max-h-28 overflow-y-auto divide-y divide-red-500/10 text-[10px] space-y-1">
                      {importErrors.map((err, i) => (
                        <div key={i} className="pt-1">{err}</div>
                      ))}
                    </div>
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-neutral-850 dark:text-neutral-250 flex items-center justify-between">
                      <span>Preview Data ({importPreview.length} baris ditemukan)</span>
                      {importErrors.length === 0 && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-full">
                          Semua data valid
                        </span>
                      )}
                    </h4>
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-400 font-bold uppercase border-b border-neutral-100 dark:border-neutral-800 sticky top-0">
                          <tr>
                            <th className="p-2 text-center w-8">No</th>
                            <th className="p-2">Nama Aset</th>
                            <th className="p-2">Kode Aset</th>
                            <th className="p-2">Perusahaan (PT)</th>
                            <th className="p-2">Kategori</th>
                            <th className="p-2">Kondisi</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                          {importPreview.map((row, idx) => (
                            <tr key={idx} className={`${row.hasError ? 'bg-red-500/5 text-red-500' : 'hover:bg-neutral-50 dark:hover:bg-neutral-850/40 text-neutral-700 dark:text-neutral-300'}`}>
                              <td className="p-2 text-center font-medium">{row.rowNum}</td>
                              <td className="p-2 font-bold max-w-[120px] truncate" title={row.asset_name}>{row.asset_name || '-'}</td>
                              <td className="p-2 font-mono">{row.asset_code || '-'}</td>
                              <td className="p-2 truncate max-w-[100px]">{row.company_name || '-'}</td>
                              <td className="p-2">{row.asset_category_name || '-'}</td>
                              <td className="p-2">{row.condition_name || '-'}</td>
                              <td className="p-2">{row.status_name || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-2">
                <button type="button" onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} disabled={submitting}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50">
                  Batal
                </button>
                <button type="button" onClick={handleUploadImport} disabled={submitting || importPreview.length === 0 || importErrors.length > 0}
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Proses Import ({importPreview.length} Baris)
                </button>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
