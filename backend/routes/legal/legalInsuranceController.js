const prisma = require('../../api/db');

// Insurance policies (GA / Legal). In the data, `insurance_type` is the line of insurance
// (Vehicle, Building, Marine Cargo, ...) and `category` the coverage (TLO, Comprehensive, PAR, ...).
// A policy's state is derived: Inactive (set by hand), Expired (end date passed), Expiring
// (ends within 30 days) or Active.

const EXPIRING_DAYS = 30;
const STATUSES = ['Active', 'Inactive'];
const STATES = ['active', 'expiring', 'expired', 'inactive'];

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

// Prisma filter for one derived state.
function stateWhere(state, today = startOfToday()) {
  const live = { OR: [{ status: null }, { status: { not: 'Inactive' } }] };
  if (state === 'inactive') return { status: 'Inactive' };
  if (state === 'expired') return { AND: [live, { end_date: { lt: today } }] };
  if (state === 'expiring') return { AND: [live, { end_date: { gte: today, lte: addDays(today, EXPIRING_DAYS) } }] };
  if (state === 'active') return { AND: [live, { OR: [{ end_date: null }, { end_date: { gt: addDays(today, EXPIRING_DAYS) } }] }] };
  return {};
}

function policyState(ins, today = startOfToday()) {
  if (ins.status === 'Inactive') return 'inactive';
  if (!ins.end_date) return 'active';
  const end = new Date(ins.end_date);
  if (end < today) return 'expired';
  return end <= addDays(today, EXPIRING_DAYS) ? 'expiring' : 'active';
}

const withState = (ins, today) => ({ ...ins, state: policyState(ins, today) });

const INCLUDE = {
  m_company: { select: { id: true, name: true } },
  vehicles: { select: { id: true, plate_number: true, brand_model: true, company_id: true } }
};

// GET /insurances?search=&state=&type=&companyId=&page=&limit=
async function getInsurances(req, res, next) {
  try {
    const { search = '', state, status, type, companyId } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const today = startOfToday();

    // Base filter (search, company, line) — the state counts are computed on this.
    const base = [];
    const q = String(search).trim();
    if (q) {
      base.push({
        OR: [
          { policy_number: { contains: q, mode: 'insensitive' } },
          { insurance_company: { contains: q, mode: 'insensitive' } },
          { insurance_type: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { broker: { contains: q, mode: 'insensitive' } },
          { pic: { contains: q, mode: 'insensitive' } },
          { contact_person: { contains: q, mode: 'insensitive' } },
          { vehicle_type: { contains: q, mode: 'insensitive' } },
          { m_company: { name: { contains: q, mode: 'insensitive' } } }
        ]
      });
    }
    const company = parseInt(companyId, 10);
    if (Number.isInteger(company)) base.push({ company_id: company });
    if (type) base.push({ insurance_type: String(type) });
    const baseWhere = base.length ? { AND: base } : {};

    // Old clients send status=Active/Inactive.
    const wantedState = STATES.includes(state) ? state : status === 'Inactive' ? 'inactive' : null;
    const where = wantedState ? { AND: [...base, stateWhere(wantedState, today)] } : baseWhere;
    const inForce = { AND: [...base, { OR: [stateWhere('active', today), stateWhere('expiring', today)] }] };

    const [list, total, counts, premium, companies, types, coverages, insurers] = await Promise.all([
      prisma.insurances.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ end_date: 'asc' }, { id: 'desc' }], include: INCLUDE }),
      prisma.insurances.count({ where }),
      Promise.all(STATES.map(s => prisma.insurances.count({ where: { AND: [...base, stateWhere(s, today)] } }))),
      prisma.insurances.aggregate({ where: inForce, _sum: { premium_idr: true, premium_usd: true, coverage_idr: true, coverage_usd: true } }),
      prisma.insurances.groupBy({ by: ['company_id'], where: baseWhere }),
      prisma.insurances.groupBy({ by: ['insurance_type'], _count: { _all: true } }),
      prisma.insurances.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.insurances.groupBy({ by: ['insurance_company'], _count: { _all: true } })
    ]);

    const byState = Object.fromEntries(STATES.map((s, i) => [s, counts[i]]));
    const names = rows => rows.map(r => Object.values(r).find(v => typeof v === 'string')).filter(Boolean).sort((a, b) => a.localeCompare(b));

    res.json({
      data: list.map(ins => withState(ins, today)),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: {
        totalCount: byState.active + byState.expiring + byState.expired + byState.inactive,
        byState,
        activeCount: byState.active + byState.expiring,
        expiringCount: byState.expiring,
        expiredCount: byState.expired,
        totalPremiumIdr: Number(premium._sum.premium_idr || 0),
        totalPremiumUsd: Number(premium._sum.premium_usd || 0),
        totalCoverageIdr: Number(premium._sum.coverage_idr || 0),
        totalCoverageUsd: Number(premium._sum.coverage_usd || 0),
        uniqueCompaniesCount: companies.length
      },
      options: { types: names(types), coverages: names(coverages), insurers: names(insurers) }
    });
  } catch (err) {
    next(err);
  }
}

// GET /insurances/vehicle-options — vehicles that can be linked to a policy (GA vehicle list is GA-only).
async function getVehicleOptions(req, res, next) {
  try {
    const vehicles = await prisma.vehicles.findMany({
      select: { id: true, plate_number: true, brand_model: true, company_id: true },
      orderBy: { plate_number: 'asc' }
    });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
}

// GET /insurances/:id
async function getInsuranceDetail(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ins = Number.isInteger(id) ? await prisma.insurances.findUnique({ where: { id }, include: INCLUDE }) : null;
    if (!ins) return res.status(404).json({ error: 'Insurance policy not found.' });
    res.json(withState(ins));
  } catch (err) {
    next(err);
  }
}

const text = (value, max, label) => {
  if (value === undefined || value === null) return { value: null };
  const v = String(value).trim().replace(/\s+/g, ' ');
  if (v.length > max) return { error: `${label} can be at most ${max} characters.` };
  return { value: v || null };
};
const money = (value, label) => {
  if (value === undefined || value === null || value === '') return { value: 0 };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { error: `${label} must be a number of 0 or more.` };
  return { value: Math.round(n * 100) / 100 };
};
const date = (value, label) => {
  if (!value) return { value: null };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { error: `${label} is not a valid date.` };
  return { value: d };
};

// Validates a full policy (create, or update merged onto the current record).
async function parseInsurance(body, excludeId) {
  const out = {};
  const fields = [
    ['insurance_company', 150, 'Insurer'], ['insurance_type', 50, 'Line of insurance'], ['category', 50, 'Coverage'],
    ['policy_number', 50, 'Policy number'], ['vehicle_type', 80, 'Insured object'], ['broker', 100, 'Broker'],
    ['pic', 100, 'Internal PIC'], ['contact_person', 50, 'Broker contact'], ['information', 2000, 'Notes'], ['doc_url', 1000, 'Policy link']
  ];
  for (const [key, max, label] of fields) {
    const r = text(body[key], max, label);
    if (r.error) return { error: r.error };
    out[key] = r.value;
  }
  if (!out.policy_number) return { error: 'Policy number is required.' };
  if (!out.insurance_company) return { error: 'Insurer is required.' };
  if (out.doc_url && !/^https?:\/\//i.test(out.doc_url)) return { error: 'Policy link must start with http:// or https://.' };

  for (const [key, label] of [['premium_idr', 'Premium (IDR)'], ['premium_usd', 'Premium (USD)'], ['coverage_idr', 'Sum insured (IDR)'], ['coverage_usd', 'Sum insured (USD)'], ['tjh3', 'Third-party liability (TJH)']]) {
    const r = money(body[key], label);
    if (r.error) return { error: r.error };
    out[key] = r.value;
  }

  const start = date(body.start_date, 'Start date');
  const end = date(body.end_date, 'End date');
  if (start.error || end.error) return { error: start.error || end.error };
  if (!start.value || !end.value) return { error: 'Start and end dates are required.' };
  if (end.value < start.value) return { error: 'End date cannot be before the start date.' };
  out.start_date = start.value;
  out.end_date = end.value;

  out.status = body.status ? String(body.status) : 'Active';
  if (!STATUSES.includes(out.status)) return { error: 'Status must be Active or Inactive.' };

  const companyId = parseInt(body.company_id, 10);
  if (!Number.isInteger(companyId)) return { error: 'Company is required.' };
  const company = await prisma.m_company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return { error: 'Company not found.' };
  out.company_id = companyId;

  out.vehicle_id = null;
  if (body.vehicle_id) {
    const vehicleId = parseInt(body.vehicle_id, 10);
    const vehicle = Number.isInteger(vehicleId) ? await prisma.vehicles.findUnique({ where: { id: vehicleId }, select: { id: true, company_id: true, plate_number: true, brand_model: true } }) : null;
    if (!vehicle) return { error: 'Vehicle not found.' };
    if (vehicle.company_id && vehicle.company_id !== companyId) return { error: 'The vehicle belongs to another company.' };
    out.vehicle_id = vehicle.id;
    // The insured object follows the linked vehicle.
    out.vehicle_type = [vehicle.brand_model, vehicle.plate_number].filter(Boolean).join(' · ').slice(0, 80);
  }

  const duplicate = await prisma.insurances.findFirst({
    where: {
      policy_number: { equals: out.policy_number, mode: 'insensitive' },
      insurance_company: { equals: out.insurance_company, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true }
  });
  if (duplicate) return { error: `Policy ${out.policy_number} from ${out.insurance_company} is already registered.`, status: 409 };

  return { data: out };
}

// POST /insurances
async function createInsurance(req, res, next) {
  try {
    const parsed = await parseInsurance(req.body || {});
    if (parsed.error) return res.status(parsed.status || 400).json({ error: parsed.error });
    const created = await prisma.insurances.create({ data: parsed.data, include: INCLUDE });
    res.status(201).json(withState(created));
  } catch (err) {
    next(err);
  }
}

// PUT /insurances/:id — fields not sent keep their current value.
async function updateInsurance(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const current = Number.isInteger(id) ? await prisma.insurances.findUnique({ where: { id } }) : null;
    if (!current) return res.status(404).json({ error: 'Insurance policy not found.' });

    const body = req.body || {};
    const merged = { ...current };
    for (const key of Object.keys(body)) if (key in current) merged[key] = body[key];
    const parsed = await parseInsurance(merged, id);
    if (parsed.error) return res.status(parsed.status || 400).json({ error: parsed.error });

    const updated = await prisma.insurances.update({ where: { id }, data: parsed.data, include: INCLUDE });
    res.json(withState(updated));
  } catch (err) {
    next(err);
  }
}

// DELETE /insurances/:id
async function deleteInsurance(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const current = Number.isInteger(id) ? await prisma.insurances.findUnique({ where: { id }, select: { id: true } }) : null;
    if (!current) return res.status(404).json({ error: 'Insurance policy not found.' });
    await prisma.insurances.delete({ where: { id } });
    res.json({ message: 'Insurance policy deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInsurances,
  getInsuranceDetail,
  getVehicleOptions,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  parseInsurance,
  policyState,
  stateWhere
};
