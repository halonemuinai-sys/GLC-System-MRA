import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Berita Acara PDFs follow the MRA Group form layout (see docs/pdf sample):
// A4 landscape, logo top left, bold form title + company, a dotted-grid asset table with a
// "Total Asset" row, "Tanggal :" and a signature row (Dibuat / Diperiksa / Disetujui Oleh).

const INK = [0, 0, 0];
const MUTED = [100, 116, 139];
const PAGE_W = 297;
const MARGIN = 15;

let logoCache = null;
async function loadLogo() {
  if (logoCache !== null) return logoCache;
  try {
    const blob = await (await fetch('/mra_logo.png')).blob();
    logoCache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    logoCache = '';
  }
  return logoCache;
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '');
const idDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const money = (v) => (Number(v) > 0 ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(v)) : '');

function drawHeader(doc, logo, title, companyName, rightLines = []) {
  if (logo) doc.addImage(logo, 'PNG', MARGIN, 10, 38, 38 * 327 / 763, 'mra-logo', 'FAST');
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title, MARGIN, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(companyName || '-', MARGIN, 41);
  doc.setFontSize(8);
  rightLines.forEach((line, i) => doc.text(line, PAGE_W - MARGIN, 36 + i * 4.5, { align: 'right' }));
}

// Dotted cell borders like the sample form; the total row gets a solid border.
const dottedGrid = (totalCols) => (data) => {
  const { doc, cell, section } = data;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  if (section === 'foot') {
    if (data.column.index > totalCols) return; // total row stops at Qty, as on the form
    doc.setLineDashPattern([], 0);
    doc.rect(cell.x, cell.y, cell.width, cell.height);
    return;
  }
  doc.setLineDashPattern([0.4, 0.6], 0);
  doc.rect(cell.x, cell.y, cell.width, cell.height);
  doc.setLineDashPattern([], 0);
};

function drawTable(doc, startY, head, body, columnStyles, totalCols, total) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    foot: [[{ content: 'Total Asset', colSpan: totalCols, styles: { halign: 'center' } }, { content: String(total), styles: { halign: 'center' } }]],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 7.5, textColor: INK, cellPadding: { top: 0.9, bottom: 0.9, left: 1.2, right: 1.2 }, overflow: 'linebreak' },
    headStyles: { fontStyle: 'bold', halign: 'center' },
    footStyles: { fontStyle: 'bold' },
    showFoot: 'lastPage',
    columnStyles,
    margin: { left: MARGIN, right: MARGIN, top: 15 },
    didDrawCell: dottedGrid(totalCols)
  });
  return doc.lastAutoTable.finalY;
}

// groups: [{ label: 'Dibuat Oleh,', people: [{ name, position }] }]
function drawSignatures(doc, y, date, groups) {
  const columns = groups.reduce((n, g) => n + g.people.length, 0);
  const colW = Math.min(62, (PAGE_W - MARGIN * 2) / Math.max(columns, 1));
  if (y + 62 > 200) { doc.addPage(); y = 25; }
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Tanggal : ${idDate(date)}`, MARGIN, y);

  let col = 0;
  for (const group of groups) {
    const x0 = MARGIN + col * colW;
    doc.setFont('helvetica', 'normal');
    doc.text(group.label, x0 + 4, y + 9);
    group.people.forEach((p, i) => {
      const x = x0 + i * colW;
      doc.setFont('helvetica', 'bold');
      doc.text(p.name || '(...........................)', x, y + 39);
      doc.setFont('helvetica', 'normal');
      doc.text(p.position || '', x, y + 44);
      if (p.note) { doc.setTextColor(...MUTED); doc.setFontSize(7); doc.text(p.note, x, y + 48); doc.setFontSize(8); doc.setTextColor(...INK); }
    });
    col += group.people.length;
  }
}

// Documents that are not approved yet carry a diagonal watermark so a print is never
// mistaken for the signed record.
const WATERMARK = { DRAFT: 'DRAFT', PENDING_APPROVAL: 'MENUNGGU PERSETUJUAN', REJECTED: 'DITOLAK' };

function drawFooter(doc, number, status, approvedBy) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (WATERMARK[status]) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.12 }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(44);
      doc.setTextColor(status === 'REJECTED' ? 190 : 100, 30, 30);
      // Rotate around the text start, so offset it to keep the text centred on the page.
      const half = doc.getTextWidth(WATERMARK[status]) / 2;
      const angle = 18 * Math.PI / 180;
      doc.text(WATERMARK[status], PAGE_W / 2 - half * Math.cos(angle), 110 + half * Math.sin(angle), { angle: 18 });
      doc.restoreGraphicsState();
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${number || ''}${approvedBy ? `  ·  ${approvedBy}` : ''}  ·  Printed ${new Date().toLocaleString('en-GB')}`, MARGIN, 203);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, 203, { align: 'right' });
  }
}

export async function buildDisposalPDF(disposal) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  drawHeader(doc, logo, 'FORM LIST DATA DISPOSAL ASET', disposal.m_company?.name, [
    `No. ${disposal.disposal_number || '-'}`,
    `Alasan: ${disposal.reason}${disposal.reason_detail ? ` - ${disposal.reason_detail}` : ''}`.slice(0, 90)
  ]);

  const endY = drawTable(
    doc, 47,
    ['No.', 'Asset Code', 'Category', 'Asset Name', 'Qty', 'Acquisition Date', 'Acquisition Cost', 'Condition', 'Estimated Price'],
    disposal.items.map((it, i) => [
      i + 1,
      it.assets?.asset_code || '-',
      it.assets?.m_asset_category?.name || '-',
      it.assets?.asset_name || '-',
      1,
      fmtDate(it.assets?.acquisition_date),
      money(it.assets?.acquisition_cost),
      it.condition_snapshot || '',
      ''
    ]),
    {
      0: { cellWidth: 9, halign: 'right' }, 1: { cellWidth: 34 }, 2: { cellWidth: 36 }, 3: { cellWidth: 'auto' },
      4: { cellWidth: 9, halign: 'center' }, 5: { cellWidth: 25, halign: 'right' }, 6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 22 }, 8: { cellWidth: 24, halign: 'right' }
    },
    4,
    disposal.items.length
  );

  // Names and titles typed on the BAP; older reports fall back to the requester + fixed titles.
  const typed = Array.isArray(disposal.signatories) && disposal.signatories.length ? disposal.signatories : null;
  const GROUP_LABELS = { prepared: 'Dibuat Oleh,', checked: 'Diperiksa Oleh,', approved: 'Disetujui Oleh,' };
  const groups = typed
    ? Object.entries(GROUP_LABELS)
      .map(([key, label]) => ({ label, people: typed.filter(s => s.group === key).map(s => ({ name: s.name, position: s.title })) }))
      .filter(g => g.people.length)
    : null;
  drawSignatures(doc, endY + 22, disposal.disposal_date, groups || [
    { label: 'Dibuat Oleh,', people: [{ name: disposal.requested_by?.full_name, position: disposal.requested_by?.position || 'Asset Management' }] },
    { label: 'Diperiksa Oleh,', people: [{ position: 'GA Business Partner' }, { position: 'GA Manager' }] },
    { label: 'Disetujui Oleh,', people: [{ position: 'Finance Manager' }, { position: 'Direksi' }] }
  ]);
  // The system approval stays traceable on the printout even when the signature row is typed by hand.
  const approvedBy = disposal.status === 'APPROVED' && disposal.approver?.name ? `Approved in system by ${disposal.approver.name}${disposal.approved_at ? ` on ${fmtDate(disposal.approved_at)}` : ''}` : '';
  drawFooter(doc, disposal.disposal_number, disposal.status, approvedBy);
  return doc;
}

const locationName = (loc) => (loc ? loc.name : '');

export async function buildHandoverPDF(handover) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  drawHeader(doc, logo, 'FORM SERAH TERIMA ASET', handover.m_company?.name, [
    `No. ${handover.handover_number || '-'}`,
    `Jenis: ${handover.handover_type}`
  ]);

  // Parties and destination, as short label / value lines.
  const destination = [handover.to_company?.name, handover.to_location?.name, handover.to_room ? `Ruang ${handover.to_room}` : null].filter(Boolean).join(', ');
  const lines = [
    ['Pihak Pertama (Menyerahkan)', `${handover.giver_name}${handover.giver_position ? ` - ${handover.giver_position}` : ''}`],
    ['Pihak Kedua (Menerima)', `${handover.recipient_name}${handover.recipient_position ? ` - ${handover.recipient_position}` : ''}${handover.recipient_department ? ` (${handover.recipient_department})` : ''}`],
    ...(destination ? [['Dipindahkan ke', `${destination}${handover.transfer_applied_at ? '' : ' (berlaku setelah disetujui)'}`]] : []),
    ...(handover.notes ? [['Catatan', handover.notes]] : [])
  ];
  doc.setFontSize(8);
  let y = 49;
  for (const [label, value] of lines) {
    doc.setFont('helvetica', 'normal');
    doc.text(label, MARGIN, y);
    doc.text(':', MARGIN + 42, y);
    const wrapped = doc.splitTextToSize(String(value), PAGE_W - MARGIN * 2 - 46);
    doc.text(wrapped, MARGIN + 45, y);
    y += wrapped.length * 4;
  }

  // After the transfer is applied the asset already sits at the destination, so show where it came from.
  const fromLocation = (it) => {
    const applied = !!handover.transfer_applied_at;
    const loc = applied ? it.from_location : it.assets?.m_location;
    const room = applied ? it.from_room : it.assets?.room;
    return [locationName(loc), room].filter(Boolean).join(' · ');
  };
  const endY = drawTable(
    doc, y + 2,
    ['No.', 'Asset Code', 'Category', 'Asset Name', 'Qty', handover.transfer_applied_at ? 'Previous Location' : 'Current Location', 'Condition', 'Accessories'],
    handover.items.map((it, i) => [
      i + 1,
      it.assets?.asset_code || '-',
      it.assets?.m_asset_category?.name || '-',
      it.assets?.asset_name || '-',
      1,
      fromLocation(it) || '-',
      it.condition_snapshot || '',
      it.accessories || ''
    ]),
    {
      0: { cellWidth: 9, halign: 'right' }, 1: { cellWidth: 34 }, 2: { cellWidth: 34 }, 3: { cellWidth: 'auto' },
      4: { cellWidth: 9, halign: 'center' }, 5: { cellWidth: 42 }, 6: { cellWidth: 22 }, 7: { cellWidth: 40 }
    },
    4,
    handover.items.length
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const clause = doc.splitTextToSize('Pihak Kedua bertanggung jawab atas keamanan fisik aset dan kerahasiaan data perusahaan. Kerusakan atau kehilangan akibat kelalaian mengikuti kebijakan perusahaan.', PAGE_W - MARGIN * 2);
  let clauseY = endY + 6;
  if (clauseY > 190) { doc.addPage(); clauseY = 20; }
  doc.text(clause, MARGIN, clauseY);

  drawSignatures(doc, clauseY + clause.length * 3.5 + 10, handover.handover_date, [
    { label: 'Diserahkan Oleh,', people: [{ name: handover.giver_name, position: handover.giver_position || 'Pihak Pertama' }] },
    { label: 'Diterima Oleh,', people: [{ name: handover.recipient_name, position: handover.recipient_position || 'Pihak Kedua' }] },
    {
      label: 'Disetujui Oleh,',
      people: [{
        name: handover.approver?.name,
        position: handover.approver?.position || 'GA Manager',
        note: handover.approved_at ? `Approved ${fmtDate(handover.approved_at)}` : ''
      }]
    }
  ]);
  drawFooter(doc, handover.handover_number, handover.status, handover.status === 'APPROVED' && handover.approver?.name ? `Approved in system by ${handover.approver.name}${handover.approved_at ? ` on ${fmtDate(handover.approved_at)}` : ''}` : '');
  return doc;
}

export function docFileName(number, fallback) {
  return `${(number || fallback).replace(/\//g, '-')}.pdf`;
}
