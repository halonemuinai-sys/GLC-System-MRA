import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const NAVY = [15, 23, 42];
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];

function drawLetterhead(doc, title, subtitle, companyName) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 105, 13, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(subtitle, 105, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(companyName || '-', 105, 24, { align: 'center' });
  doc.setFontSize(8);
  doc.text('General Affairs Department - MRA Hub', 105, 28.5, { align: 'center' });
}

function drawAssetTable(doc, startY, head, body) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: INK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 }
  });
  return doc.lastAutoTable.finalY;
}

function drawSignatures(doc, y, left, right) {
  if (y > 225) { doc.addPage(); y = 25; }
  const col2 = 110;
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.text(left.label, 15, y);
  doc.text(right.label, col2, y);

  y += 25;
  doc.setLineWidth(0.3);
  doc.line(15, y, 85, y);
  doc.line(col2, y, col2 + 70, y);

  y += 5;
  doc.text(left.name || '-', 15, y);
  doc.text(right.name || '-', col2, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(left.position || '', 15, y);
  doc.text(right.position || '', col2, y);
  if (right.note) {
    doc.setTextColor(...MUTED);
    doc.text(right.note, col2, y + 4);
  }
}

function drawFooter(doc) {
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Printed: ${new Date().toLocaleString('en-GB')}`, 15, 287);
}

const longDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export function buildDisposalPDF(disposal) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawLetterhead(doc, 'ASSET DISPOSAL REPORT', 'Asset Disposal Record (BAP)', disposal.m_company?.name);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`No: ${disposal.disposal_number || '-'}`, 15, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const intro = doc.splitTextToSize(
    `On ${longDate(disposal.disposal_date)}, the following assets owned by ${disposal.m_company?.name || '-'} have been disposed of for the reason "${disposal.reason}"${disposal.reason_detail ? `: ${disposal.reason_detail}` : '.'} The disposed assets are listed below.`,
    180
  );
  doc.text(intro, 15, 52);

  const endY = drawAssetTable(
    doc,
    52 + intro.length * 5 + 6,
    ['No', 'Asset Code', 'Asset Name', 'Category', 'Condition'],
    disposal.items.map((it, i) => [i + 1, it.assets?.asset_code || '-', it.assets?.asset_name || '-', it.assets?.m_asset_category?.name || '-', it.condition_snapshot || '-'])
  );

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Total: ${disposal.items.length} asset(s)`, 15, endY + 8);

  drawSignatures(doc, endY + 22,
    { label: 'REQUESTED BY,', name: disposal.requested_by?.full_name, position: disposal.requested_by?.position || 'Requester' },
    {
      label: 'APPROVED BY,',
      name: disposal.approver?.name,
      position: disposal.approver?.position || 'Approver',
      note: disposal.approved_at ? `Approved on ${new Date(disposal.approved_at).toLocaleDateString('en-GB')}` : ''
    }
  );
  drawFooter(doc);
  return doc;
}

export function buildHandoverPDF(handover) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawLetterhead(doc, 'ASSET HANDOVER REPORT', 'Asset Handover Record (BAST)', handover.m_company?.name);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`No: ${handover.handover_number || '-'}`, 15, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Type: ${handover.handover_type}`, 195, 42, { align: 'right' });

  doc.setFontSize(10);
  doc.text(`On ${longDate(handover.handover_date)}, the undersigned:`, 15, 52);

  autoTable(doc, {
    startY: 56,
    head: [['FIRST PARTY (Handed Over By)', 'SECOND PARTY (Received By)']],
    body: [
      [`Name      : ${handover.giver_name}`, `Name      : ${handover.recipient_name}`],
      [`Position  : ${handover.giver_position || '-'}`, `Position  : ${handover.recipient_position || '-'}`],
      ['', `Unit        : ${handover.recipient_department || '-'}`]
    ],
    theme: 'plain',
    headStyles: { fontSize: 8.5, fontStyle: 'bold', textColor: INK, lineWidth: { bottom: 0.3 }, lineColor: [203, 213, 225] },
    bodyStyles: { fontSize: 9, textColor: INK, cellPadding: 1.2 },
    margin: { left: 15, right: 15 }
  });

  let y = doc.lastAutoTable.finalY + 7;
  const statement = doc.splitTextToSize(
    'The First Party hands over the following assets to the Second Party, and the Second Party accepts them in the condition stated below:',
    180
  );
  doc.text(statement, 15, y);

  const endY = drawAssetTable(
    doc,
    y + statement.length * 5 + 2,
    ['No', 'Asset Code', 'Asset Name', 'Category', 'Condition', 'Accessories'],
    handover.items.map((it, i) => [i + 1, it.assets?.asset_code || '-', it.assets?.asset_name || '-', it.assets?.m_asset_category?.name || '-', it.condition_snapshot || '-', it.accessories || '-'])
  );

  y = endY + 7;
  if (handover.notes) {
    const notes = doc.splitTextToSize(`Notes: ${handover.notes}`, 180);
    doc.setFontSize(9);
    doc.text(notes, 15, y);
    y += notes.length * 4.5 + 3;
  }

  const clause = doc.splitTextToSize(
    '* The Second Party is fully responsible for the physical security of the assets and the confidentiality of company data. Damage or loss due to negligence is subject to company policy.',
    176
  );
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 180, clause.length * 4 + 5, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(clause, 17, y + 4.5);
  doc.setFont('helvetica', 'normal');
  y += clause.length * 4 + 5;

  if (handover.approver && handover.approved_at) {
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(
      `Approved by ${handover.approver.name}${handover.approver.position ? ` (${handover.approver.position})` : ''} on ${new Date(handover.approved_at).toLocaleDateString('en-GB')}.`,
      15, y + 5
    );
    y += 5;
  }

  drawSignatures(doc, y + 13,
    { label: 'HANDED OVER BY,', name: handover.giver_name, position: handover.giver_position || 'First Party' },
    { label: 'RECEIVED BY,', name: handover.recipient_name, position: handover.recipient_position || 'Second Party' }
  );
  drawFooter(doc);
  return doc;
}

export function docFileName(number, fallback) {
  return `${(number || fallback).replace(/\//g, '-')}.pdf`;
}
