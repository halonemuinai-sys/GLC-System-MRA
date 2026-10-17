// Calendar geometry shared by the fullscreen view and its SVG export.
function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(String(value || ''));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function calendarPosition(value, year, monthWidth, inclusiveEnd = false) {
  const date = parseDay(value);
  if (!date) return null;
  if (date.getUTCFullYear() < year) return 0;
  if (date.getUTCFullYear() > year) return 12 * monthWidth;
  const month = date.getUTCMonth();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return (month + (date.getUTCDate() - (inclusiveEnd ? 0 : 1)) / days) * monthWidth;
}

export function timelineRange(plan, year, monthWidth) {
  const start = plan.event_start_date || plan.start_date || plan.event_end_date || plan.end_date;
  const end = plan.event_end_date || plan.end_date || start;
  const from = parseDay(start), to = parseDay(end);
  if (!from || !to || to < from || from.getUTCFullYear() > year || to.getUTCFullYear() < year) return null;
  const left = calendarPosition(start, year, monthWidth);
  const right = calendarPosition(end, year, monthWidth, true);
  return { left, width: right - left, start: from.toISOString().slice(0, 10), end: to.toISOString().slice(0, 10) };
}

export function escapeSvg(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

export function buildTimelineSvg({ rows, year, monthWidth, months, todayX = null, formatMoney, formatDate }) {
  const timelineWidth = monthWidth * 12;
  const budgetWidth = 140, rowHeight = 86, top = 132, margin = 24;
  const width = timelineWidth + budgetWidth + margin * 2;
  const height = top + rows.length * rowHeight + 76;
  const text = (x, y, value, size = 12, fill = '#475569', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escapeSvg(value)}</text>`;
  const truncate = (value, limit) => String(value || '').length > limit ? `${String(value).slice(0, limit - 1)}…` : String(value || '');
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial, sans-serif"><rect width="100%" height="100%" fill="#ffffff"/>`,
    `<rect width="${width}" height="72" fill="#0f172a"/>`, text(margin, 33, `Timeline Campaign ${year}`, 23, '#ffffff', 'font-weight="700"'), text(margin, 55, `${rows.length} campaign`, 12, '#94a3b8')];
  ['#dbeafe', '#d1fae5', '#fef3c7', '#ffe4e6'].forEach((fill, index) => {
    parts.push(`<rect x="${margin + index * monthWidth * 3}" y="80" width="${monthWidth * 3}" height="26" fill="${fill}"/>`, text(margin + (index * 3 + 1.5) * monthWidth, 98, `Q${index + 1}`, 11, '#334155', 'text-anchor="middle" font-weight="700"'));
  });
  months.forEach((month, index) => parts.push(text(margin + (index + 0.5) * monthWidth, 123, month, 10, '#64748b', 'text-anchor="middle"')));
  parts.push(text(margin + timelineWidth + budgetWidth / 2, 113, 'Total Budget', 11, '#334155', 'text-anchor="middle" font-weight="700"'));
  rows.forEach((row, index) => {
    const y = top + index * rowHeight;
    const labelLeft = Math.max(4, Math.min(row.range.left, timelineWidth - 284));
    const labelX = margin + labelLeft;
    parts.push(`<rect x="${margin}" y="${y}" width="${timelineWidth + budgetWidth}" height="${rowHeight}" fill="${index % 2 ? '#f8fafc' : '#ffffff'}"/>`);
    for (let month = 0; month <= 12; month++) parts.push(`<path d="M${margin + month * monthWidth} ${y}v${rowHeight}" stroke="#e2e8f0" stroke-width="0.5"/>`);
    parts.push(`<rect x="${labelX}" y="${y + 9}" width="280" height="42" rx="12" fill="${row.color}" fill-opacity="0.08" stroke="${row.color}" stroke-opacity="0.25"/>`,
      `<circle cx="${labelX + 13}" cy="${y + 24}" r="3" fill="${row.color}"/>`,
      `<g><title>${escapeSvg(`${row.title} · ${row.company} · ${row.status}`)}</title>${text(labelX + 24, y + 26, truncate(row.title, 35), 11, '#0f172a', 'font-weight="600"')}</g>`,
      text(labelX + 12, y + 42, `${formatDate(row.range.start)} – ${formatDate(row.range.end)} · ${formatMoney(row.budget)}`, 9, '#64748b'),
      `<rect x="${margin + row.range.left}" y="${y + 60}" width="${Math.max(2, row.range.width)}" height="8" rx="4" fill="${row.color}"/>`,
      text(margin + timelineWidth + budgetWidth - 14, y + 31, formatMoney(row.budget), 12, '#0f172a', 'text-anchor="end" font-weight="700"'),
      `<rect x="${margin + timelineWidth + 14}" y="${y + 43}" width="112" height="4" rx="2" fill="#e2e8f0"/>`,
      `<rect x="${margin + timelineWidth + 14}" y="${y + 43}" width="${112 * Math.max(0, Math.min(100, row.progress)) / 100}" height="4" rx="2" fill="#10b981"/>`,
      text(margin + timelineWidth + budgetWidth - 14, y + 63, `${row.progress.toFixed(0)}% paid`, 9, '#64748b', 'text-anchor="end"'),
      `<path d="M${margin} ${y + rowHeight}h${timelineWidth + budgetWidth}" stroke="#e2e8f0" stroke-width="0.5"/>`);
  });
  if (todayX !== null && todayX >= 0 && todayX <= timelineWidth) parts.push(`<path d="M${margin + todayX} 106V${top + rows.length * rowHeight}" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  const footerY = top + rows.length * rowHeight + 32;
  const statuses = [...new Map(rows.map(row => [row.status, row])).values()];
  statuses.forEach((row, index) => parts.push(`<circle cx="${margin + index * 145}" cy="${footerY - 4}" r="3" fill="${row.color}"/>`, text(margin + index * 145 + 10, footerY, row.status, 10)));
  parts.push(text(width - margin, footerY, `Total Budget Plan: ${formatMoney(rows.reduce((sum, row) => sum + row.budget, 0))}`, 12, '#0f172a', 'text-anchor="end" font-weight="700"'), '</svg>');
  return parts.join('');
}
