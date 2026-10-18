const prisma = require('../../api/db');
const { resolveEmployee, resolveApproverContact } = require('./marketingHelper');
const { rolesOf } = require('../../api/roles');
const { quarterConfigs } = require('./marketingGovernance');
const { saveUpload, publicUrl } = require('../../api/uploadStorage');
const { signerUsageInclude, withSignerUsage, normalizeEmail, TRANSACTION_MESSAGE } = require('./marketingSignerUsage');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /metadata
async function getMetadata(req, res, next) {
  try {
    const brands = await prisma.m_brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        m_company: { select: { id: true, name: true, code: true } }
      }
    });
    const lobs = await prisma.m_line_business.findMany({ orderBy: { name: 'asc' } });
    const branches = await prisma.m_branch.findMany({
      orderBy: { name: 'asc' },
      include: {
        m_company: { select: { id: true, name: true, code: true } },
        m_brand: { select: { id: true, name: true } }
      }
    });
    const event_locations = await prisma.m_event_location.findMany({ orderBy: { name: 'asc' } });
    
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

    const companies = await prisma.m_company.findMany({
      where: {
        is_active: true,
        ...(req.companyScope && !req.companyScope.all ? { id: { in: req.companyScope.companyIds.length ? req.companyScope.companyIds : [-1] } } : {})
      },
      orderBy: { name: 'asc' },
      include: { m_company_master: { select: { id: true, name: true, sector: true } } }
    });

    const vendors = await prisma.vendors.findMany({
      orderBy: { vendor_name: 'asc' },
      select: { id: true, vendor_code: true, vendor_name: true, status: true }
    });

    const signers = await prisma.m_approval_signer.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    });

    const defaultApproverContacts = await prisma.approval_role_contacts.findMany({
      orderBy: { id: 'asc' },
      include: {
        m_company_master: { select: { id: true, name: true } },
        m_company: { select: { id: true, name: true } },
        signer: { select: { id: true, name: true, email: true, position: true } }
      }
    });

    res.json({ brands, lobs, branches, event_locations, coas, companies, vendors, signers, defaultApproverContacts });
  } catch (err) {
    next(err);
  }
}

// GET /approval-contacts
async function getApprovalContacts(req, res, next) {
  try {
    const [contacts, holdings, companies, signers] = await Promise.all([
      prisma.approval_role_contacts.findMany({
        include: {
          m_company_master: { select: { id: true, name: true } },
          m_company: { select: { id: true, name: true } },
          signer: { select: { id: true, name: true, email: true, position: true } }
        },
        orderBy: [{ role: 'asc' }, { company_master_id: 'asc' }, { company_id: 'asc' }]
      }),
      prisma.m_company_master.findMany({ orderBy: { name: 'asc' } }),
      prisma.m_company.findMany({ where: { is_active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, company_master_id: true } }),
      prisma.m_approval_signer.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } })
    ]);
    res.json({ contacts, holdings, companies, signers });
  } catch (err) {
    next(err);
  }
}

// Resolve { email, label, signer_id } dari body: prioritas signer_id (ambil dari master signer),
// fallback email/label manual. `label` adalah nama tampilan ROLE (mis. "VP Director"), BUKAN nama
// signer yang dipilih — jadi label lama dipertahankan (existingLabel) kecuali dikirim eksplisit.
async function resolveContactEmailLabel(body, existingLabel = null) {
  const { signer_id, email, label } = body;
  if (signer_id) {
    const signer = await prisma.m_approval_signer.findUnique({ where: { id: parseInt(signer_id, 10) } });
    if (!signer) throw Object.assign(new Error('Approver not found.'), { status: 400 });
    return { email: signer.email, label: label !== undefined ? label : existingLabel, signer_id: signer.id };
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    throw Object.assign(new Error('Select an approver or enter a valid recipient email.'), { status: 400 });
  }
  return { email, label: label !== undefined ? label : existingLabel, signer_id: null };
}

// PUT /approval-contacts/:id
async function updateApprovalContact(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.approval_role_contacts.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) return res.status(404).json({ error: 'Setting not found.' });

    const resolved = await resolveContactEmailLabel(req.body, existing.label);

    const updated = await prisma.approval_role_contacts.update({
      where: { id: parseInt(id, 10) },
      data: { ...resolved, updated_at: new Date() }
    });

    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// POST /approval-contacts
async function createApprovalContact(req, res, next) {
  try {
    const { role, company_master_id, company_id } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }
    if (!company_master_id && !company_id) {
      return res.status(400).json({ error: 'A specific recipient needs a company or holding group. To change the general recipient, edit its existing row.' });
    }

    const resolved = await resolveContactEmailLabel(req.body);

    const created = await prisma.approval_role_contacts.create({
      data: {
        role,
        ...resolved,
        company_id: company_id ? parseInt(company_id, 10) : null,
        company_master_id: company_id ? null : parseInt(company_master_id, 10)
      }
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'A recipient for this role and company/holding group already exists.' });
    }
    next(err);
  }
}

// DELETE /approval-contacts/:id
async function deleteApprovalContact(req, res, next) {
  try {
    const { id } = req.params;
    const contact = await prisma.approval_role_contacts.findUnique({ where: { id: parseInt(id, 10) } });

    if (!contact) {
      return res.status(404).json({ error: 'Setting not found.' });
    }
    if (!contact.company_master_id && !contact.company_id) {
      return res.status(400).json({ error: 'General recipient rows cannot be deleted, only edited.' });
    }

    await prisma.approval_role_contacts.delete({ where: { id: parseInt(id, 10) } });
    res.json({ message: 'Specific recipient removed.' });
  } catch (err) {
    next(err);
  }
}

// ── Master Data Signer/Approver ─────────────────────────────────────────────

// GET /approval-signers
async function getSigners(req, res, next) {
  try {
    const signers = await prisma.m_approval_signer.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }], include: signerUsageInclude });
    res.json(await withSignerUsage(prisma, signers));
  } catch (err) { next(err); }
}

// POST /approval-signers
async function createSigner(req, res, next) {
  try {
    const { name, email, position } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 150 || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 150 || (position != null && (typeof position !== 'string' || position.trim().length > 100))) {
      return res.status(400).json({ error: 'Enter a valid approver name and email. Name/email can be up to 150 characters and position up to 100.' });
    }
    const duplicate = await prisma.m_approval_signer.findFirst({ where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } } });
    if (duplicate) return res.status(400).json({ error: 'This approver email is already registered.' });
    const created = await prisma.m_approval_signer.create({
      data: { name: name.trim(), email: normalizeEmail(email), position: position?.trim() || null }
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'This approver email is already registered.' });
    next(err);
  }
}

// PUT /approval-signers/:id
async function updateSigner(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, email, position, is_active } = req.body;
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid approver ID.' });
    if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 150)) || (email !== undefined && (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 150)) || (position != null && (typeof position !== 'string' || position.trim().length > 100)) || (is_active !== undefined && typeof is_active !== 'boolean')) {
      return res.status(400).json({ error: 'Invalid approver name, email, position or status.' });
    }
    const updated = await prisma.$transaction(async tx => {
      const existing = await tx.m_approval_signer.findUnique({ where: { id }, include: signerUsageInclude });
      if (!existing) throw Object.assign(new Error('Approver not found.'), { status: 404 });
      if (email !== undefined && normalizeEmail(email) !== normalizeEmail(existing.email)) {
        const [usage] = await withSignerUsage(tx, [existing]);
        // Changing an email-only snapshot identity would otherwise bypass the
        // transaction deletion guard. Names, positions and active status remain editable.
        if (usage.email_locked) throw Object.assign(new Error('An approver email that is already in use cannot be changed. Deactivate the old entry and add a new approver.'), { status: 409 });
        const duplicate = await tx.m_approval_signer.findFirst({ where: { id: { not: id }, email: { equals: normalizeEmail(email), mode: 'insensitive' } } });
        if (duplicate) throw Object.assign(new Error('This approver email is already registered.'), { status: 400 });
      }
      return tx.m_approval_signer.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          email: email !== undefined ? normalizeEmail(email) : undefined,
          position: position !== undefined ? (position?.trim() || null) : undefined,
          is_active,
        },
      });
    }, { isolationLevel: 'Serializable' });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2034') return res.status(409).json({ error: 'Data approver sedang berubah. Muat ulang dan coba kembali.' });
    if (err.code === 'P2002') return res.status(400).json({ error: 'This approver email is already registered.' });
    next(err);
  }
}

// DELETE /approval-signers/:id
async function deleteSigner(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid approver ID.' });
    await prisma.$transaction(async tx => {
      const signer = await tx.m_approval_signer.findUnique({ where: { id }, include: signerUsageInclude });
      if (!signer) throw Object.assign(new Error('Approver not found.'), { status: 404 });
      const [usage] = await withSignerUsage(tx, [signer]);
      if (!usage.can_delete) throw Object.assign(new Error(usage.delete_block_reason), { status: 409 });
      await tx.m_approval_signer.delete({ where: { id } });
    }, { isolationLevel: 'Serializable' });
    res.json({ message: 'Approver deleted.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2003') return res.status(409).json({ error: TRANSACTION_MESSAGE });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Approver not found.' });
    if (err.code === 'P2034') return res.status(409).json({ error: 'The approver is in use or has changed. Reload and try again.' });
    next(err);
  }
}

// POST /upload — simpan ke folder upload di server (UPLOAD_DIR), fallback ke database kalau disk gagal
async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const folder = req.body.folder || 'marketing';

    // 1. Simpan ke disk server (Proxmox)
    try {
      const relPath = saveUpload(buffer, originalname, folder);
      return res.json({
        success: true,
        source: 'server_storage',
        filename: originalname,
        mime_type: mimetype,
        url: publicUrl(req, relPath)
      });
    } catch (diskErr) {
      if (diskErr.status === 400) return res.status(400).json({ error: diskErr.message });
      console.warn('[upload] Gagal menyimpan ke disk, memakai database fallback:', diskErr.message);
    }

    // 2. Fallback: simpan di PostgreSQL jika disk server gagal
    const newAttachment = await prisma.attachments.create({
      data: {
        filename: originalname,
        mime_type: mimetype,
        data: buffer
      }
    });

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const url = `${protocol}://${host}/api/marketing/attachments/${newAttachment.id}`;

    res.json({
      success: true,
      source: 'database_fallback',
      id: newAttachment.id,
      filename: originalname,
      mime_type: mimetype,
      url: url
    });
  } catch (err) {
    next(err);
  }
}

// GET /attachments/:id
async function serveAttachment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const attachment = await prisma.attachments.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).send('Document not found.');
    }

    res.setHeader('Content-Type', attachment.mime_type);
    if (attachment.mime_type.startsWith('image/') || attachment.mime_type === 'application/pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    }
    res.send(attachment.data);
  } catch (err) {
    next(err);
  }
}

// ── Target branches & event locations ────────────────────────────────────────
// Usage is counted from plan items. Items of non-draft plans (pending, approved,
// completed, rejected) are history and lock deletion; items of draft plans can be
// released on delete after the user confirms.
const LOCKING_PLAN_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED'];
const cleanName = value => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

async function usageByField(field) {
  const [locked, draft] = await Promise.all([
    prisma.marketing_plan_items.groupBy({ by: [field], where: { [field]: { not: null }, marketing_plan: { status: { in: LOCKING_PLAN_STATUSES } } }, _count: { _all: true } }),
    prisma.marketing_plan_items.groupBy({ by: [field], where: { [field]: { not: null }, marketing_plan: { status: 'DRAFT' } }, _count: { _all: true } })
  ]);
  const map = new Map();
  for (const row of locked) map.set(row[field], { locked: row._count._all, draft: 0 });
  for (const row of draft) map.set(row[field], { locked: map.get(row[field])?.locked || 0, draft: row._count._all });
  return map;
}
const withUsage = (rows, usage) => rows.map(row => {
  const u = usage.get(row.id) || { locked: 0, draft: 0 };
  return { ...row, usage_locked: u.locked, usage_draft: u.draft, can_delete: u.locked === 0 };
});

// Shared delete: blocked by non-draft usage, otherwise releases draft references and
// deletes in one transaction. `confirm_draft=1` is required when drafts reference it.
async function deleteMasterLocation(req, res, { field, model, label }) {
  const id = parseInt(req.params.id, 10);
  const row = Number.isInteger(id) ? await prisma[model].findUnique({ where: { id } }) : null;
  if (!row) return res.status(404).json({ error: `${label} not found.` });

  const [lockedItem, draftCount] = await Promise.all([
    prisma.marketing_plan_items.findFirst({ where: { [field]: id, marketing_plan: { status: { in: LOCKING_PLAN_STATUSES } } }, include: { marketing_plan: { select: { title: true, fiscal_year: true, status: true } } } }),
    prisma.marketing_plan_items.count({ where: { [field]: id, marketing_plan: { status: 'DRAFT' } } })
  ]);
  if (lockedItem) {
    const plan = lockedItem.marketing_plan;
    return res.status(409).json({ error: `${label} "${row.name}" cannot be deleted because it is used in plan "${plan?.title}" (FY ${plan?.fiscal_year}, ${plan?.status}). Rename it if needed.` });
  }
  if (draftCount > 0 && req.query.confirm_draft !== '1') {
    return res.status(409).json({ error: `${label} "${row.name}" is used in ${draftCount} Draft plan item(s). Confirm to clear those references and delete it.`, draft_items: draftCount, needs_confirmation: true });
  }

  await prisma.$transaction([
    prisma.marketing_plan_items.updateMany({ where: { [field]: id, marketing_plan: { status: 'DRAFT' } }, data: { [field]: null } }),
    prisma[model].delete({ where: { id } })
  ]);
  res.status(204).end();
}

const BRANCH_INCLUDE = {
  m_company: { select: { id: true, name: true, code: true } },
  m_brand: { select: { id: true, name: true } }
};

// Validates name and the company/brand pair; returns { data } or { error }.
async function parseBranchInput(body) {
  const name = cleanName(body.name);
  if (!name) return { error: 'Branch name is required.' };
  if (name.length > 100) return { error: 'Nama cabang maksimal 100 karakter.' };
  const companyId = body.company_id ? parseInt(body.company_id, 10) : null;
  const brandId = body.brand_id ? parseInt(body.brand_id, 10) : null;
  if (companyId) {
    const company = await prisma.m_company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) return { error: 'Company not found.' };
  }
  if (brandId) {
    const brand = await prisma.m_brand.findUnique({ where: { id: brandId }, select: { id: true, company_id: true } });
    if (!brand) return { error: 'Brand not found.' };
    if (companyId && brand.company_id && brand.company_id !== companyId) return { error: 'Brand yang dipilih bukan milik PT tersebut.' };
    // A brand implies its company even when the PT was left empty.
    return { data: { name, company_id: companyId || brand.company_id || null, brand_id: brandId } };
  }
  return { data: { name, company_id: companyId, brand_id: null } };
}

// GET /branches
async function getBranches(req, res, next) {
  try {
    const { company_id, brand_id } = req.query;
    const where = {};
    if (company_id) where.company_id = parseInt(company_id, 10);
    if (brand_id) where.brand_id = parseInt(brand_id, 10);

    const [branches, usage] = await Promise.all([
      prisma.m_branch.findMany({ where, orderBy: { name: 'asc' }, include: BRANCH_INCLUDE }),
      usageByField('branch_id')
    ]);
    res.json(withUsage(branches, usage));
  } catch (err) {
    next(err);
  }
}

async function findDuplicateBranch(data, excludeId) {
  return prisma.m_branch.findFirst({
    where: {
      name: { equals: data.name, mode: 'insensitive' },
      company_id: data.company_id,
      brand_id: data.brand_id,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });
}

// POST /branches
async function createBranch(req, res, next) {
  try {
    const parsed = await parseBranchInput(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (await findDuplicateBranch(parsed.data)) {
      return res.status(400).json({ error: 'A branch with this name already exists for that company & brand.' });
    }
    const branch = await prisma.m_branch.create({ data: parsed.data, include: BRANCH_INCLUDE });
    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
}

// PUT /branches/:id
async function updateBranch(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const current = Number.isInteger(id) ? await prisma.m_branch.findUnique({ where: { id } }) : null;
    if (!current) return res.status(404).json({ error: 'Branch not found.' });

    const body = req.body || {};
    const parsed = await parseBranchInput({
      name: body.name,
      company_id: body.company_id !== undefined ? body.company_id : current.company_id,
      brand_id: body.brand_id !== undefined ? body.brand_id : current.brand_id
    });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (await findDuplicateBranch(parsed.data, id)) {
      return res.status(400).json({ error: 'A branch with this name already exists for that company & brand.' });
    }
    const branch = await prisma.m_branch.update({ where: { id }, data: parsed.data, include: BRANCH_INCLUDE });
    res.json(branch);
  } catch (err) {
    next(err);
  }
}

// DELETE /branches/:id
async function deleteBranch(req, res, next) {
  try {
    await deleteMasterLocation(req, res, { field: 'branch_id', model: 'm_branch', label: 'Branch' });
  } catch (err) {
    next(err);
  }
}

// GET /event-locations
async function getEventLocations(req, res, next) {
  try {
    const [locations, usage] = await Promise.all([
      prisma.m_event_location.findMany({ orderBy: { name: 'asc' } }),
      usageByField('event_location_id')
    ]);
    res.json(withUsage(locations, usage));
  } catch (err) {
    next(err);
  }
}

function parseEventLocationName(body) {
  const name = cleanName(body?.name);
  if (!name) return { error: 'Event location name is required.' };
  if (name.length > 100) return { error: 'Nama lokasi event maksimal 100 karakter.' };
  return { name };
}

// POST /event-locations
async function createEventLocation(req, res, next) {
  try {
    const parsed = parseEventLocationName(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const existing = await prisma.m_event_location.findFirst({ where: { name: { equals: parsed.name, mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ error: `Event location "${existing.name}" already exists.` });

    const location = await prisma.m_event_location.create({ data: { name: parsed.name } });
    res.status(201).json(location);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'An event location with this name already exists.' });
    next(err);
  }
}

// PUT /event-locations/:id
async function updateEventLocation(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = parseEventLocationName(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const current = Number.isInteger(id) ? await prisma.m_event_location.findUnique({ where: { id } }) : null;
    if (!current) return res.status(404).json({ error: 'Event location not found.' });

    const existing = await prisma.m_event_location.findFirst({ where: { name: { equals: parsed.name, mode: 'insensitive' }, NOT: { id } } });
    if (existing) return res.status(400).json({ error: `Event location "${existing.name}" already exists.` });

    const location = await prisma.m_event_location.update({ where: { id }, data: { name: parsed.name } });
    res.json(location);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'An event location with this name already exists.' });
    next(err);
  }
}

// DELETE /event-locations/:id
async function deleteEventLocation(req, res, next) {
  try {
    await deleteMasterLocation(req, res, { field: 'event_location_id', model: 'm_event_location', label: 'Event location' });
  } catch (err) {
    next(err);
  }
}

// ── Budget control helpers ────────────────────────────────────────────────────
const COMMITTED_PLAN_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED'];
const budgetInScope = (req, companyId) => req.companyScope?.all || (req.companyScope?.companyIds || []).includes(companyId);
const toMoney = value => Math.round(Number(value || 0) * 100) / 100;

// Loads a budget the caller may access; responds 404 otherwise (no existence leak).
async function findScopedBudget(req, res, id, include) {
  const budget = Number.isInteger(id) ? await prisma.m_marketing_budget.findUnique({ where: { id }, include }) : null;
  if (!budget || !budgetInScope(req, budget.company_id)) {
    res.status(404).json({ error: 'Budget control not found.' });
    return null;
  }
  return budget;
}

// Committed (plan items of submitted/approved/completed plans) and actual per month
// for one company + brand + LOB + fiscal year.
async function computeMonthlyUsage(db, { company_id, brand_id, lob_id, fiscal_year }) {
  const plans = await db.marketing_plans.findMany({
    where: { company_id, fiscal_year, status: { notIn: ['REJECTED'] } },
    include: { items: true, creator: { select: { id: true, name: true } } },
    orderBy: { created_at: 'desc' }
  });
  const committed = Array(12).fill(0);
  const actual = Array(12).fill(0);
  for (const plan of plans) {
    const inCommitted = COMMITTED_PLAN_STATUSES.includes(plan.status);
    for (const item of plan.items) {
      if (item.brand_id !== brand_id || item.lob_id !== lob_id) continue;
      const m = item.period_month - 1;
      if (m < 0 || m > 11) continue;
      if (inCommitted) committed[m] += parseFloat(item.budget_amount || 0);
      actual[m] += parseFloat(item.actual_amount || 0);
    }
  }
  return { plans, committed, actual };
}

// Split an annual total into 12 whole-rupiah months; the remainder goes to December
// so the months always add up exactly to the total.
function splitEvenly(total) {
  const base = Math.floor(total / 12);
  return Array.from({ length: 12 }, (_, i) => ({ period_month: i + 1, budget_limit: i === 11 ? toMoney(total - base * 11) : base }));
}

// A month can be closed only after it has ended.
const monthHasEnded = (fiscalYear, month) => new Date() >= new Date(fiscalYear, month, 1);

// GET /budgets
async function getBudgets(req, res, next) {
  try {
    const { company_id, brand_id, lob_id, fiscal_year } = req.query;
    const where = {};
    if (company_id) {
      const cid = parseInt(company_id, 10);
      if (!budgetInScope(req, cid)) return res.json([]);
      where.company_id = cid;
    } else if (!req.companyScope?.all) {
      where.company_id = { in: req.companyScope?.companyIds || [] };
    }
    if (brand_id) where.brand_id = parseInt(brand_id, 10);
    if (lob_id) where.lob_id = parseInt(lob_id, 10);
    if (fiscal_year) where.fiscal_year = parseInt(fiscal_year, 10);

    const budgets = await prisma.m_marketing_budget.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        lob: { select: { id: true, name: true } },
        monthly_limits: { orderBy: { period_month: 'asc' } }
      },
      orderBy: { fiscal_year: 'desc' }
    });

    res.json(budgets);
  } catch (err) {
    next(err);
  }
}

// GET /budgets/check
async function checkBudgetAvailability(req, res, next) {
  try {
    const company_id = parseInt(req.query.company_id, 10);
    const brand_id = parseInt(req.query.brand_id, 10);
    const lob_id = parseInt(req.query.lob_id, 10);
    const fiscal_year = parseInt(req.query.fiscal_year, 10);

    if (!company_id || !brand_id || !lob_id || !fiscal_year) {
      return res.status(400).json({ error: 'company_id, brand_id, lob_id and fiscal_year are required.' });
    }

    if (!budgetInScope(req, company_id)) {
      return res.status(403).json({ error: 'Company outside your access scope.' });
    }

    const [budget, usage] = await Promise.all([
      prisma.m_marketing_budget.findUnique({
        where: { company_id_brand_id_lob_id_fiscal_year: { company_id, brand_id, lob_id, fiscal_year } },
        include: { monthly_limits: true, shifts: { where: { status: 'PENDING' }, select: { amount: true, from_monthly_id: true, to_monthly_id: true } } }
      }),
      computeMonthlyUsage(prisma, { company_id, brand_id, lob_id, fiscal_year })
    ]);
    const allPlans = usage.plans;
    const monthlyCommitted = usage.committed;
    const monthlyActual = usage.actual;

    const result = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const limitObj = budget ? budget.monthly_limits.find(ml => ml.period_month === monthNum) : null;
      const budgetLimit = limitObj ? parseFloat(limitObj.budget_limit || 0) : 0;
      const committed = monthlyCommitted[i];
      const actual = monthlyActual[i];
      const isClosed = limitObj ? !!limitObj.is_closed : false;
      const quarterNum = Math.ceil(monthNum / 3);

      return {
        id: limitObj ? limitObj.id : null,
        month: monthNum,
        quarter: quarterNum,
        limit: budgetLimit,
        committed,
        actual,
        // Negative available = over-committed; kept signed so overruns stay visible.
        available: isClosed ? 0 : toMoney(budgetLimit - committed),
        over_committed: committed > budgetLimit,
        unspent: Math.max(0, toMoney(budgetLimit - Math.max(committed, actual))),
        pending_shift_out: limitObj ? budget.shifts.filter(sh => sh.from_monthly_id === limitObj.id).reduce((sum, sh) => sum + Number(sh.amount), 0) : 0,
        pending_shift_in: limitObj ? budget.shifts.filter(sh => sh.to_monthly_id === limitObj.id).reduce((sum, sh) => sum + Number(sh.amount), 0) : 0,
        is_locked: budget ? budget.is_locked : false,
        is_closed: isClosed,
        closed_at: limitObj ? limitObj.closed_at : null,
        closed_by: limitObj ? limitObj.closed_by : null
      };
    });

    // Quarterly aggregates & deadlines according to COO rules
    const todayStr = new Date().toISOString().split('T')[0];

    const quarterly = quarterConfigs(fiscal_year).map(qc => {
      const qMonths = result.filter(r => qc.months.includes(r.month));
      const total_limit = qMonths.reduce((sum, m) => sum + m.limit, 0);
      const total_committed = qMonths.reduce((sum, m) => sum + m.committed, 0);
      const total_actual = qMonths.reduce((sum, m) => sum + m.actual, 0);
      const total_available = qMonths.reduce((sum, m) => sum + m.available, 0);
      const is_all_closed = qMonths.length > 0 && qMonths.every(m => m.is_closed);
      const is_deadline_passed = todayStr > qc.deadline;

      return {
        ...qc,
        total_limit,
        total_committed,
        total_actual,
        total_available,
        is_all_closed,
        is_deadline_passed
      };
    });

    // Rencana yang punya minimal 1 item matching brand/lob ini
    const related_plans = allPlans
      .filter(p => p.items.some(item => item.brand_id === brand_id && item.lob_id === lob_id))
      .map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        total_budget: parseFloat(p.total_budget || 0),
        start_date: p.start_date,
        end_date: p.end_date,
        creator: p.creator
      }));

    res.json({
      id: budget ? budget.id : null,
      is_locked: budget ? budget.is_locked : false,
      total_budget: budget ? parseFloat(budget.total_budget || 0) : 0,
      monthly: result,
      quarterly,
      related_plans
    });
  } catch (err) {
    next(err);
  }
}

// GET /budgets/:id
async function getBudgetDetail(req, res, next) {
  try {
    const budget = await findScopedBudget(req, res, parseInt(req.params.id, 10), {
      company: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      lob: { select: { id: true, name: true } },
      monthly_limits: { orderBy: { period_month: 'asc' } }
    });
    if (!budget) return;
    res.json(budget);
  } catch (err) {
    next(err);
  }
}

// POST /budgets
async function createBudget(req, res, next) {
  try {
    const { company_id, brand_id, lob_id, fiscal_year, total_budget, monthly_limits } = req.body;

    if (!company_id || !brand_id || !lob_id || !fiscal_year) {
      return res.status(400).json({ error: 'Company, brand, LOB and fiscal year are required.' });
    }
    if (!budgetInScope(req, parseInt(company_id, 10))) {
      return res.status(403).json({ error: 'Company outside your access scope.' });
    }
    const annual = toMoney(total_budget);
    if (!Number.isFinite(annual) || annual < 0) return res.status(400).json({ error: 'Invalid annual cap.' });
    const providedMonths = Array.isArray(monthly_limits) && monthly_limits.length ? monthly_limits : null;
    if (providedMonths && providedMonths.some(ml => !Number.isFinite(Number(ml.budget_limit)) || Number(ml.budget_limit) < 0)) {
      return res.status(400).json({ error: 'Monthly limits cannot be negative.' });
    }
    const months = providedMonths
      ? Array.from({ length: 12 }, (_, i) => ({ period_month: i + 1, budget_limit: toMoney(providedMonths.find(ml => Number(ml.period_month) === i + 1)?.budget_limit) }))
      : splitEvenly(annual);
    const annualTotal = toMoney(months.reduce((sum, m) => sum + m.budget_limit, 0));

    const existing = await prisma.m_marketing_budget.findUnique({
      where: {
        company_id_brand_id_lob_id_fiscal_year: {
          company_id: parseInt(company_id, 10),
          brand_id: parseInt(brand_id, 10),
          lob_id: parseInt(lob_id, 10),
          fiscal_year: parseInt(fiscal_year, 10)
        }
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'A budget for this company, brand, LOB and fiscal year already exists.' });
    }

    const budget = await prisma.$transaction(async (tx) => {
      const bHeader = await tx.m_marketing_budget.create({
        data: {
          company_id: parseInt(company_id, 10),
          brand_id: parseInt(brand_id, 10),
          lob_id: parseInt(lob_id, 10),
          fiscal_year: parseInt(fiscal_year, 10),
          total_budget: annualTotal
        }
      });

      const monthlyData = months.map(m => ({ marketing_budget_id: bHeader.id, period_month: m.period_month, budget_limit: m.budget_limit }));

      await tx.m_marketing_budget_monthly.createMany({
        data: monthlyData
      });

      return bHeader;
    });

    res.status(201).json(budget);
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id
async function updateBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { monthly_limits } = req.body;
    const existing = await findScopedBudget(req, res, id, { monthly_limits: true });
    if (!existing) return;
    if (existing.is_locked) {
      return res.status(400).json({ error: 'Anggaran telah dikunci (Locked). Buka kunci terlebih dahulu untuk mengubah.' });
    }
    if (!Array.isArray(monthly_limits) || !monthly_limits.length) {
      return res.status(400).json({ error: 'Monthly limits are required.' });
    }

    const current = new Map(existing.monthly_limits.map(m => [m.period_month, m]));
    const changes = [];
    for (const ml of monthly_limits) {
      const month = Number(ml.period_month);
      const value = toMoney(ml.budget_limit);
      if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'Invalid month number (1-12).' });
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Monthly limits cannot be negative.' });
      const row = current.get(month);
      if (row && toMoney(row.budget_limit) === value) continue;
      if (row?.is_closed) return res.status(400).json({ error: `Month ${month} is already closed; its limit cannot be changed.` });
      changes.push({ month, value });
    }

    const nextLimits = new Map(existing.monthly_limits.map(m => [m.period_month, toMoney(m.budget_limit)]));
    for (const c of changes) nextLimits.set(c.month, c.value);
    const annualTotal = toMoney([...nextLimits.values()].reduce((sum, v) => sum + v, 0));

    const updated = await prisma.$transaction(async (tx) => {
      for (const c of changes) {
        await tx.m_marketing_budget_monthly.upsert({
          where: { marketing_budget_id_period_month: { marketing_budget_id: id, period_month: c.month } },
          update: { budget_limit: c.value },
          create: { marketing_budget_id: id, period_month: c.month, budget_limit: c.value }
        });
      }
      return tx.m_marketing_budget.update({
        where: { id },
        data: {
          total_budget: annualTotal,
          updated_at: new Date(),
          // Allocation changed after Finance validation -> needs validating again.
          ...(changes.length && existing.validation_status === 'VALIDATED'
            ? { validation_status: 'DRAFT', validated_at: null, validated_by: null, validation_note: null }
            : {})
        }
      });
    });

    res.json({ ...updated, changed_months: changes.map(c => c.month) });
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id/validate — Finance memvalidasi cap tahunan (syarat sebelum dikunci)
async function validateBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await findScopedBudget(req, res, id, { monthly_limits: true });
    if (!existing) return;
    if (existing.validation_status === 'VALIDATED') return res.status(400).json({ error: 'This budget is already validated by Finance.' });
    const monthlySum = existing.monthly_limits.reduce((s, m) => s + parseFloat(m.budget_limit || 0), 0);
    if (monthlySum <= 0) return res.status(400).json({ error: 'Isi alokasi bulanan terlebih dahulu sebelum divalidasi.' });

    const updated = await prisma.m_marketing_budget.update({
      where: { id },
      data: {
        validation_status: 'VALIDATED',
        validated_at: new Date(),
        validated_by: req.user?.full_name || req.user?.email || 'Finance',
        validation_note: req.body?.note ? String(req.body.note).trim() || null : null,
        updated_at: new Date()
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id/lock
async function lockBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await findScopedBudget(req, res, id);
    if (!existing) return;
    if (existing.validation_status !== 'VALIDATED') {
      return res.status(400).json({ error: 'The budget must be validated by Finance before it can be locked.' });
    }
    const updated = await prisma.m_marketing_budget.update({
      where: { id },
      data: {
        is_locked: true,
        locked_at: new Date(),
        locked_by: req.user?.id ? String(req.user.id) : 'admin'
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /budgets/:id/unlock
async function unlockBudget(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!(await findScopedBudget(req, res, id))) return;
    const updated = await prisma.m_marketing_budget.update({
      where: { id },
      data: {
        is_locked: false,
        locked_at: null,
        locked_by: null
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ── Month-End Closing & Reopen ───────────────────────────────────────────────

// POST /budgets/:id/close-month
async function closeMonth(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { period_month } = req.body;
    const month = parseInt(period_month, 10);

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month number (1-12).' });
    }
    const budget = await findScopedBudget(req, res, id);
    if (!budget) return;
    if (!monthHasEnded(budget.fiscal_year, month)) {
      return res.status(400).json({ error: 'This month has not ended yet; it can only be closed after the month ends.' });
    }

    const monthlyRecord = await prisma.m_marketing_budget_monthly.findUnique({
      where: {
        marketing_budget_id_period_month: {
          marketing_budget_id: id,
          period_month: month
        }
      }
    });

    if (!monthlyRecord) {
      return res.status(404).json({ error: 'Monthly allocation not found.' });
    }
    if (monthlyRecord.is_closed) return res.status(400).json({ error: 'This month is already closed.' });

    const updated = await prisma.m_marketing_budget_monthly.update({
      where: { id: monthlyRecord.id },
      data: {
        is_closed: true,
        closed_at: new Date(),
        closed_by: req.user?.email || req.user?.name || 'Finance/Admin'
      }
    });

    res.json({ message: `Month ${month} closed.`, data: updated });
  } catch (err) {
    next(err);
  }
}

// POST /budgets/:id/reopen-month
async function reopenMonth(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { period_month } = req.body;
    const month = parseInt(period_month, 10);

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month number (1-12).' });
    }
    if (!(await findScopedBudget(req, res, id))) return;

    const monthlyRecord = await prisma.m_marketing_budget_monthly.findUnique({
      where: {
        marketing_budget_id_period_month: {
          marketing_budget_id: id,
          period_month: month
        }
      }
    });

    if (!monthlyRecord) {
      return res.status(404).json({ error: 'Monthly allocation not found.' });
    }

    const updated = await prisma.m_marketing_budget_monthly.update({
      where: { id: monthlyRecord.id },
      data: {
        is_closed: false,
        closed_at: null,
        closed_by: null
      }
    });

    res.json({ message: `Month ${month} reopened.`, data: updated });
  } catch (err) {
    next(err);
  }
}

// ── Budget Shifting (Relokasi Anggaran) ───────────────────────────────────────

// GET /budgets/:id/shifts
async function getBudgetShifts(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!(await findScopedBudget(req, res, id))) return;
    const shifts = await prisma.m_marketing_budget_shift.findMany({
      where: { marketing_budget_id: id },
      include: {
        from_monthly: true,
        to_monthly: true,
        approvers: { orderBy: { step_number: 'asc' } },
        creator: { select: { id: true, name: true, email: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(shifts);
  } catch (err) {
    next(err);
  }
}

// Shift approvers use the same role contacts as the other approval flows.
const SHIFT_ROLES = { FC: 'FINANCE_CONTROLLER', HEAD: 'MARKETING_MANAGER' };
const LEGACY_SHIFT_ROLES = { FC: 'FINANCE_CONTROLLER', HEAD_MARKETING: 'MARKETING_MANAGER' };

// POST /budgets/:id/shifts
async function createBudgetShift(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { from_month, to_month, amount, reason } = req.body;
    const fromM = parseInt(from_month, 10);
    const toM = parseInt(to_month, 10);
    const shiftAmt = parseFloat(amount);

    if (!fromM || !toM || fromM === toM || fromM < 1 || fromM > 12 || toM < 1 || toM > 12) {
      return res.status(400).json({ error: 'Source and target months must be valid (1-12) and different.' });
    }
    if (!shiftAmt || shiftAmt <= 0) {
      return res.status(400).json({ error: 'The shift amount must be greater than 0.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A reason for the budget shift is required.' });
    }

    const budget = await findScopedBudget(req, res, id, {
      monthly_limits: true,
      company: { select: { company_master_id: true } },
      shifts: { where: { status: 'PENDING' }, select: { amount: true, from_monthly_id: true } }
    });
    if (!budget) return;

    const fromMonthly = budget.monthly_limits.find(m => m.period_month === fromM);
    const toMonthly = budget.monthly_limits.find(m => m.period_month === toM);

    if (!fromMonthly || !toMonthly) {
      return res.status(404).json({ error: 'Source or target month allocation not found.' });
    }

    if (fromMonthly.is_closed) {
      return res.status(400).json({ error: 'Bulan asal telah ditutup buku (closed period).' });
    }
    if (toMonthly.is_closed) {
      return res.status(400).json({ error: 'Bulan tujuan telah ditutup buku (closed period).' });
    }

    // Only free budget can move: limit - committed plans - other pending shifts out.
    const usage = await computeMonthlyUsage(prisma, budget);
    const pendingOut = budget.shifts.filter(sh => sh.from_monthly_id === fromMonthly.id).reduce((sum, sh) => sum + Number(sh.amount), 0);
    const freeFrom = toMoney(Number(fromMonthly.budget_limit) - usage.committed[fromM - 1] - pendingOut);
    if (shiftAmt > freeFrom) {
      return res.status(400).json({ error: `The source month only has Rp ${Math.max(0, freeFrom).toLocaleString('id-ID')} free (after committed plans and pending shifts).` });
    }

    // Determine shift type: Intra-Quarter vs Cross-Quarter
    const fromQ = Math.ceil(fromM / 3);
    const toQ = Math.ceil(toM / 3);
    const isIntra = fromQ === toQ;
    const shift_type = isIntra ? 'INTRA_QUARTER' : 'CROSS_QUARTER';

    // Fetch contacts for FC and HEAD_MARKETING from approval_role_contacts
    // Same recipient resolution as the other approvals: PT > holding > general.
    const masterId = budget.company?.company_master_id || null;
    const [fcContact, headContact] = await Promise.all([
      resolveApproverContact(prisma, SHIFT_ROLES.FC, budget.company_id, masterId),
      isIntra ? null : resolveApproverContact(prisma, SHIFT_ROLES.HEAD, budget.company_id, masterId)
    ]);
    if (!fcContact || (!isIntra && !headContact)) {
      return res.status(400).json({ error: `No ${!fcContact ? 'Finance Controller' : 'Marketing Manager'} approval recipient is set for this company. Set it in Approval Settings > Automatic Recipients.` });
    }

    const fcEmail = fcContact.email;
    const fcName = fcContact.label || 'Finance Controller';
    const headEmail = headContact?.email;
    const headName = headContact?.label || 'Marketing Manager';

    // Resolve creator ID dari Master Signer (m_approval_signer)
    const signer = req.user?.email ? await resolveEmployee(req.user.email) : null;
    if (!signer) {
      return res.status(403).json({ error: 'Your email is not registered as a Master Signer.' });
    }
    const creatorId = signer.id;

    // Create Shift Record & Sequential Approvers in transaction
    const newShift = await prisma.$transaction(async (tx) => {
      const shift = await tx.m_marketing_budget_shift.create({
        data: {
          marketing_budget_id: id,
          from_monthly_id: fromMonthly.id,
          to_monthly_id: toMonthly.id,
          amount: shiftAmt,
          reason: reason.trim(),
          shift_type,
          status: 'PENDING',
          current_step: 1,
          total_steps: isIntra ? 1 : 2,
          creator_id: creatorId
        }
      });

      if (isIntra) {
        // Step 1: FC (PENDING)
        await tx.m_marketing_budget_shift_approver.create({
          data: {
            shift_id: shift.id,
            step_number: 1,
            approver_role: SHIFT_ROLES.FC,
            approver_name: fcName,
            approver_email: fcEmail,
            status: 'PENDING'
          }
        });
      } else {
        // Step 1: Head of Marketing (PENDING)
        await tx.m_marketing_budget_shift_approver.create({
          data: {
            shift_id: shift.id,
            step_number: 1,
            approver_role: SHIFT_ROLES.HEAD,
            approver_name: headName,
            approver_email: headEmail,
            status: 'PENDING'
          }
        });
        // Step 2: FC (WAITING)
        await tx.m_marketing_budget_shift_approver.create({
          data: {
            shift_id: shift.id,
            step_number: 2,
            approver_role: SHIFT_ROLES.FC,
            approver_name: fcName,
            approver_email: fcEmail,
            status: 'WAITING'
          }
        });
      }

      return shift;
    });

    res.status(201).json(newShift);
  } catch (err) {
    next(err);
  }
}

// POST /budgets/shifts/:shift_id/decision
async function processShiftDecision(req, res, next) {
  try {
    const shiftId = parseInt(req.params.shift_id, 10);
    const { action, comment } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }

    const shift = await prisma.m_marketing_budget_shift.findUnique({
      where: { id: shiftId },
      include: {
        approvers: { orderBy: { step_number: 'asc' } },
        from_monthly: true,
        to_monthly: true
      }
    });

    const shiftBudget = shift ? await prisma.m_marketing_budget.findUnique({ where: { id: shift.marketing_budget_id }, select: { company_id: true } }) : null;
    if (!shift || !shiftBudget) {
      return res.status(404).json({ error: 'Budget shift request not found.' });
    }

    if (shift.status !== 'PENDING') {
      return res.status(400).json({ error: `The request is already ${shift.status}.` });
    }

    const currentApprover = shift.approvers.find(a => a.step_number === shift.current_step && a.status === 'PENDING');

    if (!currentApprover) {
      return res.status(400).json({ error: 'No approver is waiting to act.' });
    }

    // The assigned approver is identified by email (login roles never equal FC/MM);
    // admin may act on any step.
    // MARKETING_MANAGER steps are decided by the assigned email, not by the login role of the same name.
    const userRoles = rolesOf(req).map(r => r.toUpperCase()).filter(r => r !== 'MARKETING_MANAGER');
    const isAdminUser = userRoles.includes('ADMIN');
    const stepRole = LEGACY_SHIFT_ROLES[currentApprover.approver_role] || currentApprover.approver_role;
    const isAssigned = String(currentApprover.approver_email || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isAdminUser && !isAssigned && !budgetInScope(req, shiftBudget.company_id)) {
      return res.status(404).json({ error: 'Budget shift request not found.' });
    }
    if (!isAdminUser && !isAssigned && !userRoles.includes(stepRole.toUpperCase())) {
      return res.status(403).json({ error: 'You are not authorized to act on this approval step.' });
    }
    if (action === 'REJECT' && !String(comment || '').trim()) {
      return res.status(400).json({ error: 'A reason is required to reject.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'REJECT') {
        await tx.m_marketing_budget_shift_approver.update({
          where: { id: currentApprover.id },
          data: {
            status: 'REJECTED',
            action_at: new Date(),
            comment: comment || null
          }
        });

        return await tx.m_marketing_budget_shift.update({
          where: { id: shiftId },
          data: { status: 'REJECTED' }
        });
      }

      // Action is APPROVE
      await tx.m_marketing_budget_shift_approver.update({
        where: { id: currentApprover.id },
        data: {
          status: 'APPROVED',
          action_at: new Date(),
          comment: comment || null
        }
      });

      // Check if more steps exist
      const nextApprover = shift.approvers.find(a => a.step_number === shift.current_step + 1);
      if (nextApprover) {
        // Promote to next step
        await tx.m_marketing_budget_shift_approver.update({
          where: { id: nextApprover.id },
          data: { status: 'PENDING' }
        });

        return await tx.m_marketing_budget_shift.update({
          where: { id: shiftId },
          data: { current_step: shift.current_step + 1 }
        });
      }

      // Final step approved -> re-check the months, then move the balance atomically.
      const shiftAmount = parseFloat(shift.amount);
      const [fromNow, toNow] = await Promise.all([
        tx.m_marketing_budget_monthly.findUnique({ where: { id: shift.from_monthly_id } }),
        tx.m_marketing_budget_monthly.findUnique({ where: { id: shift.to_monthly_id } })
      ]);
      if (fromNow.is_closed || toNow.is_closed) {
        throw Object.assign(new Error('The source or target month is closed; the shift cannot be executed.'), { status: 400 });
      }
      if (Number(fromNow.budget_limit) < shiftAmount) {
        throw Object.assign(new Error('The source month limit is no longer enough for this shift.'), { status: 400 });
      }
      await tx.m_marketing_budget_monthly.update({
        where: { id: shift.from_monthly_id },
        data: {
          budget_limit: { decrement: shiftAmount }
        }
      });

      await tx.m_marketing_budget_monthly.update({
        where: { id: shift.to_monthly_id },
        data: {
          budget_limit: { increment: shiftAmount }
        }
      });

      return await tx.m_marketing_budget_shift.update({
        where: { id: shiftId },
        data: { status: 'APPROVED' }
      });
    });

    res.json({ message: `Budget shift ${action === "APPROVE" ? "approved" : "rejected"}.`, data: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// ── Approval Rules CRUD ───────────────────────────────────────────────────────

// GET /approval-rules
async function getApprovalRules(req, res, next) {
  try {
    const rules = await prisma.approval_rules.findMany({
      orderBy: [{ module: 'asc' }, { company_master_id: 'asc' }, { company_id: 'asc' }, { min_amount: 'asc' }, { step_number: 'asc' }]
    });
    res.json(rules);
  } catch (err) { next(err); }
}

// Validates a tier step. Scope: company_id (one company) OR company_master_id (holding) OR neither (general).
async function cleanRule(body, current = {}) {
  const pick = key => (body[key] !== undefined ? body[key] : current[key]);
  const module = pick('module');
  if (!['MARKETING_PLAN', 'PAYMENT_REQUEST'].includes(module)) throw Object.assign(new Error('module must be MARKETING_PLAN or PAYMENT_REQUEST.'), { status: 400 });
  const step = parseInt(pick('step_number'), 10);
  if (!Number.isInteger(step) || step < 1 || step > 10) throw Object.assign(new Error('Step must be between 1 and 10.'), { status: 400 });
  const role = String(pick('approver_role') || '').trim().toUpperCase();
  if (!role || role.length > 50) throw Object.assign(new Error('Select an approver role.'), { status: 400 });
  const rawMin = pick('min_amount');
  const rawMax = pick('max_amount');
  const min = rawMin === undefined || rawMin === null || rawMin === '' ? 0 : Number(rawMin);
  const max = rawMax === undefined || rawMax === null || rawMax === '' ? null : Number(rawMax);
  if (!Number.isFinite(min) || min < 0 || (max !== null && (!Number.isFinite(max) || max < min))) {
    throw Object.assign(new Error('Amounts must be 0 or more, and the maximum cannot be below the minimum.'), { status: 400 });
  }
  const companyId = pick('company_id') ? parseInt(pick('company_id'), 10) : null;
  const masterId = companyId ? null : (pick('company_master_id') ? parseInt(pick('company_master_id'), 10) : null);
  if (companyId && !(await prisma.m_company.findUnique({ where: { id: companyId }, select: { id: true } }))) throw Object.assign(new Error('Company not found.'), { status: 400 });
  if (masterId && !(await prisma.m_company_master.findUnique({ where: { id: masterId }, select: { id: true } }))) throw Object.assign(new Error('Holding group not found.'), { status: 400 });
  return { module, step_number: step, approver_role: role, min_amount: min, max_amount: max, company_id: companyId, company_master_id: masterId };
}

// The same step cannot be defined twice for the same scope and amount range.
async function assertNoDuplicateStep(data, excludeId = null) {
  const clash = await prisma.approval_rules.findFirst({
    where: {
      module: data.module, step_number: data.step_number, company_id: data.company_id, company_master_id: data.company_master_id,
      min_amount: data.min_amount, max_amount: data.max_amount,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });
  if (clash) throw Object.assign(new Error(`Step ${data.step_number} already exists for this range and scope.`), { status: 400 });
}

// POST /approval-rules
async function createApprovalRule(req, res, next) {
  try {
    const data = await cleanRule(req.body || {});
    await assertNoDuplicateStep(data);
    const rule = await prisma.approval_rules.create({ data });
    res.status(201).json(rule);
  } catch (err) { next(err); }
}

// PUT /approval-rules/:id
async function updateApprovalRule(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const rule = Number.isInteger(id) ? await prisma.approval_rules.findUnique({ where: { id } }) : null;
    if (!rule) return res.status(404).json({ error: 'Approval rule not found.' });
    const body = { ...(req.body || {}) };
    // Switching scope: choosing a company clears the holding and the other way round.
    if (body.company_id !== undefined && body.company_master_id === undefined) body.company_master_id = null;
    if (body.company_master_id !== undefined && body.company_id === undefined) body.company_id = null;
    const data = await cleanRule(body, rule);
    await assertNoDuplicateStep(data, id);
    const updated = await prisma.approval_rules.update({ where: { id }, data });
    res.json(updated);
  } catch (err) { next(err); }
}

// DELETE /approval-rules/:id
async function deleteApprovalRule(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const rule = await prisma.approval_rules.findUnique({ where: { id } });
    if (!rule) return res.status(404).json({ error: 'Approval rule not found.' });
    await prisma.approval_rules.delete({ where: { id } });
    res.json({ message: 'Approval rule deleted.' });
  } catch (err) { next(err); }
}

module.exports = {
  getMetadata,
  getApprovalContacts,
  updateApprovalContact,
  createApprovalContact,
  deleteApprovalContact,
  getSigners,
  createSigner,
  updateSigner,
  deleteSigner,
  uploadAttachment,
  serveAttachment,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getEventLocations,
  createEventLocation,
  updateEventLocation,
  deleteEventLocation,
  getBudgets,
  checkBudgetAvailability,
  getBudgetDetail,
  createBudget,
  updateBudget,
  validateBudget,
  lockBudget,
  unlockBudget,
  closeMonth,
  reopenMonth,
  getBudgetShifts,
  createBudgetShift,
  processShiftDecision,
  getApprovalRules,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule
};
