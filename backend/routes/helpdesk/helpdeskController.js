const prisma = require('../../api/db');
const { sendMail } = require('../../api/mailer');

const SLA_HOURS = {
  LOW:    { response: 24, resolution: 120 },
  MEDIUM: { response: 8,  resolution: 48  },
  HIGH:   { response: 2,  resolution: 8   },
};

const CATEGORY_PRIORITY = {
  'Hardware':                  'MEDIUM',
  'Software / Aplikasi':       'MEDIUM',
  'Network / Internet':        'HIGH',
  'Printer / Scanner':         'LOW',
  'HP / Telepon':              'LOW',
  'Akses & Password':          'HIGH',
  'Lainnya':                   'LOW',
  'Pembuatan Email Baru':      'LOW',
  'Reset Password / Akun':     'HIGH',
  'Akun ERP Retailsoft':       'LOW',
  'Perubahan Akses ERP':       'LOW',
  'Nonaktifkan Akun':          'MEDIUM',
  'Instalasi Software':        'LOW',
  'Permintaan Perangkat Baru': 'LOW',
  'Akun VPN':                  'LOW',
  'Akses Folder / Drive':      'LOW',
  'Akun Sistem Lain':          'LOW',
  'Relokasi Perangkat':        'LOW',
};

function calcSla(priority) {
  const h = SLA_HOURS[priority] || SLA_HOURS.MEDIUM;
  const now = Date.now();
  return {
    slaResponseLimit:   new Date(now + h.response   * 3600_000),
    slaResolutionLimit: new Date(now + h.resolution * 3600_000),
  };
}

// POST /api/helpdesk/tickets
async function createTicket(req, res, next) {
  try {
    const { title, description, category, subType, ticketType, formData } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'title, description, dan category wajib diisi.' });
    }

    const requester = await prisma.helpdesk_user.findUnique({
      where: { email: req.user.email.toLowerCase().trim() }
    });
    if (!requester) {
      return res.status(403).json({ error: 'User tidak ditemukan di sistem helpdesk. Hubungi admin IT.' });
    }

    const priority = CATEGORY_PRIORITY[category] || 'MEDIUM';
    const sla = calcSla(priority);

    const ticket = await prisma.helpdesk_ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category,
        ticketType: ticketType || 'insiden',
        subType: subType || null,
        formData: formData || null,
        status: 'OPEN',
        priority,
        companyId: requester.companyId,
        requesterId: requester.id,
        ...sla
      }
    });

    // Kirim email notifikasi ke IT team (fire-and-forget)
    const itEmail = process.env.IT_HELPDESK_EMAIL;
    if (itEmail) {
      sendMail({
        to: itEmail,
        subject: `[Tiket Baru #${ticket.id.slice(0, 8).toUpperCase()}] ${category} — ${title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;color:#1f2937">
          <h2 style="color:#4f46e5">Tiket Helpdesk Baru</h2>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:4px 0;color:#6b7280">ID</td><td style="font-weight:bold">${ticket.id.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Tipe</td><td>${ticketType === 'service_request' ? 'Service Request' : 'Insiden'}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Kategori</td><td style="font-weight:bold">${category}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Prioritas</td><td style="font-weight:bold;color:${priority==='HIGH'?'#dc2626':priority==='MEDIUM'?'#d97706':'#059669'}">${priority}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Pelapor</td><td>${requester.name} (${requester.email})</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Judul</td><td>${title}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;vertical-align:top">Deskripsi</td><td>${description.replace(/\n/g, '<br>')}</td></tr>
            ${formData ? `<tr><td colspan="2" style="padding-top:8px;color:#6b7280;font-size:11px">Data form: ${JSON.stringify(formData)}</td></tr>` : ''}
          </table>
          <p style="font-size:11px;color:#9ca3af;margin-top:16px">SLA Response: ${sla.slaResponseLimit.toLocaleString('id-ID')} | Resolution: ${sla.slaResolutionLimit.toLocaleString('id-ID')}</p>
        </div>`
      }).catch(e => console.error('Helpdesk notif email failed:', e.message));
    }

    res.status(201).json({ message: 'Tiket berhasil dibuat.', ticket });
  } catch (err) { next(err); }
}

// GET /api/helpdesk/tickets — tiket milik user sendiri
async function getMyTickets(req, res, next) {
  try {
    const requester = await prisma.helpdesk_user.findUnique({
      where: { email: req.user.email.toLowerCase().trim() }
    });
    if (!requester) return res.json([]);

    const { status, limit = '20', offset = '0' } = req.query;
    const where = { requesterId: requester.id };
    if (status) where.status = status;

    const tickets = await prisma.helpdesk_ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      select: {
        id: true, title: true, category: true, ticketType: true, subType: true,
        status: true, priority: true, createdAt: true, updatedAt: true,
        respondedAt: true, resolvedAt: true, isSlaBreached: true,
        slaResponseLimit: true, slaResolutionLimit: true,
        assignee: { select: { name: true } }
      }
    });

    res.json(tickets);
  } catch (err) { next(err); }
}

// GET /api/helpdesk/tickets/:id
async function getTicketDetail(req, res, next) {
  try {
    const ticket = await prisma.helpdesk_ticket.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { name: true, email: true, role: true } },
        assignee:  { select: { name: true, email: true } }
      }
    });
    if (!ticket) return res.status(404).json({ error: 'Tiket tidak ditemukan.' });

    // Pastikan hanya requester atau admin yang bisa lihat
    const userEmail = req.user.email.toLowerCase().trim();
    if (ticket.requester.email !== userEmail && req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    res.json(ticket);
  } catch (err) { next(err); }
}

// GET /api/helpdesk/categories — kembalikan definisi kategori
function getCategories(req, res) {
  res.json(CATEGORY_PRIORITY);
}

module.exports = { createTicket, getMyTickets, getTicketDetail, getCategories };
