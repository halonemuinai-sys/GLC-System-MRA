const express = require('express');
const crypto = require('crypto');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');
const { sendMail, sendApprovalMagicLinkEmail } = require('../api/mailer');

const router = express.Router();

// Helper: Resolve NIK from JWT req.user.email
async function resolveEmployee(email) {
  if (!email) return null;
  return prisma.helpdesk_user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { company: true }
  });
}

const MAGIC_LINK_EXPIRY_DAYS = 7;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Resolve email penerima untuk 1 role: kalau plan/payment ini ada di bawah Holding Group
// yang punya override khusus untuk role tersebut, pakai itu. Kalau tidak ada override,
// jatuh ke baris default global (company_master_id NULL). Project tetap per PT, tapi
// approver di tier VP/BU/COO ditentukan dari Holding Group PT itu.
async function resolveApproverContact(tx, role, companyMasterId) {
  if (companyMasterId) {
    const override = await tx.approval_role_contacts.findFirst({ where: { role, company_master_id: companyMasterId } });
    if (override) return override;
  }
  return tx.approval_role_contacts.findFirst({ where: { role, company_master_id: null } });
}

// Buat token magic-link untuk 1 step approval_history di dalam transaction, lalu catat
// ke `queue` agar emailnya dikirim SETELAH transaction commit (kalau dikirim di tengah
// transaction lalu transaction rollback, email yang sudah terkirim jadi nyasar/salah).
async function queueMagicLink(tx, queue, { approvalHistoryId, role, stepNumber, companyMasterId }) {
  const contact = await resolveApproverContact(tx, role, companyMasterId);
  if (!contact) return; // role belum dipetakan ke email penerima (global maupun holding), lewati saja
  const email = contact.email;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await tx.approval_magic_links.create({
    data: { token, approval_history_id: approvalHistoryId, recipient_email: email, expires_at: expiresAt }
  });
  queue.push({ email, role, token, stepNumber });
}

async function dispatchMagicLinkEmails(queue, { docTitle, docAmount, companyName, requesterName }) {
  for (const item of queue) {
    try {
      await sendApprovalMagicLinkEmail({
        to: item.email,
        approverLabel: item.role.replace(/_/g, ' '),
        docTitle,
        docAmount: `Rp ${Number(docAmount).toLocaleString('id-ID')}`,
        companyName,
        requesterName,
        stepNumber: item.stepNumber,
        approveUrl: `${FRONTEND_URL}/approve/${item.token}`
      });
    } catch (e) {
      console.error('Magic link email failed:', e.message);
    }
  }
}

// Ambil info dokumen (judul/nilai/perusahaan/pengaju) dari sebuah approval_history task —
// dipakai untuk isi konten email magic-link di step approval selanjutnya.
async function getDocContextForTask(task) {
  const isPlan = !!task.marketing_plan_id;
  if (isPlan) {
    const plan = await prisma.marketing_plans.findUnique({
      where: { id: task.marketing_plan_id },
      include: { company: true, creator: true }
    });
    return { docTitle: plan.title, docAmount: plan.total_budget, companyName: plan.company?.name, requesterName: plan.creator?.name };
  }
  const payment = await prisma.payment_requests.findUnique({
    where: { id: task.payment_request_id },
    include: { marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } }, creator: true }
  });
  return {
    docTitle: payment.title,
    docAmount: payment.amount,
    companyName: payment.marketing_plan_item?.marketing_plan?.company?.name,
    requesterName: payment.creator?.name
  };
}

// Ambil Holding Group (company_master_id) dari sebuah approval_history task — dipakai
// untuk resolve approver Step selanjutnya yang benar (override per Holding kalau ada).
function getCompanyMasterIdForTask(task) {
  const isPlan = !!task.marketing_plan_id;
  if (isPlan) return task.marketing_plan?.company?.company_master_id || null;
  return task.payment_request?.marketing_plan_item?.marketing_plan?.company?.company_master_id || null;
}

// Logika inti eksekusi keputusan approve/reject — dipakai bersama oleh route berbasis
// login (/approvals/:id) dan route magic-link publik (/magic/:token) agar perilaku
// workflow-nya selalu konsisten antara 2 jalur tersebut.
async function executeApprovalDecision({ task, action, comment, signature, actingApproverId, consumeMagicLinkId }) {
  const magicLinkQueue = [];

  const result = await prisma.$transaction(async (tx) => {
    if (consumeMagicLinkId) {
      await tx.approval_magic_links.update({
        where: { id: consumeMagicLinkId },
        data: { used_at: new Date() }
      });
    }

    await tx.approval_history.update({
      where: { id: task.id },
      data: {
        approver_id: actingApproverId,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        comment,
        signature_url: signature || null,
        action_at: new Date()
      }
    });

    const isPlan = !!task.marketing_plan_id;
    const docId = isPlan ? task.marketing_plan_id : task.payment_request_id;
    const amt = isPlan ? parseFloat(task.marketing_plan.total_budget) : parseFloat(task.payment_request.amount);
    const mod = isPlan ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';

    if (action === 'REJECT') {
      if (isPlan) {
        await tx.marketing_plans.update({ where: { id: docId }, data: { status: 'REJECTED' } });
      } else {
        await tx.payment_requests.update({ where: { id: docId }, data: { status: 'REJECTED' } });
      }
      return { message: 'Document successfully rejected and returned to draft.', action };
    }

    const nextStep = task.step_number + 1;
    const nextRule = await tx.approval_rules.findFirst({
      where: {
        module: mod,
        step_number: nextStep,
        min_amount: { lte: amt },
        OR: [{ max_amount: { gte: amt } }, { max_amount: null }]
      }
    });

    const isOverbudget = !isPlan && task.payment_request.status === 'OVERBUDGET_WARN';
    const maxNormalSteps = await tx.approval_rules.count({
      where: {
        module: mod,
        min_amount: { lte: amt },
        OR: [{ max_amount: { gte: amt } }, { max_amount: null }]
      }
    });

    const hasNextStep = nextRule || (isOverbudget && nextStep <= (maxNormalSteps + 1));

    if (hasNextStep) {
      const nextHistory = await tx.approval_history.create({
        data: {
          marketing_plan_id: task.marketing_plan_id,
          payment_request_id: task.payment_request_id,
          approver_id: actingApproverId,
          step_number: nextStep,
          status: 'PENDING'
        }
      });
      const nextRole = nextRule ? nextRule.approver_role : 'CFO_CEO';
      const companyMasterId = getCompanyMasterIdForTask(task);
      await queueMagicLink(tx, magicLinkQueue, { approvalHistoryId: nextHistory.id, role: nextRole, stepNumber: nextStep, companyMasterId });
      return { message: 'Approved. Forwarded to the next step approval chain.', action };
    } else {
      if (isPlan) {
        await tx.marketing_plans.update({ where: { id: docId }, data: { status: 'APPROVED' } });
      } else {
        await tx.payment_requests.update({ where: { id: docId }, data: { status: 'PAID' } });
        await tx.marketing_plan_items.update({
          where: { id: task.payment_request.marketing_plan_item_id },
          data: { actual_amount: { increment: amt } }
        });
      }
      return { message: 'Final approval complete. Document marked as APPROVED/PAID.', action };
    }
  });

  return { result, magicLinkQueue };
}

/**
 * GET /api/marketing/metadata
 * Ambil master data untuk form dropdown (brands, class/lob, branches, CoAs)
 */
router.get('/metadata', verifyToken, async (req, res, next) => {
  try {
    const brands = await prisma.m_brand.findMany({ orderBy: { name: 'asc' } });
    const lobs = await prisma.m_line_business.findMany({ orderBy: { name: 'asc' } });
    const branches = await prisma.m_company_branch.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
    
    // Ambil CoA dari skema glc_mra (terutama kategori pengeluaran/beban 62xxxx/5xxxxx)
    const marketingCoaNames = [
      'Advertising & Promotion Event',
      'Commision',
      'Cost Of Event',
      'Documentation',
      'Entertainment',
      'Gathering',
      'Selling Expenses',
      'Training',
      'Travelling Expenses',
      'Others',
      'Other'
    ];
    const coas = await prisma.m_coa.findMany({
      where: {
        name: { in: marketingCoaNames }
      },
      orderBy: { code: 'asc' }
    });

    // Ambil list perusahaan dari master company GLC Apps sendiri (glc_mra.m_company) —
    // bukan dari helpdesk.Company yang banyak duplikat nama PT (data eksternal di luar
    // kendali GLC Apps). m_company_master di sini sebenarnya cuma tag sektor (Retail/F&B/
    // Media/General), bukan struktur holding berjenjang — sector diikutkan agar bisa
    // ditampilkan sebagai badge, bukan disalah-artikan sebagai nama perusahaan induk.
    const companies = await prisma.m_company.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: { m_company_master: { select: { id: true, name: true, sector: true } } }
    });

    // Ambil list vendor dari Vendor Database GA (glc_mra) — dipakai sebagai rujukan
    // vendor pelaksana di tiap item anggaran, bukan input teks bebas
    const vendors = await prisma.vendors.findMany({
      orderBy: { vendor_name: 'asc' },
      select: { id: true, vendor_code: true, vendor_name: true }
    });

    res.json({ brands, lobs, branches, coas, companies, vendors });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/marketing/plans
 * Membuat rencana anggaran pemasaran (Marketing Plan Campaign) baru
 */
router.post('/plans', verifyToken, checkRole(['admin', 'marketing']), async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const { title, description, company_id, fiscal_year, start_date, end_date, items } = req.body;

    if (!title || !company_id || !fiscal_year || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title, company_id, fiscal_year, and budget items are required.' });
    }

    // Hitung total anggaran
    let totalBudget = 0;
    for (const item of items) {
      totalBudget += parseFloat(item.budget_amount || 0);
    }

    // Gunakan db transaction untuk membuat plan & items secara atomic
    const magicLinkQueue = [];
    const newPlan = await prisma.$transaction(async (tx) => {
      // 1. Buat Header Rencana Pemasaran
      const plan = await tx.marketing_plans.create({
        data: {
          title,
          description,
          company_id: parseInt(company_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          total_budget: totalBudget,
          status: 'PENDING_APPROVAL',
          creator_id: employee.id
        }
      });

      // 2. Buat Rincian Item Anggaran Bulanan
      for (const item of items) {
        let resolvedVendorId = null;
        if (item.vendor_id) {
          const rawId = String(item.vendor_id).trim();
          if (/^\d+$/.test(rawId)) {
            resolvedVendorId = parseInt(rawId, 10);
          } else if (rawId) {
            // It's a typed custom vendor name!
            const existingVendor = await tx.vendors.findFirst({
              where: { vendor_name: { equals: rawId, mode: 'insensitive' } }
            });
            if (existingVendor) {
              resolvedVendorId = existingVendor.id;
            } else {
              // Create vendor on the fly
              const count = await tx.vendors.count();
              const vendorCode = `VND-MKT-${1000 + count + 1}`;
              const newVendor = await tx.vendors.create({
                data: {
                  vendor_name: rawId,
                  vendor_code: vendorCode
                }
              });
              resolvedVendorId = newVendor.id;
            }
          }
        }

        await tx.marketing_plan_items.create({
          data: {
            marketing_plan_id: plan.id,
            coa_id: parseInt(item.coa_id, 10),
            brand_id: item.brand_id ? parseInt(item.brand_id, 10) : null,
            lob_id: item.lob_id ? parseInt(item.lob_id, 10) : null,
            branch_id: item.branch_id ? parseInt(item.branch_id, 10) : null,
            vendor_id: resolvedVendorId,
            period_month: parseInt(item.period_month, 10),
            budget_amount: parseFloat(item.budget_amount || 0),
            actual_amount: 0,
            description: item.description
          }
        });
      }

      // 3. Bangun Rantai Approval Pertama (Urutan Step 1) berdasarkan aturan nominal
      const firstRules = await tx.approval_rules.findMany({
        where: {
          module: 'MARKETING_PLAN',
          min_amount: { lte: totalBudget },
          OR: [
            { max_amount: { gte: totalBudget } },
            { max_amount: null }
          ],
          step_number: 1
        }
      });

      const planCompany = await tx.m_company.findUnique({ where: { id: plan.company_id }, select: { company_master_id: true } });

      for (const rule of firstRules) {
        const history = await tx.approval_history.create({
          data: {
            marketing_plan_id: plan.id,
            approver_id: employee.id, // Placeholder, akan dicocokkan role-nya saat di-approve
            step_number: rule.step_number,
            status: 'PENDING'
          }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: history.id,
          role: rule.approver_role,
          stepNumber: rule.step_number,
          companyMasterId: planCompany?.company_master_id
        });
      }

      return plan;
    });

    // Kirim notifikasi email ke pihak yang berwenang (Simulasi atau nyata)
    try {
      await sendMail({
        to: req.user.email,
        subject: `Rencana Pemasaran Diajukan: ${title}`,
        html: `<p>Halo ${employee.name},</p><p>Rencana Pemasaran <strong>${title}</strong> dengan nilai <strong>Rp ${totalBudget.toLocaleString('id-ID')}</strong> telah berhasil diajukan dan sedang menunggu persetujuan.</p>`
      });
    } catch (e) {
      console.error('Notification failed:', e.message);
    }

    // Kirim magic link approval (DocHub-style) ke approver step pertama
    if (magicLinkQueue.length > 0) {
      const company = await prisma.m_company.findUnique({ where: { id: parseInt(company_id, 10) } });
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: title,
        docAmount: totalBudget,
        companyName: company?.name,
        requesterName: employee.name
      });
    }

    res.status(201).json(newPlan);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/marketing/plans/:id/revise
 * Revisi & ajukan ulang rencana pemasaran yang berstatus REJECTED
 * Plan ID tetap sama (reuse reference), items di-replace, approval chain di-reset
 */
router.put('/plans/:id/revise', verifyToken, checkRole(['admin', 'marketing']), async (req, res, next) => {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    // Pastikan plan exists dan berstatus REJECTED
    const existingPlan = await prisma.marketing_plans.findUnique({ where: { id: planId } });
    if (!existingPlan) {
      return res.status(404).json({ error: 'Marketing Plan not found.' });
    }
    if (existingPlan.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Hanya rencana yang berstatus REJECTED yang bisa direvisi.' });
    }

    const { title, description, company_id, fiscal_year, start_date, end_date, items } = req.body;

    if (!title || !company_id || !fiscal_year || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title, company_id, fiscal_year, and budget items are required.' });
    }

    let totalBudget = 0;
    for (const item of items) {
      totalBudget += parseFloat(item.budget_amount || 0);
    }

    const magicLinkQueue = [];
    const updatedPlan = await prisma.$transaction(async (tx) => {
      // 1. Update header plan
      const plan = await tx.marketing_plans.update({
        where: { id: planId },
        data: {
          title,
          description,
          company_id: parseInt(company_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null,
          total_budget: totalBudget,
          status: 'PENDING_APPROVAL',
          updated_at: new Date()
        }
      });

      // 2. Hapus items lama & approval history lama
      await tx.marketing_plan_items.deleteMany({ where: { marketing_plan_id: planId } });
      await tx.approval_history.deleteMany({ where: { marketing_plan_id: planId } });

      // 3. Buat items baru
      for (const item of items) {
        let resolvedVendorId = null;
        if (item.vendor_id) {
          const rawId = String(item.vendor_id).trim();
          if (/^\d+$/.test(rawId)) {
            resolvedVendorId = parseInt(rawId, 10);
          } else if (rawId) {
            const existingVendor = await tx.vendors.findFirst({
              where: { vendor_name: { equals: rawId, mode: 'insensitive' } }
            });
            if (existingVendor) {
              resolvedVendorId = existingVendor.id;
            } else {
              const count = await tx.vendors.count();
              const vendorCode = `VND-MKT-${1000 + count + 1}`;
              const newVendor = await tx.vendors.create({
                data: { vendor_name: rawId, vendor_code: vendorCode }
              });
              resolvedVendorId = newVendor.id;
            }
          }
        }

        await tx.marketing_plan_items.create({
          data: {
            marketing_plan_id: planId,
            coa_id: parseInt(item.coa_id, 10),
            brand_id: item.brand_id ? parseInt(item.brand_id, 10) : null,
            lob_id: item.lob_id ? parseInt(item.lob_id, 10) : null,
            branch_id: item.branch_id ? parseInt(item.branch_id, 10) : null,
            vendor_id: resolvedVendorId,
            period_month: parseInt(item.period_month, 10),
            budget_amount: parseFloat(item.budget_amount || 0),
            actual_amount: 0,
            description: item.description
          }
        });
      }

      // 4. Bangun Rantai Approval baru (Step 1)
      const firstRules = await tx.approval_rules.findMany({
        where: {
          step_order: 1,
          min_amount: { lte: totalBudget },
          max_amount: { gte: totalBudget }
        },
        include: { contact: true }
      });

      for (const rule of firstRules) {
        const history = await tx.approval_history.create({
          data: {
            marketing_plan_id: planId,
            approver_id: rule.contact_id,
            step_order: 1,
            status: 'PENDING'
          }
        });

        // Generate magic link token
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await tx.approval_tokens.create({
          data: {
            token,
            approval_history_id: history.id,
            expires_at: expiresAt
          }
        });

        if (rule.contact?.email) {
          magicLinkQueue.push({
            email: rule.contact.email,
            name: rule.contact.name,
            token,
            stepOrder: 1,
            historyId: history.id
          });
        }
      }

      return plan;
    });

    // Kirim notifikasi ke creator
    try {
      await sendEmail({
        to: req.user.email,
        subject: `[REVISI] Rencana Pemasaran "${title}" telah diajukan ulang`,
        html: `<p>Halo ${employee.name},</p><p>Revisi Rencana Pemasaran <strong>${title}</strong> (ID: ${planId}) dengan nilai <strong>Rp ${totalBudget.toLocaleString('id-ID')}</strong> telah berhasil diajukan ulang dan sedang menunggu persetujuan.</p>`
      });
    } catch (e) {
      console.error('Notification failed:', e.message);
    }

    // Kirim magic link approval
    if (magicLinkQueue.length > 0) {
      const company = await prisma.m_company.findUnique({ where: { id: parseInt(company_id, 10) } });
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: title,
        docAmount: totalBudget,
        companyName: company?.name,
        requesterName: employee.name
      });
    }

    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/marketing/plans
 * Ambil daftar rencana pemasaran ter-filter
 */
router.get('/plans', verifyToken, async (req, res, next) => {
  try {
    const { company_id, fiscal_year, status } = req.query;
    
    const filters = {};
    if (company_id) filters.company_id = parseInt(company_id, 10);
    if (fiscal_year) filters.fiscal_year = parseInt(fiscal_year, 10);
    if (status) filters.status = status;

    const plans = await prisma.marketing_plans.findMany({
      where: filters,
      include: {
        company: true,
        creator: true,
        approval_history: {
          where: { status: 'PENDING' },
          orderBy: { step_number: 'asc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Hitung total step approval per bracket nominal (sekali query untuk semua plan)
    // supaya frontend bisa tampilkan progres pipeline, misal "Step 2 dari 3 - VP_DIRECTOR"
    const allRules = await prisma.approval_rules.findMany({ where: { module: 'MARKETING_PLAN' } });

    const plansWithPipeline = plans.map(plan => {
      const { approval_history, ...rest } = plan;
      const pendingStep = approval_history[0];
      if (!pendingStep) {
        return { ...rest, pipeline: null };
      }
      const amt = parseFloat(plan.total_budget);
      const bracketRules = allRules.filter(r =>
        amt >= parseFloat(r.min_amount) && (r.max_amount === null || amt <= parseFloat(r.max_amount))
      );
      const currentRule = bracketRules.find(r => r.step_number === pendingStep.step_number);
      return {
        ...rest,
        pipeline: {
          currentStep: pendingStep.step_number,
          totalSteps: bracketRules.length,
          approverRole: currentRule?.approver_role || null
        }
      };
    });

    res.json(plansWithPipeline);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/marketing/plans/:id
 * Detail rencana pemasaran beserta rincian bulanan & audit trail approval
 */
router.get('/plans/:id', verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await prisma.marketing_plans.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        company: true,
        creator: true,
        items: {
          include: {
            m_coa: true,
            m_brand: true,
            m_line_business: true,
            m_branch: true,
            vendors: true,
            payment_requests: {
              include: {
                creator: true
              },
              orderBy: { created_at: 'desc' }
            }
          }
        },
        approval_history: {
          include: {
            approver: true
          },
          orderBy: { step_number: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Marketing Plan not found.' });
    }

    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/marketing/plans/:id
router.delete('/plans/:id', verifyToken, async (req, res, next) => {
  try {
    const planId = parseInt(req.params.id, 10);
    const employee = await resolveEmployee(req.user.email);
    
    const plan = await prisma.marketing_plans.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Marketing Plan not found.' });
    }

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const isCreator = employee && plan.creator_id === employee.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Forbidden. Only the creator or admin can delete this plan.' });
    }

    await prisma.marketing_plans.delete({
      where: { id: planId }
    });

    res.json({ message: 'Marketing Plan deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/marketing/payments
 * Mengajukan realisasi pembayaran biaya pemasaran (Payment Request)
 */
router.post('/payments', verifyToken, checkRole(['admin', 'marketing']), async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const { marketing_plan_item_id, title, amount, notes, doc_url } = req.body;

    if (!marketing_plan_item_id || !title || !amount) {
      return res.status(400).json({ error: 'marketing_plan_item_id, title, and amount are required.' });
    }

    const itemAmt = parseFloat(amount);

    // 1. Verifikasi sisa anggaran item plan
    const planItem = await prisma.marketing_plan_items.findUnique({
      where: { id: parseInt(marketing_plan_item_id, 10) },
      include: { marketing_plan: { include: { company: true } } }
    });

    if (!planItem) {
      return res.status(404).json({ error: 'Marketing Plan Item not found.' });
    }

    if (planItem.marketing_plan.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Cannot request payment on an unapproved marketing plan.' });
    }

    // Sisa budget = Budget - Actual
    const remainingBudget = parseFloat(planItem.budget_amount) - parseFloat(planItem.actual_amount);
    let status = 'PENDING';
    
    // Pengecekan Overbudget: jika melebihi budget, set warning
    const isOverbudget = itemAmt > remainingBudget;
    if (isOverbudget) {
      status = 'OVERBUDGET_WARN';
    }

    // 2. Proteksi Invoice Ganda (Anti-Duplicate Invoice)
    // Cek di database apakah ada payment request yang sama persis nominal dan itemnya yang berstatus APPROVED/PAID
    const duplicate = await prisma.payment_requests.findFirst({
      where: {
        marketing_plan_item_id: parseInt(marketing_plan_item_id, 10),
        amount: itemAmt,
        status: { in: ['APPROVED', 'PAID'] }
      }
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Potensi Tagihan Ganda dideteksi! Pengajuan dibatalkan.' });
    }

    // 3. Validasi Kepatuhan Lintas Modul: Validasi PKS Kontrak (Legal) & Vendor (GA)
    // Jika biaya > Rp 50 Juta, wajib mencantumkan PKS aktif dari modul Legal
    if (itemAmt > 50000000) {
      // Cek dokumen kontrak aktif di tabel documents (skema glc_mra)
      const pks = await prisma.documents.findFirst({
        where: {
          mra_party_id: planItem.marketing_plan.company_id,
          amount: { gte: itemAmt },
          status: 'Active',
          valid_until: { gte: new Date() }
        }
      });

      if (!pks) {
        return res.status(400).json({ error: 'Pengajuan di atas Rp 50 Juta wajib memiliki lampiran Perjanjian Kerja Sama (PKS) aktif di modul Legal!' });
      }
    }

    // 4. Create Payment Request & workflow approval
    const magicLinkQueue = [];
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment_requests.create({
        data: {
          marketing_plan_item_id: parseInt(marketing_plan_item_id, 10),
          title,
          amount: itemAmt,
          status,
          notes,
          doc_url,
          creator_id: employee.id
        }
      });

      // Seeding approval history step 1 untuk Payment Request
      // Jika status OVERBUDGET_WARN, eskalasi aturan ke level tertinggi (misal: tambah CFO_CEO approval step)
      let stepNum = 1;
      const approvalRules = await tx.approval_rules.findMany({
        where: {
          module: 'PAYMENT_REQUEST',
          min_amount: { lte: itemAmt },
          OR: [
            { max_amount: { gte: itemAmt } },
            { max_amount: null }
          ]
        },
        orderBy: { step_number: 'asc' }
      });

      // Daftarkan step pertama untuk dieksekusi approver
      if (approvalRules.length > 0) {
        const history = await tx.approval_history.create({
          data: {
            payment_request_id: payment.id,
            approver_id: employee.id, // placeholder
            step_number: stepNum,
            status: 'PENDING'
          }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: history.id,
          role: approvalRules[0].approver_role,
          stepNumber: stepNum,
          companyMasterId: planItem.marketing_plan.company?.company_master_id
        });
      }

      // Jika overbudget, eskalasi paksa dengan menambahkan CFO_CEO sebagai approver akhir tambahan (+1 level)
      if (isOverbudget) {
        const lastStep = approvalRules.length > 0 ? approvalRules[approvalRules.length - 1].step_number : 1;
        const escHistory = await tx.approval_history.create({
          data: {
            payment_request_id: payment.id,
            approver_id: employee.id, // placeholder
            step_number: lastStep + 1, // step eskalasi tambahan
            status: 'PENDING',
            comment: 'Eskalasi Otomatis: Pengeluaran Melampaui Sisa Anggaran (Overbudget Warning)'
          }
        });
        await queueMagicLink(tx, magicLinkQueue, {
          approvalHistoryId: escHistory.id,
          role: 'CFO_CEO',
          stepNumber: lastStep + 1,
          companyMasterId: planItem.marketing_plan.company?.company_master_id
        });
      }

      return payment;
    });

    if (magicLinkQueue.length > 0) {
      await dispatchMagicLinkEmails(magicLinkQueue, {
        docTitle: title,
        docAmount: itemAmt,
        companyName: planItem.marketing_plan.company?.name,
        requesterName: employee.name
      });
    }

    res.status(201).json(newPayment);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/marketing/tasks
 * Mengambil daftar tugas approval pending untuk user aktif berdasarkan perannya
 */
router.get('/tasks', verifyToken, async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    // Role dicocokkan berdasarkan aturan approval di approval_rules
    const userRole = req.user.role.toUpperCase();
    // Admin GLC Apps selalu bisa lihat & proses semua tugas pending — fallback selama role
    // approval matrix (MARKETING_MANAGER/VP_DIRECTOR/dst.) belum dipetakan ke user sungguhan
    const isAdmin = userRole === 'ADMIN';

    // Cari tugas pending di database
    const pendingTasks = await prisma.approval_history.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        marketing_plan: {
          include: { company: true, creator: true }
        },
        payment_request: {
          include: {
            marketing_plan_item: {
              include: { marketing_plan: { include: { company: true } } }
            },
            creator: true
          }
        }
      }
    });

    if (isAdmin) {
      return res.json(pendingTasks);
    }

    // Filter secara manual di backend untuk memvalidasi step rules berdasarkan role pengguna
    const tasks = [];
    for (const t of pendingTasks) {
      const isPlan = !!t.marketing_plan_id;
      const amt = isPlan ? parseFloat(t.marketing_plan.total_budget) : parseFloat(t.payment_request.amount);
      const mod = isPlan ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';

      // Cari rule untuk step & modul ini
      const rule = await prisma.approval_rules.findFirst({
        where: {
          module: mod,
          step_number: t.step_number,
          min_amount: { lte: amt },
          OR: [
            { max_amount: { gte: amt } },
            { max_amount: null }
          ]
        }
      });

      // Khusus step eskalasi overbudget jika rule tidak ditemukan tetapi step = last + 1
      if (rule && rule.approver_role === userRole) {
        tasks.push(t);
      } else if (!rule && t.step_number > 1 && userRole === 'CFO_CEO') {
        // Fallback untuk step eskalasi paksa overbudget yang hanya bisa diapprove CFO/CEO
        tasks.push(t);
      }
    }

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/marketing/approvals/:id
 * Proses persetujuan (Approve) atau penolakan (Reject) dokumen
 */
router.post('/approvals/:id', verifyToken, async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user.email);
    if (!employee) {
      return res.status(403).json({ error: 'User email not registered in employee database.' });
    }

    const { id } = req.params; // ID Approval History
    const { action, comment, signature } = req.body; // action: 'APPROVE' / 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }

    // 1. Ambil history record
    const task = await prisma.approval_history.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        marketing_plan: { include: { company: true } },
        payment_request: { include: { marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } } } }
      }
    });

    if (!task || task.status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval task not found.' });
    }

    // 2. Validasi otorisasi: pastikan role user yang login memang berwenang di step ini
    // (sebelumnya endpoint ini tidak memvalidasi sama sekali — siapapun yang login bisa
    // approve/reject task apapun selama tahu ID-nya). Admin GLC Apps selalu diizinkan
    // sebagai fallback selama role approval matrix belum dipetakan ke user sungguhan.
    const userRole = req.user.role.toUpperCase();
    if (userRole !== 'ADMIN') {
      const isPlanAuth = !!task.marketing_plan_id;
      const amtAuth = isPlanAuth ? parseFloat(task.marketing_plan.total_budget) : parseFloat(task.payment_request.amount);
      const modAuth = isPlanAuth ? 'MARKETING_PLAN' : 'PAYMENT_REQUEST';

      const authRule = await prisma.approval_rules.findFirst({
        where: {
          module: modAuth,
          step_number: task.step_number,
          min_amount: { lte: amtAuth },
          OR: [
            { max_amount: { gte: amtAuth } },
            { max_amount: null }
          ]
        }
      });

      const isOverbudgetEscalation = !isPlanAuth && task.payment_request.status === 'OVERBUDGET_WARN' && !authRule && task.step_number > 1;
      const authorized = (authRule && authRule.approver_role === userRole) || (isOverbudgetEscalation && userRole === 'CFO_CEO');

      if (!authorized) {
        return res.status(403).json({ error: 'Anda tidak memiliki kewenangan untuk menyetujui tahap approval ini.' });
      }
    }

    // 3. Jalankan pembaruan status workflow (logic dipakai bersama dengan jalur magic-link)
    const { result, magicLinkQueue } = await executeApprovalDecision({
      task,
      action,
      comment,
      signature,
      actingApproverId: employee.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/marketing/history
 * Riwayat keputusan approval (APPROVED/REJECTED) untuk tab History di Cost Approvals
 */
router.get('/history', verifyToken, async (req, res, next) => {
  try {
    const records = await prisma.approval_history.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      include: {
        marketing_plan: { include: { company: true, creator: true } },
        payment_request: {
          include: {
            marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } },
            creator: true
          }
        }
      },
      orderBy: [{ action_at: 'desc' }, { created_at: 'desc' }],
      take: 100
    });

    const history = records.map(r => {
      const isPlan = !!r.marketing_plan_id;
      return {
        id: r.id,
        type: isPlan ? 'Marketing Plan' : 'Payment Request',
        title: isPlan ? r.marketing_plan.title : r.payment_request.title,
        creatorName: isPlan ? r.marketing_plan.creator?.name : r.payment_request.creator?.name,
        companyName: isPlan ? r.marketing_plan.company?.name : r.payment_request.marketing_plan_item?.marketing_plan?.company?.name,
        amount: isPlan ? r.marketing_plan.total_budget : r.payment_request.amount,
        action: r.status,
        comment: r.comment,
        date: r.action_at || r.created_at
      };
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/marketing/magic/:token
 * Endpoint PUBLIK (tanpa login) — dipanggil saat approver klik link di email,
 * menampilkan detail dokumen yang perlu disetujui.
 */
router.get('/magic/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const link = await prisma.approval_magic_links.findUnique({
      where: { token },
      include: {
        approval_history: {
          include: {
            marketing_plan: {
              include: {
                company: true,
                creator: true,
                items: { include: { m_coa: true, m_brand: true, m_line_business: true, m_branch: true, vendors: true } }
              }
            },
            payment_request: {
              include: {
                creator: true,
                marketing_plan_item: {
                  include: { m_coa: true, vendors: true, marketing_plan: { include: { company: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!link) {
      return res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' });
    }
    if (link.used_at) {
      return res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' });
    }
    if (new Date() > link.expires_at) {
      return res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' });
    }
    if (link.approval_history.status !== 'PENDING') {
      return res.status(410).json({ error: 'Approval ini sudah diproses melalui jalur lain.' });
    }

    res.json({
      recipientEmail: link.recipient_email,
      expiresAt: link.expires_at,
      task: link.approval_history
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/marketing/magic/:token
 * Endpoint PUBLIK — eksekusi approve/reject langsung dari email (magic link),
 * tanpa perlu login ke aplikasi. Token sekali pakai & ada batas waktu.
 */
router.post('/magic/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { action, comment, signature } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }
    if (action === 'REJECT' && !comment) {
      return res.status(400).json({ error: 'Komentar wajib diisi untuk penolakan.' });
    }

    const link = await prisma.approval_magic_links.findUnique({ where: { token } });
    if (!link) {
      return res.status(404).json({ error: 'Link approval tidak ditemukan atau tidak valid.' });
    }
    if (link.used_at) {
      return res.status(410).json({ error: 'Link approval ini sudah pernah digunakan.' });
    }
    if (new Date() > link.expires_at) {
      return res.status(410).json({ error: 'Link approval ini sudah kedaluwarsa.' });
    }

    const task = await prisma.approval_history.findUnique({
      where: { id: link.approval_history_id },
      include: {
        marketing_plan: { include: { company: true } },
        payment_request: { include: { marketing_plan_item: { include: { marketing_plan: { include: { company: true } } } } } }
      }
    });

    if (!task || task.status !== 'PENDING') {
      return res.status(410).json({ error: 'Approval ini sudah diproses melalui jalur lain.' });
    }

    // Identitas approver diambil dari email tujuan link (kalau terdaftar di database
    // karyawan). Otorisasi sudah implisit dari kepemilikan token — link ini hanya dikirim
    // ke email yang memang dipetakan untuk role/step tersebut, tidak perlu cek role lagi.
    const approverEmployee = await resolveEmployee(link.recipient_email);
    const actingApproverId = approverEmployee ? approverEmployee.id : task.approver_id;

    const { result, magicLinkQueue } = await executeApprovalDecision({
      task,
      action,
      comment,
      signature,
      actingApproverId,
      consumeMagicLinkId: link.id
    });

    if (magicLinkQueue.length > 0) {
      const docContext = await getDocContextForTask(task);
      await dispatchMagicLinkEmails(magicLinkQueue, docContext);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/marketing/approval-contacts
 * Daftar pemetaan role approval -> email penerima magic link (admin only).
 * Mengembalikan baris default global (company_master_id null) + semua override per Holding.
 */
router.get('/approval-contacts', verifyToken, checkRole(['admin']), async (req, res, next) => {
  try {
    const [contacts, holdings] = await Promise.all([
      prisma.approval_role_contacts.findMany({
        include: { m_company_master: { select: { id: true, name: true } } },
        orderBy: [{ role: 'asc' }, { company_master_id: 'asc' }]
      }),
      prisma.m_company_master.findMany({ orderBy: { name: 'asc' } })
    ]);
    res.json({ contacts, holdings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/marketing/approval-contacts/:id
 * Update email/label 1 baris konfigurasi (default global atau override Holding) (admin only)
 */
router.put('/approval-contacts/:id', verifyToken, checkRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, label } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Email tujuan tidak valid.' });
    }

    const updated = await prisma.approval_role_contacts.update({
      where: { id: parseInt(id, 10) },
      data: { email, label, updated_at: new Date() }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/marketing/approval-contacts
 * Tambah override approver khusus untuk 1 Holding Group (admin only)
 */
router.post('/approval-contacts', verifyToken, checkRole(['admin']), async (req, res, next) => {
  try {
    const { role, email, label, company_master_id } = req.body;

    if (!role || !email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Role dan email tujuan wajib diisi dengan benar.' });
    }
    if (!company_master_id) {
      return res.status(400).json({ error: 'Override wajib menentukan Holding Group. Untuk default global, ubah baris yang sudah ada.' });
    }

    const created = await prisma.approval_role_contacts.create({
      data: { role, email, label, company_master_id: parseInt(company_master_id, 10) }
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Override untuk role dan Holding Group ini sudah ada.' });
    }
    next(err);
  }
});

/**
 * DELETE /api/marketing/approval-contacts/:id
 * Hapus override per Holding Group (admin only). Baris default global tidak bisa dihapus,
 * cuma bisa diubah emailnya — supaya setiap role selalu punya fallback.
 */
router.delete('/approval-contacts/:id', verifyToken, checkRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await prisma.approval_role_contacts.findUnique({ where: { id: parseInt(id, 10) } });

    if (!contact) {
      return res.status(404).json({ error: 'Konfigurasi tidak ditemukan.' });
    }
    if (!contact.company_master_id) {
      return res.status(400).json({ error: 'Baris default global tidak bisa dihapus, hanya bisa diubah.' });
    }

    await prisma.approval_role_contacts.delete({ where: { id: parseInt(id, 10) } });
    res.json({ message: 'Override berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
