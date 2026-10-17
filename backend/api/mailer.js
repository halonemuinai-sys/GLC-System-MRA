const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const fromName = process.env.SMTP_FROM_NAME || 'MRA Retail GLC';
  return getTransporter().sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text
  });
}

async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  const greetingName = fullName || to;
  const subject = 'Reset Password - GLC Apps MRA Group';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #4f46e5; margin-bottom: 4px;">Reset Password</h2>
      <p>Halo ${greetingName},</p>
      <p>Kami menerima permintaan untuk mereset password akun GLC Apps Anda. Klik tombol di bawah untuk membuat password baru:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </p>
      <p>Atau salin link berikut ke browser Anda:</p>
      <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${resetUrl}</p>
      <p style="font-size: 12px; color: #6b7280;">Link ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari sistem GLC Apps - MRA Group. Jangan membalas email ini.</p>
    </div>
  `;
  const text = `Halo ${greetingName},\n\nKami menerima permintaan untuk mereset password akun GLC Apps Anda.\nBuka link berikut untuk membuat password baru (berlaku 1 jam):\n${resetUrl}\n\nJika Anda tidak meminta reset password, abaikan email ini.`;

  return sendMail({ to, subject, html, text });
}

async function sendApprovalMagicLinkEmail({ to, approverLabel, docTitle, docAmount, companyName, requesterName, stepNumber, approveUrl }) {
  const subject = `[Approval Diperlukan] ${docTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #4f46e5; margin-bottom: 4px;">Persetujuan Anggaran Marketing</h2>
      <p>Halo ${approverLabel},</p>
      <p>Pengajuan berikut membutuhkan persetujuan Anda (Step ${stepNumber}):</p>
      <table style="width: 100%; font-size: 13px; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #6b7280;">Judul</td><td style="padding: 4px 0; font-weight: bold;">${docTitle}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Perusahaan</td><td style="padding: 4px 0; font-weight: bold;">${companyName || '-'}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Nilai</td><td style="padding: 4px 0; font-weight: bold;">${docAmount}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Diajukan oleh</td><td style="padding: 4px 0; font-weight: bold;">${requesterName || '-'}</td></tr>
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${approveUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Tinjau & Setujui</a>
      </p>
      <p>Atau salin link berikut ke browser Anda:</p>
      <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${approveUrl}</p>
      <p style="font-size: 12px; color: #6b7280;">Link ini berlaku selama 7 hari dan hanya bisa dipakai satu kali. Jika bukan Anda yang dituju, abaikan email ini.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari sistem GLC Apps - MRA Group. Jangan membalas email ini.</p>
    </div>
  `;
  const text = `Halo ${approverLabel},\n\nPengajuan "${docTitle}" (${companyName || '-'}, ${docAmount}) membutuhkan persetujuan Anda di step ${stepNumber}.\nBuka link berikut untuk meninjau dan menyetujui (berlaku 7 hari, sekali pakai):\n${approveUrl}`;

  return sendMail({ to, subject, html, text });
}

async function sendPaymentStatusEmail({ to, requesterName, docTitle, amount, status, comment, planTitle }) {
  const isApproved = status === 'APPROVED';
  const subject = `[${isApproved ? 'Disetujui' : 'Ditolak'}] Realisasi Biaya: ${docTitle}`;
  const statusColor = isApproved ? '#059669' : '#dc2626';
  const statusLabel = isApproved ? 'DISETUJUI' : 'DITOLAK';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: ${statusColor}; margin-bottom: 4px;">Pengajuan Realisasi Biaya ${statusLabel}</h2>
      <p>Halo ${requesterName || 'Tim Marketing'},</p>
      <p>Pengajuan realisasi biaya Anda telah <strong style="color: ${statusColor};">${statusLabel}</strong> oleh tim approver.</p>
      <table style="width: 100%; font-size: 13px; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #6b7280;">Judul Tagihan</td><td style="padding: 4px 0; font-weight: bold;">${docTitle}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Campaign</td><td style="padding: 4px 0; font-weight: bold;">${planTitle || '-'}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Nominal</td><td style="padding: 4px 0; font-weight: bold;">Rp ${Number(amount).toLocaleString('id-ID')}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Status</td><td style="padding: 4px 0; font-weight: bold; color: ${statusColor};">${statusLabel}</td></tr>
        ${comment ? `<tr><td style="padding: 4px 0; color: #6b7280; vertical-align: top;">Komentar</td><td style="padding: 4px 0;">${comment}</td></tr>` : ''}
      </table>
      ${isApproved
        ? '<p>Tagihan Anda akan segera diproses oleh tim GA untuk pembayaran. Harap menunggu konfirmasi transfer.</p>'
        : '<p>Jika ada pertanyaan mengenai penolakan ini, silakan hubungi tim approver atau admin sistem.</p>'
      }
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari sistem GLC Apps - MRA Group. Jangan membalas email ini.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}

async function sendPlanStatusEmail({ to, requesterName, docTitle, totalBudget, status, comment, companyName }) {
  const isApproved = status === 'APPROVED';
  const subject = `[${isApproved ? 'Disetujui' : 'Ditolak'}] Marketing Plan: ${docTitle}`;
  const statusColor = isApproved ? '#059669' : '#dc2626';
  const statusLabel = isApproved ? 'DISETUJUI' : 'DITOLAK';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: ${statusColor}; margin-bottom: 4px;">Marketing Plan ${statusLabel}</h2>
      <p>Halo ${requesterName || 'Tim Marketing'},</p>
      <p>Rencana anggaran marketing Anda telah <strong style="color: ${statusColor};">${statusLabel}</strong> oleh tim approver.</p>
      <table style="width: 100%; font-size: 13px; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #6b7280;">Judul Plan</td><td style="padding: 4px 0; font-weight: bold;">${docTitle}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">PT / Entitas</td><td style="padding: 4px 0; font-weight: bold;">${companyName || '-'}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Total Anggaran</td><td style="padding: 4px 0; font-weight: bold;">Rp ${Number(totalBudget).toLocaleString('id-ID')}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Status</td><td style="padding: 4px 0; font-weight: bold; color: ${statusColor};">${statusLabel}</td></tr>
        ${comment ? `<tr><td style="padding: 4px 0; color: #6b7280; vertical-align: top;">Komentar</td><td style="padding: 4px 0;">${comment}</td></tr>` : ''}
      </table>
      ${isApproved
        ? '<p>Plan Anda sudah bisa dijalankan sesuai rencana. Anda bisa mulai mengajukan Payment Request untuk realisasi biaya.</p>'
        : '<p>Silakan buka menu Marketing Plan untuk merevisi dan mengajukan ulang. Kalau ada pertanyaan soal penolakan ini, hubungi tim approver atau admin sistem.</p>'
      }
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari sistem GLC Apps - MRA Group. Jangan membalas email ini.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}

async function sendAmendmentNotifEmail({ to, recipientLabel, docTitle, planTitle, justification, action, reviewComment, frontendUrl }) {
  const isReview = !!action; // action = 'APPROVED' | 'REJECTED' means reviewer result
  const subject = isReview
    ? `[Amendment ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'}] ${docTitle}`
    : `[Review Diperlukan] Amendment: ${docTitle}`;
  const html = isReview
    ? `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: ${action === 'APPROVED' ? '#059669' : '#dc2626'};">Amendment ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'}</h2>
        <p>Halo ${recipientLabel},</p>
        <p>Amendment "<strong>${docTitle}</strong>" untuk campaign <strong>${planTitle}</strong> telah <strong>${action === 'APPROVED' ? 'disetujui' : 'ditolak'}</strong>.</p>
        ${reviewComment ? `<p style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:13px;">Komentar reviewer: <em>${reviewComment}</em></p>` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari sistem GLC Apps - MRA Group.</p>
      </div>`
    : `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #4f46e5;">Review Amendment Diperlukan</h2>
        <p>Halo ${recipientLabel},</p>
        <p>Amendment baru membutuhkan review Anda:</p>
        <table style="width: 100%; font-size: 13px; margin: 16px 0; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; color: #6b7280;">Judul</td><td style="padding: 4px 0; font-weight: bold;">${docTitle}</td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280;">Campaign</td><td style="padding: 4px 0; font-weight: bold;">${planTitle}</td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280; vertical-align: top;">Justifikasi</td><td style="padding: 4px 0;">${justification}</td></tr>
        </table>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${frontendUrl}/dashboard/marketing" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Tinjau di Aplikasi</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari sistem GLC Apps - MRA Group. Jangan membalas email ini.</p>
      </div>`;
  return sendMail({ to, subject, html });
}

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// Email approval generik untuk Berita Acara aset (BAP / BAST): baris info + tabel aset + tombol magic link.
async function sendAssetDocApprovalEmail({ to, approverName, docTitle, docNumber, infoRows, assets, approveUrl }) {
  const subject = `[Approval Diperlukan] ${docTitle} ${docNumber}`;
  const withAccessories = assets.some(a => a.accessories);
  const td = 'padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px;';
  const assetRows = assets.map(a => `
    <tr>
      <td style="${td}">${escapeHtml(a.asset_code || '-')}</td>
      <td style="${td}">${escapeHtml(a.asset_name)}</td>
      <td style="${td}">${escapeHtml(a.condition_snapshot || '-')}</td>
      ${withAccessories ? `<td style="${td}">${escapeHtml(a.accessories || '-')}</td>` : ''}
    </tr>
  `).join('');
  const info = [['Nomor BA', docNumber], ...infoRows].map(([label, value]) =>
    `<tr><td style="padding: 4px 0; color: #64748b; vertical-align: top;">${escapeHtml(label)}</td><td style="padding: 4px 0; font-weight: bold;">${escapeHtml(value || '-')}</td></tr>`
  ).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0f172a; margin-bottom: 4px;">Persetujuan ${escapeHtml(docTitle)}</h2>
      <p>Halo ${escapeHtml(approverName)},</p>
      <p>${escapeHtml(docTitle)} berikut membutuhkan persetujuan Anda:</p>
      <table style="width: 100%; font-size: 13px; margin: 16px 0; border-collapse: collapse;">${info}</table>
      <p style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">Daftar Aset (${assets.length}):</p>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 6px 8px; text-align: left;">Kode</th>
            <th style="padding: 6px 8px; text-align: left;">Nama Aset</th>
            <th style="padding: 6px 8px; text-align: left;">Kondisi</th>
            ${withAccessories ? '<th style="padding: 6px 8px; text-align: left;">Kelengkapan</th>' : ''}
          </tr>
        </thead>
        <tbody>${assetRows}</tbody>
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${approveUrl}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Tinjau & Setujui</a>
      </p>
      <p>Atau salin link berikut ke browser Anda:</p>
      <p style="word-break: break-all; font-size: 12px; color: #64748b;">${approveUrl}</p>
      <p style="font-size: 12px; color: #64748b;">Link ini berlaku selama 7 hari dan hanya bisa dipakai satu kali.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari MRA Hub - GLC Apps. Jangan membalas email ini.</p>
    </div>
  `;
  const text = `Halo ${approverName},\n\n${docTitle} ${docNumber} (${assets.length} aset) membutuhkan persetujuan Anda.\nBuka link berikut untuk meninjau (berlaku 7 hari, sekali pakai):\n${approveUrl}`;

  return sendMail({ to, subject, html, text });
}

const fmtRp = (v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

// Email approval closing Marketing Plan: ringkasan selisih + tabel biaya per item.
async function sendPlanClosingApprovalEmail({ to, approverName, stepLabel, previousApprovals = [], planTitle, companyName, submitterName, totalPaid, totalFinal, variance, settlementType, kpiScore, kpiRows = [], items, approveUrl }) {
  const settlementLabel = settlementType === 'CLAIM'
    ? `CLAIM ${fmtRp(variance)} (perlu diganti)`
    : settlementType === 'EXCESS'
      ? `KELEBIHAN DANA ${fmtRp(Math.abs(variance))} (dikembalikan)`
      : 'Pas (tidak ada selisih)';
  const td = 'padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px;';
  const rows = items.map(it => `
    <tr>
      <td style="${td}">${escapeHtml(it.label)}</td>
      <td style="${td} text-align: right;">${fmtRp(it.paid)}</td>
      <td style="${td} text-align: right;">${fmtRp(it.final)}</td>
      <td style="${td} text-align: right; font-weight: bold; color: ${it.variance > 0 ? '#b45309' : it.variance < 0 ? '#047857' : '#64748b'};">${it.variance === 0 ? '-' : fmtRp(it.variance)}</td>
    </tr>
  `).join('');

  const kpiTable = kpiRows.filter(k => k.target !== null || k.actual !== null).map(k => `
    <tr>
      <td style="${td}">${escapeHtml(k.label)}</td>
      <td style="${td} text-align: right;">${k.target === null ? '-' : k.currency ? fmtRp(k.target) : Number(k.target).toLocaleString('id-ID')}</td>
      <td style="${td} text-align: right;">${k.actual === null ? '-' : k.currency ? fmtRp(k.actual) : Number(k.actual).toLocaleString('id-ID')}</td>
      <td style="${td} text-align: right; font-weight: bold;">${k.achievement === null ? '-' : `${k.achievement}%`}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #0f172a; margin-bottom: 4px;">Persetujuan Closing Marketing Plan</h2>
      ${stepLabel ? `<p style="display: inline-block; background: #f1f5f9; color: #0f172a; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 6px; margin: 4px 0;">${escapeHtml(stepLabel)}</p>` : ''}
      <p>Halo ${escapeHtml(approverName)},</p>
      <p>Closing (pertanggungjawaban biaya & evaluasi KPI) untuk plan berikut membutuhkan persetujuan Anda:</p>
      ${previousApprovals.length ? `<p style="font-size: 12px; color: #047857;">Sudah disetujui: ${previousApprovals.map(escapeHtml).join('; ')}</p>` : ''}
      <table style="width: 100%; font-size: 13px; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #64748b;">Plan</td><td style="padding: 4px 0; font-weight: bold;">${escapeHtml(planTitle)}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Entitas (PT)</td><td style="padding: 4px 0; font-weight: bold;">${escapeHtml(companyName)}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Diajukan oleh</td><td style="padding: 4px 0; font-weight: bold;">${escapeHtml(submitterName)}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Total dibayar</td><td style="padding: 4px 0; font-weight: bold;">${fmtRp(totalPaid)}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Total biaya final</td><td style="padding: 4px 0; font-weight: bold;">${fmtRp(totalFinal)}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Hasil</td><td style="padding: 4px 0; font-weight: bold;">${settlementLabel}</td></tr>
      </table>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 6px 8px; text-align: left;">Item</th>
            <th style="padding: 6px 8px; text-align: right;">Dibayar</th>
            <th style="padding: 6px 8px; text-align: right;">Final</th>
            <th style="padding: 6px 8px; text-align: right;">Selisih</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${kpiTable ? `
      <p style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">Evaluasi KPI${kpiScore !== null && kpiScore !== undefined ? ` — skor ${kpiScore}%` : ''}</p>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 6px 8px; text-align: left;">Indikator</th>
            <th style="padding: 6px 8px; text-align: right;">Target</th>
            <th style="padding: 6px 8px; text-align: right;">Aktual</th>
            <th style="padding: 6px 8px; text-align: right;">Capaian</th>
          </tr>
        </thead>
        <tbody>${kpiTable}</tbody>
      </table>` : ''}
      <p style="text-align: center; margin: 24px 0;">
        <a href="${approveUrl}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Tinjau & Setujui</a>
      </p>
      <p>Atau salin link berikut ke browser Anda:</p>
      <p style="word-break: break-all; font-size: 12px; color: #64748b;">${approveUrl}</p>
      <p style="font-size: 12px; color: #64748b;">Link ini berlaku selama 7 hari dan hanya bisa dipakai satu kali.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 11px; color: #9ca3af;">Email otomatis dari MRA Hub - GLC Apps. Jangan membalas email ini.</p>
    </div>
  `;
  const text = `Halo ${approverName},\n\n${stepLabel ? `[${stepLabel}] ` : ''}Closing Marketing Plan "${planTitle}" (${companyName}) membutuhkan persetujuan Anda. Hasil: ${settlementLabel}.${kpiScore !== null && kpiScore !== undefined ? ` Skor KPI: ${kpiScore}%.` : ''}\nBuka link berikut untuk meninjau (berlaku 7 hari, sekali pakai):\n${approveUrl}`;

  return sendMail({ to, subject: `[Approval Diperlukan] Closing Marketing Plan: ${planTitle}`, html, text });
}

module.exports = { sendMail, sendPasswordResetEmail, sendApprovalMagicLinkEmail, sendPaymentStatusEmail, sendPlanStatusEmail, sendAmendmentNotifEmail, sendAssetDocApprovalEmail, sendPlanClosingApprovalEmail, getTransporter };
