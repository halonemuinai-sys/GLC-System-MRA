import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { apiClient } from '@/lib/apiClient';

export async function handleExportPDF({ search, categoryId, locationId, statusId, companyId, companies, categories, locations, statuses, formatIDR, maskNum, setExportingPDF }) {
  try {
    setExportingPDF(true);
    
    const res = await apiClient.get('/api/ga/assets', {
      params: {
        page: 1,
        limit: 9999,
        search: search || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        statusId: statusId || undefined,
        companyId: companyId || undefined
      }
    });
    
    const allAssets = res.data || [];
    const totalCostVal = res.summary?.totalAcquisitionCost || 0;
    const goodCount = res.summary?.goodConditionCount || 0;
    const repairCount = res.summary?.needRepairCount || 0;
    
    const selectedCompanyObj = companies.find(c => String(c.id) === String(companyId));
    const companyName = selectedCompanyObj ? selectedCompanyObj.name : 'All Companies (PT)';
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ASSET SUMMARY & ANALYSIS REPORT', 15, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Company: ${companyName}`, 15, 26);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 15, 31);
    doc.text(`Filters - Category: ${categories.find(c => String(c.id) === String(categoryId))?.name || 'All'} | Location: ${locations.find(l => String(l.id) === String(locationId))?.full_name || 'All'} | Status: ${statuses.find(s => String(s.id) === String(statusId))?.name || 'All'}`, 15, 36);
    
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(170, 8, 55, 28, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('TOTAL BOOK VALUE', 174, 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(formatIDR(totalCostVal), 174, 24);
    
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(230, 8, 52, 28, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL ASSET UNITS', 234, 14);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${maskNum(allAssets.length)} units`, 234, 24);
    
    const conditionNameMap = {
      'Bagus': 'Good', 'Good': 'Good',
      'Perlu Perbaikan': 'Damaged', 'Need Repair': 'Damaged',
      'Repaired': 'Damaged', 'Damaged': 'Damaged'
    };

    const statusNameMap = {
      'Aktif': 'Active', 'Active': 'Active',
      'Tidak Aktif': 'Inactive', 'Inactive': 'Inactive',
      'Dalam Perbaikan': 'Under Repair', 'Under Repair': 'Under Repair',
      'Disposal': 'Disposed', 'Disposed': 'Disposed',
      'Dipinjamkan': 'Loaned', 'Loaned': 'Loaned',
      'Idle': 'Idle'
    };

    const catMap = {};
    const statusMap = {};
    const conditionMap = {};
    
    allAssets.forEach(asset => {
      const catName = asset.m_asset_category?.name || 'Uncategorized';
      const cost = Number(asset.acquisition_cost || 0);
      if (!catMap[catName]) catMap[catName] = { name: catName, count: 0, value: 0 };
      catMap[catName].count++;
      catMap[catName].value += cost;
      
      const rawStatusName = asset.m_status?.name || 'Unknown';
      const sName = statusNameMap[rawStatusName] || rawStatusName;
      statusMap[sName] = (statusMap[sName] || 0) + 1;
      
      const rawCondName = asset.m_condition?.name || 'Unknown';
      const cName = conditionNameMap[rawCondName] || rawCondName;
      conditionMap[cName] = (conditionMap[cName] || 0) + 1;
    });
    
    const catHeaders = [['Category Name', 'Total Units', 'Total Value', 'Percentage']];
    const catRows = Object.values(catMap).map(c => [
      c.name,
      maskNum(c.count) + ' unit',
      formatIDR(c.value),
      totalCostVal > 0 ? ((c.value / totalCostVal) * 100).toFixed(1) + '%' : '0%'
    ]);
    
    const healthHeaders = [['Physical Condition', 'Units', 'Asset Status', 'Units']];
    const healthRows = [];
    const condEntries = Object.entries(conditionMap);
    const statusEntries = Object.entries(statusMap);
    const maxRows = Math.max(condEntries.length, statusEntries.length);
    
    for (let i = 0; i < maxRows; i++) {
      const condPart = condEntries[i] ? [condEntries[i][0], maskNum(condEntries[i][1]) + ' unit'] : ['', ''];
      const statusPart = statusEntries[i] ? [statusEntries[i][0], maskNum(statusEntries[i][1]) + ' unit'] : ['', ''];
      healthRows.push([...condPart, ...statusPart]);
    }
    
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('I. ASSET DISTRIBUTION BY CATEGORY', 15, 54);
    
    autoTable(doc, {
      head: catHeaders, body: catRows, startY: 58,
      margin: { left: 15, right: 15 }, theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } }
    });
    
    const nextY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('II. ASSET HEALTH & OPERATIONAL STATUS', 15, nextY);
    
    autoTable(doc, {
      head: healthHeaders, body: healthRows, startY: nextY + 4,
      margin: { left: 15, right: 15 }, theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 1: { halign: 'center' }, 3: { halign: 'center' } }
    });
    
    const analysisY = doc.lastAutoTable.finalY + 10;
    
    const catArray = Object.values(catMap);
    catArray.sort((a, b) => b.count - a.count);
    const topCatByCount = catArray[0] || { name: '-', count: 0 };
    catArray.sort((a, b) => b.value - a.value);
    const topCatByValue = catArray[0] || { name: '-', value: 0 };
    
    const goodPct = allAssets.length > 0 ? ((goodCount / allAssets.length) * 100).toFixed(1) : '0';
    const repairPct = allAssets.length > 0 ? ((repairCount / allAssets.length) * 100).toFixed(1) : '0';
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('III. EXECUTIVE SUMMARY & ANALYSIS INSIGHTS', 15, analysisY);
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(15, analysisY + 4, 267, 30, 'FD');
    
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    
    doc.text(`\u2022 Berdasarkan data terfilter, total aset yang tercatat adalah sebanyak ${maskNum(allAssets.length)} unit dengan total nilai buku ${formatIDR(totalCostVal)}.`, 18, analysisY + 10);
    doc.text(`\u2022 Kuantitas aset terbanyak didominasi oleh kategori "${topCatByCount.name}" dengan total ${maskNum(topCatByCount.count)} unit.`, 18, analysisY + 15);
    doc.text(`\u2022 Nilai investasi (acquisition cost) tertinggi berada pada kategori "${topCatByValue.name}" dengan total nilai buku ${formatIDR(topCatByValue.value)}.`, 18, analysisY + 20);
    doc.text(`\u2022 Dari aspek kondisi fisik, mayoritas aset dalam keadaan Bagus (${maskNum(goodPct)}%), sedangkan ${maskNum(repairCount)} unit (${maskNum(repairPct)}%) aset memerlukan perbaikan/pemeliharaan segera.`, 18, analysisY + 25);
    
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('GLC MRA Integrated GA Management Suite', 15, 202);
      doc.text(`Page ${i} of ${totalPages}`, 260, 202);
    }
    
    doc.save(`asset_summary_report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error(err);
    alert('Failed to export PDF: ' + err.message);
  } finally {
    setExportingPDF(false);
  }
}

export async function handleExportExcel({ search, categoryId, locationId, statusId, companyId, companies, formatIDR, maskNum, setExportingExcel }) {
  try {
    setExportingExcel(true);

    const res = await apiClient.get('/api/ga/assets', {
      params: {
        page: 1, limit: 9999,
        search: search || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        statusId: statusId || undefined,
        companyId: companyId || undefined
      }
    });

    const allAssets = res.data || [];
    const totalCostVal = res.summary?.totalAcquisitionCost || 0;
    const selectedCompanyObj = companies.find(c => String(c.id) === String(companyId));
    const companyName = selectedCompanyObj ? selectedCompanyObj.name : 'Semua Perusahaan (PT)';

    const HEADER_DARK = 'FF1F2937';
    const HEADER_DARK_LIGHT = 'FF374151';
    const LIGHT_ROW = 'FFF8FAFC';
    const BORDER_COLOR = 'FFCBD5E1';
    const TOTAL_BG = 'FFF1F5F9';

    const thinBorder = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GLC MRA Integrated GA Management Suite';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Data Aset', {
      views: [{ state: 'frozen', ySplit: 4 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const columns = [
      { header: 'Kode Aset', key: 'asset_code', width: 16 },
      { header: 'Nama Aset', key: 'asset_name', width: 30 },
      { header: 'Kategori', key: 'category', width: 22 },
      { header: 'Tipe', key: 'type', width: 18 },
      { header: 'Perusahaan', key: 'company', width: 26 },
      { header: 'Lokasi', key: 'location', width: 20 },
      { header: 'PIC', key: 'pic', width: 20 },
      { header: 'Tgl Akuisisi', key: 'acquisition_date', width: 14 },
      { header: 'Nilai Akuisisi (Rp)', key: 'acquisition_cost', width: 18 },
      { header: 'Kondisi', key: 'condition', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Catatan', key: 'information', width: 30 }
    ];
    sheet.columns = columns;

    sheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LAPORAN DATA ASET \u2014 MRA GROUP';
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 26;
    for (let c = 1; c <= columns.length; c++) sheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK } };

    sheet.mergeCells(2, 1, 2, columns.length);
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Perusahaan: ${companyName}   |   Total Unit: ${allAssets.length}   |   Total Nilai Buku: Rp ${Number(totalCostVal).toLocaleString('id-ID')}   |   Dicetak: ${new Date().toLocaleString('id-ID')}`;
    subtitleCell.font = { italic: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;
    for (let c = 1; c <= columns.length; c++) sheet.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK_LIGHT } };

    sheet.getRow(3).height = 6;
    const headerRow = sheet.getRow(4);
    headerRow.values = columns.map(c => c.header);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

    allAssets.forEach((a, idx) => {
      const row = sheet.addRow({
        asset_code: a.asset_code || '-',
        asset_name: a.asset_name,
        category: a.m_asset_category?.name || '-',
        type: a.m_asset_type?.name || '-',
        company: a.m_company?.name || '-',
        location: a.m_location?.full_name || a.room || '-',
        pic: a.m_user?.full_name || '-',
        acquisition_date: a.acquisition_date ? new Date(a.acquisition_date) : null,
        acquisition_cost: Number(a.acquisition_cost) || 0,
        condition: a.m_condition?.name || '-',
        status: a.m_status?.name || '-',
        information: a.information || '-'
      });
      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder;
        cell.font = { size: 9.5 };
        cell.alignment = { vertical: 'middle' };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ROW } };
        if (columns[colNumber - 1].key === 'acquisition_cost') {
          cell.numFmt = '"Rp" #,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (columns[colNumber - 1].key === 'acquisition_date') {
          cell.numFmt = 'dd/mm/yyyy';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    const lastDataRow = 4 + allAssets.length;
    const totalRow = sheet.getRow(lastDataRow + 1);
    sheet.mergeCells(lastDataRow + 1, 1, lastDataRow + 1, 8);
    const totalLabelCell = sheet.getCell(lastDataRow + 1, 1);
    totalLabelCell.value = `TOTAL (${allAssets.length} unit aset)`;
    totalLabelCell.font = { bold: true, size: 10 };
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    const totalValueCell = sheet.getCell(lastDataRow + 1, 9);
    totalValueCell.value = { formula: `SUM(I5:I${lastDataRow})` };
    totalValueCell.numFmt = '"Rp" #,##0';
    totalValueCell.font = { bold: true, size: 10 };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.eachCell(cell => {
      cell.border = { top: { style: 'double', color: { argb: HEADER_DARK } } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
    });

    const summarySheet = workbook.addWorksheet('Ringkasan');
    summarySheet.mergeCells('A1:D1');
    const sumTitle = summarySheet.getCell('A1');
    sumTitle.value = 'RINGKASAN DISTRIBUSI ASET';
    sumTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 24;
    for (let c = 1; c <= 4; c++) summarySheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK } };

    const catMap = {};
    const statusMap = {};
    const conditionMap = {};
    allAssets.forEach(a => {
      const catName = a.m_asset_category?.name || 'Uncategorized';
      const cost = Number(a.acquisition_cost) || 0;
      if (!catMap[catName]) catMap[catName] = { name: catName, count: 0, value: 0 };
      catMap[catName].count++;
      catMap[catName].value += cost;
      const statusName = a.m_status?.name || 'Unknown';
      statusMap[statusName] = (statusMap[statusName] || 0) + 1;
      const condName = a.m_condition?.name || 'Unknown';
      conditionMap[condName] = (conditionMap[condName] || 0) + 1;
    });

    summarySheet.getCell('A3').value = 'Distribusi per Kategori';
    summarySheet.getCell('A3').font = { bold: true, size: 11 };
    summarySheet.columns = [{ width: 28 }, { width: 14 }, { width: 18 }, { width: 14 }];
    const catHeaderRow = summarySheet.getRow(4);
    catHeaderRow.values = ['Kategori', 'Jumlah Unit', 'Total Nilai (Rp)', 'Persentase'];
    catHeaderRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK_LIGHT } };
      cell.border = thinBorder;
    });
    let r = 5;
    Object.values(catMap).sort((a, b) => b.value - a.value).forEach((c, idx) => {
      const row = summarySheet.getRow(r);
      row.values = [c.name, c.count, c.value, totalCostVal > 0 ? `${((c.value / totalCostVal) * 100).toFixed(1)}%` : '0%'];
      row.getCell(3).numFmt = '"Rp" #,##0';
      row.eachCell(cell => {
        cell.border = thinBorder;
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ROW } };
      });
      r++;
    });

    r += 1;
    summarySheet.getCell(`A${r}`).value = 'Distribusi per Status & Kondisi';
    summarySheet.getCell(`A${r}`).font = { bold: true, size: 11 };
    r += 1;
    const statHeaderRow = summarySheet.getRow(r);
    statHeaderRow.values = ['Status Operasional', 'Jumlah Unit', 'Kondisi Fisik', 'Jumlah Unit'];
    statHeaderRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK_LIGHT } };
      cell.border = thinBorder;
    });
    r += 1;
    const statusEntries2 = Object.entries(statusMap);
    const condEntries2 = Object.entries(conditionMap);
    const maxRows2 = Math.max(statusEntries2.length, condEntries2.length);
    for (let i = 0; i < maxRows2; i++) {
      const row = summarySheet.getRow(r);
      row.values = [
        statusEntries2[i]?.[0] || '', statusEntries2[i]?.[1] ?? '',
        condEntries2[i]?.[0] || '', condEntries2[i]?.[1] ?? ''
      ];
      row.eachCell(cell => { cell.border = thinBorder; if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ROW } }; });
      r++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Data_Aset_MRA_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Failed to export Excel: ' + err.message);
  } finally {
    setExportingExcel(false);
  }
}
