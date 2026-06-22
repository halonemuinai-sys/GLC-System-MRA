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

module.exports = { sendMail, sendPasswordResetEmail, getTransporter };
