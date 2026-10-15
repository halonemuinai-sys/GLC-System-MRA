'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Upload,
  AlertTriangle,
  AlertCircle,
  Copy,
  Info,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar
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
  importWarnings = [],
  setImportWarnings = () => {},
  importingFile,
  setImportingFile,
  importResult = null,
  setImportResult = () => {}
}) {

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Asset Import Template');

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
        'Asset Name *', 'Asset Code', 'Asset Category', 'Asset Type',
        'Location', 'Room', 'PIC', 'Acquisition Date (YYYY-MM-DD)',
        'Acquisition Cost (IDR)', 'Useful Life (Months)', 'Condition *',
        'Status *', 'Company Name (PT) *', 'Description / Specification',
        'Additional Information', 'Reference Link'
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
        categories[0]?.name || 'Electronics', 'Laptop',
        locations[0]?.name || locations[0]?.full_name || 'MRA Head Office',
        'Floor 5 - GA', 'Mia Agustien', '2026-01-15',
        15000000, 36, conditions[0]?.name || 'Good',
        statuses[0]?.name || 'Active', companies[0]?.name || 'PT MRA',
        'ThinkPad L13 Gen 2, Intel i5, 16GB RAM, 512GB SSD',
        'Asset for new GA staff', 'https://drive.google.com/drive/folders/example'
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

      const refSheet = workbook.addWorksheet('Guide & Reference');
      refSheet.getColumn(1).width = 30;
      refSheet.getColumn(2).width = 30;
      refSheet.getColumn(3).width = 30;
      refSheet.getColumn(4).width = 30;
      refSheet.getColumn(5).width = 30;

      refSheet.getCell('A1').value = 'COMPANY (PT) LIST *';
      refSheet.getCell('A1').font = { bold: true };
      companies.forEach((comp, index) => {
        refSheet.getCell(`A${index + 2}`).value = comp.name;
      });

      refSheet.getCell('B1').value = 'ASSET CATEGORY';
      refSheet.getCell('B1').font = { bold: true };
      categories.forEach((cat, index) => {
        refSheet.getCell(`B${index + 2}`).value = cat.name;
      });

      refSheet.getCell('C1').value = 'LOCATION';
      refSheet.getCell('C1').font = { bold: true };
      locations.forEach((loc, index) => {
        refSheet.getCell(`C${index + 2}`).value = loc.name || loc.full_name;
      });

      refSheet.getCell('D1').value = 'ASSET CONDITION *';
      refSheet.getCell('D1').font = { bold: true };
      conditions.forEach((cond, index) => {
        refSheet.getCell(`D${index + 2}`).value = cond.name;
      });

      refSheet.getCell('E1').value = 'ASSET STATUS *';
      refSheet.getCell('E1').font = { bold: true };
      statuses.forEach((stat, index) => {
        refSheet.getCell(`E${index + 2}`).value = stat.name;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Asset_Import_Template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download template: ' + err.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    setImportErrors([]);
    setImportWarnings([]);
    setImportPreview([]);
    setImportResult(null);

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const sheet = workbook.getWorksheet(1);
      const parsedData = [];
      const validationErrors = [];
      const validationWarnings = [];

      let lastRow = 1;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const hasValue = row.values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (hasValue) lastRow = rowNumber;
        }
      });

      const expectedHeaders = [
        'Asset Name *', 'Asset Code', 'Asset Category', 'Asset Type',
        'Location', 'Room', 'PIC', 'Acquisition Date (YYYY-MM-DD)',
        'Acquisition Cost (IDR)', 'Useful Life (Months)', 'Condition *',
        'Status *', 'Company Name (PT) *', 'Description / Specification',
        'Additional Information', 'Reference Link'
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
        validationErrors.push('Excel header structure does not match the template. Please make sure you downloaded and are using the correct template.');
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

      const normalize = (str) => (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

      // Tracking Maps for Anomaly & Duplicate Detection
      const seenCodes = new Map(); // asset_code -> [rowNums]
      const seenNames = new Map(); // comp_name_room -> [rowNums]
      const today = new Date();

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
        const rawCost = row.getCell(9).value;
        const acquisition_cost = rawCost !== null && rawCost !== undefined && !isNaN(Number(rawCost)) ? Number(rawCost) : 0;
        const useful_life_months = row.getCell(10).value && !isNaN(Number(row.getCell(10).value)) ? Number(row.getCell(10).value) : null;
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
        const warningsInRow = [];

        // 1. Critical Required Validations
        if (!asset_name) {
          errorsInRow.push('Asset Name is required.');
        } else if (asset_name.length < 3) {
          warningsInRow.push(`Asset Name "${asset_name}" is very short.`);
        }

        if (!company_name) {
          errorsInRow.push('Company Name (PT) is required.');
        } else {
          const compNorm = normalize(company_name);
          const cleanComp = compNorm.replace(/^pt\.?\s*/i, '').trim();
          const matchedCompany = companies.find(c => {
            const cNorm = normalize(c.name);
            const cClean = cNorm.replace(/^pt\.?\s*/i, '').trim();
            return cNorm === compNorm || cClean === cleanComp || cNorm.includes(cleanComp) || cleanComp.includes(cClean);
          });
          if (!matchedCompany) {
            errorsInRow.push(`Company "${company_name}" is not registered in the system.`);
          }
        }

        if (acquisition_date && isNaN(Date.parse(acquisition_date))) {
          errorsInRow.push('Invalid Acquisition Date format (must be YYYY-MM-DD).');
        }

        // 2. Anomaly & Duplicate Detection
        // a. Duplicate Asset Code in file
        if (asset_code && asset_code.trim()) {
          const codeKey = normalize(asset_code);
          if (seenCodes.has(codeKey)) {
            const prevRows = seenCodes.get(codeKey);
            warningsInRow.push(`Asset Code "${asset_code}" is the same as Row ${prevRows.join(', ')}.`);
            seenCodes.set(codeKey, [...prevRows, r]);
          } else {
            seenCodes.set(codeKey, [r]);
          }
        }

        // b. Duplicate Asset Name + Company + Room in file
        if (asset_name && company_name) {
          const itemKey = `${normalize(company_name)}||${normalize(asset_name)}||${normalize(room || '')}`;
          if (seenNames.has(itemKey)) {
            const prevRows = seenNames.get(itemKey);
            warningsInRow.push(`Asset Name & Location is the same as Row ${prevRows.join(', ')}.`);
            seenNames.set(itemKey, [...prevRows, r]);
          } else {
            seenNames.set(itemKey, [r]);
          }
        }

        // c. Cost / Price Anomaly
        if (acquisition_cost <= 0) {
          warningsInRow.push('Acquisition Cost Rp 0 (Asset with no cost amount).');
        }

        // d. Date Anomaly (Future date / Extremely old)
        if (acquisition_date) {
          const parsedD = new Date(acquisition_date);
          if (parsedD > today) {
            warningsInRow.push(`Date (${acquisition_date}) is a future date.`);
          } else if (parsedD.getFullYear() < 1990) {
            warningsInRow.push(`Acquisition year (${parsedD.getFullYear()}) appears too far in the past.`);
          }
        }

        // e. Useful Life Anomaly
        if (useful_life_months && (useful_life_months <= 0 || useful_life_months > 600)) {
          warningsInRow.push(`Useful Life (${useful_life_months} months) seems unreasonable.`);
        }

        if (errorsInRow.length > 0) {
          validationErrors.push(`Row ${r}: ${errorsInRow.join(' ')}`);
        }

        if (warningsInRow.length > 0) {
          validationWarnings.push(`Row ${r}: ${warningsInRow.join(' ')}`);
        }

        parsedData.push({
          rowNum: r,
          asset_name,
          asset_code,
          asset_category_name,
          asset_type_name,
          location_name,
          room,
          pic_name,
          acquisition_date,
          acquisition_cost,
          useful_life_months,
          condition_name,
          status_name,
          company_name,
          details,
          information,
          reference_link,
          hasError: errorsInRow.length > 0,
          hasWarning: warningsInRow.length > 0,
          warnings: warningsInRow
        });
      }

      setImportPreview(parsedData);
      setImportErrors(validationErrors);
      setImportWarnings(validationWarnings);
    } catch (err) {
      setImportErrors(['Failed to process file: ' + err.message]);
    } finally {
      setImportingFile(false);
    }
  };

  const handleCloseModal = () => {
    setShowImportModal(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportWarnings([]);
    setImportResult(null);
  };

  // Re-export just the failed rows, in the same template layout plus a Failure
  // Reason column, so the user can fix and re-upload only what didn't go through.
  const handleDownloadFailedRows = async () => {
    if (!importResult?.failed?.length) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Failed Rows');

      const headers = [
        'Asset Name *', 'Asset Code', 'Asset Category', 'Asset Type',
        'Location', 'Room', 'PIC', 'Acquisition Date (YYYY-MM-DD)',
        'Acquisition Cost (IDR)', 'Useful Life (Months)', 'Condition *',
        'Status *', 'Company Name (PT) *', 'Description / Specification',
        'Additional Information', 'Reference Link', 'Failure Reason'
      ];
      const headerRow = sheet.getRow(1);
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      });

      const byRowNum = new Map(importPreview.map(r => [r.rowNum, r]));
      importResult.failed.forEach((f, idx) => {
        const src = byRowNum.get(f.rowNum) || {};
        const row = sheet.getRow(idx + 2);
        row.values = [
          src.asset_name || f.assetName || '', src.asset_code || '', src.asset_category_name || '',
          src.asset_type_name || '', src.location_name || '', src.room || '', src.pic_name || '',
          src.acquisition_date || '', src.acquisition_cost || '', src.useful_life_months || '',
          src.condition_name || '', src.status_name || '', src.company_name || '',
          src.details || '', src.information || '', src.reference_link || '', f.reason
        ];
      });

      sheet.columns = headers.map(() => ({ width: 22 }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Asset_Import_Failed_Rows.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export failed rows: ' + err.message);
    }
  };

  return (
    <AnimatePresence>
      {showImportModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col max-h-[88vh]"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Import Data Excel - Asset Management
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Upload and validate the office asset master data file
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
              {importResult ? (
                <>
                  {/* Import Result — audit trail of what succeeded / failed and why */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-center">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Rows</p>
                      <p className="text-2xl font-black text-neutral-800 dark:text-white mt-1">{importResult.total}</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-center">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Succeeded</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{importResult.successCount}</p>
                    </div>
                    <div className={`rounded-2xl p-4 text-center border ${importResult.failedCount > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${importResult.failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-400'}`}>Failed</p>
                      <p className={`text-2xl font-black mt-1 ${importResult.failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-400'}`}>{importResult.failedCount}</p>
                    </div>
                  </div>

                  {importResult.failedCount === 0 ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <p className="text-[11px] leading-relaxed">All {importResult.successCount} rows were imported successfully — no failures to review.</p>
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-2xl overflow-hidden">
                      <div className="p-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
                        <h5 className="font-bold flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          Failed Rows — Audit Trail ({importResult.failedCount})
                        </h5>
                        <button
                          type="button"
                          onClick={handleDownloadFailedRows}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Failed Rows
                        </button>
                      </div>
                      <p className="text-[11px] text-red-600/80 dark:text-red-400/80 px-4 pb-2">
                        These rows were not imported. Fix the issue below for each, then re-upload — either the whole file again or just the downloaded failed-rows file.
                      </p>
                      <div className="max-h-56 overflow-y-auto divide-y divide-red-500/10">
                        {importResult.failed.map((f, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                            <span className="text-[10px] font-mono font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                              Row {f.rowNum}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">{f.assetName}</p>
                              <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{f.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult.successCount > 0 && (
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/60 rounded-2xl p-4">
                      <h5 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs mb-2">Imported Rows ({importResult.successCount})</h5>
                      <div className="max-h-32 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 text-[11px]">
                        {importResult.succeeded.map((s, i) => (
                          <div key={i} className="py-1.5 flex items-center gap-2">
                            <span className="text-[9px] font-mono text-neutral-400 w-14 flex-shrink-0">Row {s.rowNum}</span>
                            <span className="flex-1 truncate text-neutral-700 dark:text-neutral-300">{s.assetName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${s.action === 'updated' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                              {s.action === 'updated' ? 'Updated' : 'Created'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                {/* 1. Download Template Card */}
                <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/60 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-200 mb-1">1. Download Official Template</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      The column format has been set up so the import process runs automatically and accurately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Template
                  </button>
                </div>

                {/* 2. File Upload Dropzone */}
                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-900 dark:text-neutral-200">2. Select Excel File (.xlsx)</h4>
                  <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors relative cursor-pointer flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-7 h-7 text-indigo-500 mb-1.5" />
                    <p className="font-medium text-neutral-700 dark:text-neutral-300 text-xs">
                      Click or drag an Excel file here
                    </p>
                    <p className="text-neutral-400 text-[10px] mt-0.5">Supported file format: .xlsx</p>
                  </div>
                </div>

                {importingFile && (
                  <div className="flex items-center justify-center py-4 gap-2 text-neutral-500">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span className="text-xs">Reading and validating Excel file...</span>
                  </div>
                )}

                {/* Critical Error Box (Red) */}
                {importErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 p-4 rounded-2xl space-y-1.5">
                    <h5 className="font-bold flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                      Critical Errors Found ({importErrors.length} rows):
                    </h5>
                    <p className="text-[11px] text-red-500/80">
                      Please fix the following errors in the Excel file before proceeding:
                    </p>
                    <div className="max-h-32 overflow-y-auto divide-y divide-red-500/10 text-[11px] space-y-1 pt-1">
                      {importErrors.map((err, i) => (
                        <div key={i} className="pt-1 font-mono text-[10px] leading-relaxed">{err}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warning & Anomaly Box (Amber/Gold) */}
                {importWarnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 p-4 rounded-2xl space-y-1.5">
                    <h5 className="font-bold flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                      Anomaly & Duplicate Warnings Detected ({importWarnings.length} notes):
                    </h5>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                      The data can still be imported (duplicate asset codes will be updated automatically), but please review the following notes:
                    </p>
                    <div className="max-h-32 overflow-y-auto divide-y divide-amber-500/15 text-[11px] space-y-1 pt-1">
                      {importWarnings.map((warn, i) => (
                        <div key={i} className="pt-1 font-mono text-[10px] leading-relaxed flex items-start gap-1.5">
                          <span className="text-amber-500">•</span>
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                {importPreview.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-neutral-900 dark:text-neutral-200 flex items-center gap-2">
                        <span>Data Preview ({importPreview.length} rows)</span>
                        {importErrors.length === 0 && importWarnings.length === 0 && (
                          <span className="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            All data is fully valid
                          </span>
                        )}
                        {importErrors.length === 0 && importWarnings.length > 0 && (
                          <span className="text-[10px] px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {importWarnings.length} Anomaly Warnings
                          </span>
                        )}
                      </h4>
                    </div>

                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-52 overflow-y-auto shadow-sm">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 font-bold uppercase border-b border-neutral-100 dark:border-neutral-800 sticky top-0">
                          <tr>
                            <th className="p-2 text-center w-8">No</th>
                            <th className="p-2">Asset Name</th>
                            <th className="p-2">Asset Code</th>
                            <th className="p-2">Company (PT)</th>
                            <th className="p-2">Acquisition Cost</th>
                            <th className="p-2">Location / Room</th>
                            <th className="p-2">Status & Anomalies</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                          {importPreview.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                row.hasError 
                                  ? 'bg-red-500/5 text-red-600 dark:text-red-400' 
                                  : row.hasWarning 
                                  ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              <td className="p-2 text-center font-medium text-neutral-400">{row.rowNum}</td>
                              <td className="p-2 font-bold max-w-[140px] truncate" title={row.asset_name}>
                                {row.asset_name || '-'}
                              </td>
                              <td className="p-2 font-mono text-[10px]">{row.asset_code || '-'}</td>
                              <td className="p-2 truncate max-w-[120px]">{row.company_name || '-'}</td>
                              <td className="p-2 font-mono">
                                {row.acquisition_cost > 0 
                                  ? `Rp ${row.acquisition_cost.toLocaleString('id-ID')}` 
                                  : <span className="text-amber-500 font-bold">Rp 0</span>}
                              </td>
                              <td className="p-2 truncate max-w-[110px]">
                                {row.location_name ? `${row.location_name}${row.room ? ` (${row.room})` : ''}` : '-'}
                              </td>
                              <td className="p-2">
                                {row.warnings && row.warnings.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {row.warnings.map((w, wIdx) => (
                                      <span key={wIdx} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[9px]">
                                        {w.split(':')[0] || w}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Valid</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </>
              )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-2">
                {importResult ? (
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Close
                  </button>
                ) : (
                  <>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadImport}
                  disabled={submitting || importPreview.length === 0 || importErrors.length > 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Process Import ({importPreview.length} Rows)</span>
                    </>
                  )}
                </button>
                  </>
                )}
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
