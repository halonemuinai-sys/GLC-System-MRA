---
name: compliance-excel-module
description: Use when the user gives an Excel template (.xlsx) and asks to implement/research it as a new Compliance sub-module in GLC Apps (e.g. "implementasikan excel ini ke menu Compliance", "riset menu X dari excel ini", "buat modul compliance dari template ini"). Covers the full pipeline from reading the .xlsx (main sheet + Reference Lists + Guidelines) through Prisma schema, backend CRUD, and a dedicated frontend page matching this repo's existing License & Permit / Compliance Docs modules.
---

# Compliance Excel Module — Research & Implementation

Reusable runbook for turning a GA/Legal/Compliance Excel template into a fully
working module in GLC Apps, following the exact pattern already used for
**License & Permit** (`compliance_licenses`) and **Compliance Docs**
(`compliance_monitoring`). Read those two first as reference implementations
before changing anything — they are the ground truth for "what done looks like."

Two phases, do not skip the checkpoint between them:

1. **Research & recommend** — read the Excel, map fields, propose Tahap 1 /
   Tahap 2 split, ask the user to confirm before writing code.
2. **Implement** — schema → backend → frontend → wiring, only after the user
   says go ahead (e.g. "lanjutkan", "oke", "lanjutkan semuanya").

Never collapse these into one pass even if the user seems impatient — the
field-scope decision in phase 1 is the one thing only the user can make, and
guessing wrong means rebuilding a table + page later.

## Phase 1 — Research the Excel file

No npm xlsx library is installed in this repo. Use Python + `openpyxl`
(already verified available via `python3 -c "import openpyxl"`). Don't add a
new node dependency just to read a spreadsheet once.

```bash
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('<path-to-file>.xlsx', data_only=True)
print('SHEETS:', wb.sheetnames)
"
```

Template shape is always the same 3 sheets:

- **Main data sheet** — row 1 = headers, one column per field. Likely empty
  below row 1 (these are blank templates, not seeded data).
- **Reference Lists** — one column per dropdown field, header = field name,
  values below it = the dropdown options.
- **Guidelines** — two columns (`Field`, `Description`) explaining the
  non-obvious fields only.

Dump the main sheet header row with explicit column letters (don't trust your
own mental column-counting):

```bash
python3 -c "
import openpyxl
from openpyxl.utils import get_column_letter
wb = openpyxl.load_workbook('<path>.xlsx', data_only=True)
ws = wb.worksheets[0]
for col in range(1, ws.max_column+1):
    print(get_column_letter(col), ws.cell(row=1, column=col).value)
"
```

Dump Reference Lists and Guidelines fully (filter out all-`None` rows):

```bash
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('<path>.xlsx', data_only=True)
for name in ['Reference Lists', 'Guidelines']:
    print('===', name, '===')
    ws = wb[name]
    for row in ws.iter_rows(values_only=True):
        if any(c is not None for c in row):
            print(row)
"
```

Check data validations (which Excel column's dropdown sources which Reference
Lists column) and any formulas in row 2 (computed fields like "Sisa Hari
Berlaku" / "Days Outstanding"):

```bash
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('<path>.xlsx', data_only=False)
ws = wb.worksheets[0]
for dv in ws.data_validations.dataValidation:
    print(dv.type, dv.formula1, dv.sqref)
for col in range(1, ws.max_column+1):
    cell = ws.cell(row=2, column=col)
    if cell.value is not None:
        print(cell.coordinate, repr(cell.value))
"
```

**Known gotcha:** the data-validation `sqref` (which column the dropdown
lives on) has been found off-by-one from the actual header in at least one
real template (`Compliance_Monitoring_Template.xlsx` — Audit
Requirement/Audit Type/Whistleblowing dropdowns were shifted one column left
onto Days Outstanding/Audit Requirement/Audit Type). **Always map a Reference
Lists column to a main-sheet field by matching the *header name*, never by
raw column position.** Flag the mismatch to the user as a one-line note, then
proceed with the name-based mapping — it's a template authoring bug, not
something to faithfully reproduce.

A computed field (no stored value, formula like `=O2-TODAY()`) means the
real implementation should compute it server-side at request time, not store
it as a column. See `computeExpiryStatus()` / `computeTimelineStatus()` in
`backend/routes/complianceRouter.js` for the two existing patterns:

- **Expiry-style** (license/permit expiry, certificate expiry): thresholds
  `<0 days = Expired`, `<30 = Critical`, `<90 = Warning`, else `Valid`.
- **Due-date/finding-style** (CAP due date, review due date): thresholds
  `>0 days = Overdue`, `>= -7 = Due Soon`, else `On Track`; `Completed` if a
  completion date is set. Shorter window than expiry because findings/CAPs
  are short-cycle, license renewals are long-cycle.

Pick whichever matches the new template's date semantics, or introduce a
third variant if neither fits — don't force-fit.

### Compare against what already exists

Read `backend/prisma/schema.prisma`'s `legal_documents` model and the
existing dedicated models (`compliance_licenses`, `compliance_monitoring`).
Cross off every Excel field that's already covered by the **generic**
shared shape (`doc_name`, `category`, `id_number`/equivalent, `issue_date`,
`expiry_date`, `pic`, `company_id`, `doc_status`, `confidentiality`,
`file_url`/`document_url`, `notes`). What's left is the real gap driving the
"does this need its own table" decision below.

### Recommend, group, and split

Group remaining fields into 4-6 logical sections (mirrors the Add/Edit form
sections used in `ComplianceLicensesPage.jsx` / `ComplianceDocsPage.jsx`,
e.g. "Identitas", "Entitas & Lokasi", "PIC", "Tanggal & Status", "Risk &
Kerahasiaan", "Referensi").

Split into:

- **Tahap 1 (now)** — fields that are pure data capture: text, dates,
  enums backed by the Reference Lists sheet, FK to `m_company`. Cheap,
  no missing infra required.
- **Tahap 2 (future module, not now)** — fields that imply a workflow or
  infra GLC Apps doesn't have yet:
  - Approval chain fields (Approval By/Date/Status) → future generalized
    **Approval Workflow** module (there's already an `approval_requests`
    table for assets that could be generalized).
  - Audit scheduling fields (Audit Requirement/Type/Last/Next Date) →
    future **Audit & Inspection Scheduling** module.
  - Escalation fields (Escalated To, Management Review, Auto Escalation) →
    blocked on a notification system (no email/push exists in this app
    yet) — defer until that infra exists.
  - Root Cause / CAP / Preventive Action → future **Compliance Issue &
    Remediation Tracking** module (shared across License & Compliance Docs).
  - Whistleblowing / Incident / Penalty fields → sensitive/legal topic,
    its own future **Incident & Whistleblowing Tracking** module, don't
    fold into a regular monitoring table.

Decide the architecture question explicitly and state it to the user:
**dedicated table** (own Prisma model + own audit log table, like license
and monitoring) if the Tahap-1 field count is large/specific (roughly >8 new
fields beyond the generic shape), or **stay on the generic shared table**
(`legal_documents` with a new `module` value, reuse `ComplianceDocPage.jsx`
+ a thin config file like `ComplianceSopPage.jsx`/`ComplianceTaxPage.jsx`)
if it's a small delta. License & Permit and Compliance Docs both warranted
dedicated tables; SOP/HR/Tax/Product modules currently don't.

Present the grouped table + Tahap 1/2 split + architecture call to the user
and stop. Wait for confirmation (or field adjustments) before writing code.

## Phase 2 — Implement (only after confirmation)

Use a TodoWrite list with these exact steps — this is a multi-file,
multi-layer change and tracking prevents missing a layer.

### 1. Schema (`backend/prisma/schema.prisma`)

Add two models next to the existing `compliance_licenses` /
`compliance_monitoring` block (not alphabetical — group by feature):

```prisma
model compliance_<module>_audit_logs {
  id           Int                      @id @default(autoincrement())
  record_id    Int?
  doc_name     String?                  @db.VarChar(255)
  action       String                   @db.VarChar(50)
  performed_by String?                  @default("system") @db.VarChar(100)
  performed_at DateTime?                @default(now()) @db.Timestamptz(6)
  compliance_<module> compliance_<module>? @relation(fields: [record_id], references: [id], onUpdate: NoAction)

  @@index([record_id], map: "idx_compliance_<module>_audit_id")
  @@schema("glc_mra")
}

model compliance_<module> {
  id         Int       @id @default(autoincrement())
  doc_name   String    @db.VarChar(255)   // primary Tahap-1 "title" field
  category   String    @db.VarChar(100)
  company_id Int?
  pic        String    @db.VarChar(100)
  // ...rest of Tahap 1 fields, snake_case, nullable unless truly required...
  confidentiality String @default("Public") @db.VarChar(60)
  notes      String?
  created_at DateTime? @default(now()) @db.Timestamptz(6)
  updated_at DateTime? @default(now()) @db.Timestamptz(6)
  compliance_<module>_audit_logs compliance_<module>_audit_logs[]
  m_company  m_company? @relation(fields: [company_id], references: [id], onUpdate: NoAction)

  @@index([<the-date-field>], map: "idx_compliance_<module>_date")
  @@index([category], map: "idx_compliance_<module>_category")
  @@schema("glc_mra")
}
```

Add the back-relation line `compliance_<module> compliance_<module>[]` into
`model m_company`'s relation list (next to `compliance_licenses`).

Verify brace balance before moving on (cheap, catches typos immediately):

```bash
node -e "const s=require('fs').readFileSync('prisma/schema.prisma','utf8'); console.log((s.match(/\{/g)||[]).length, (s.match(/\}/g)||[]).length)"
```

### 2. Backend (`backend/routes/complianceRouter.js`)

- If the module was previously in `GENERIC_MODULES`, remove it (now has its
  own table). If it's brand new, it never needs to be added there.
- Add a `<module>ToDocShape(rec)` normalizer mapping the module's own
  date/status field names onto the shared shape (`expiry_date`, `doc_status`,
  `module: '<key>'`) — this lets `/notifications` and `/summary` aggregate
  it for free by reusing `withExpiryStatus`/`computeExpiryStatus`. Only write
  a *separate* `computeTimelineStatus`-style function if the module's own
  page needs different/more specific status labels than Valid/Warning/
  Critical/Expired for direct display (as Compliance Docs needed
  On-Track/Due-Soon/Overdue/Completed).
- Add the 5 CRUD endpoints (`GET`/`POST` list+create, `GET`/`PUT`/`DELETE`
  `/:id`) following `compliance_monitoring`'s exact shape: search across the
  2-3 most useful text fields, filter params per Tahap-1 enum field,
  `companyId` + `companyMasterId` (relation filter `where.m_company = {
  company_master_id: ... }`) for the Holding Group cascading filter,
  pagination, and a `summary` object with whatever 3-4 counts matter most
  for that module (mirror `totalCount`/`activeCount`-style fields, named for
  the module's own status vocabulary).
- On DELETE: never hard-delete the audit log rows. `updateMany` to null out
  the FK, insert one final `DELETE` action log, then delete the parent row.
  This is the one correctness fix that's easy to skip and silently destroys
  the audit trail — don't skip it.
- Merge into `/notifications` (add the new table to the `Promise.all`,
  decide what "needs attention" means for this module's date field) and
  `/summary` (add to the `Promise.all`, map through the new ToDocShape
  function, concat into `allDocs`).
- `node --check routes/complianceRouter.js` after every edit pass.

### 3. Frontend

- New dedicated page `frontend/src/components/pages/Compliance<Module>Page.jsx`.
  Copy `ComplianceDocsPage.jsx` as the starting point (closer in shape to a
  fresh module than `ComplianceLicensesPage.jsx`), then swap in the new
  fields/sections/dropdown constants. Keep the same skeleton: header with
  Export CSV + Tambah button, filter bar with Holding-Group → Company
  cascading `SearchableCompanySelect`, blank-state radar animation, summary
  cards, table with checkbox column + status badges + action icons
  (View/Edit/Delete + external link if a URL field exists), floating bulk
  delete bar, detail drawer with embedded audit history, sectioned Add/Edit
  drawer, animated delete confirmation modal. Don't try to abstract this
  into a shared component — this codebase's convention is copy-paste-adapt
  per page (see `AGENTS.md` section 7.4).
- Route wrapper at `frontend/src/app/dashboard/compliance/<route>/page.jsx`
  — two lines, just imports and renders the page component.
- `frontend/src/components/layout/Sidebar.jsx` — add one entry to the
  `Regulasi & Audit` children array under the `COMPLIANCE` section, with
  `badge: complianceBadges.<module_key>` (the badge wiring already fetches
  from `/api/compliance/notifications` generically, nothing else to change
  there).
- `frontend/src/components/pages/ComplianceDashboardPage.jsx` — add one
  entry to the `MODULES` array (`key`, `label`, `path`, `icon`, `color`).
  Everything else in that page (KPI cards, per-module breakdown, charts,
  critical docs table) consumes `MODULES` + `/api/compliance/summary`
  generically — no other change needed there.
- After writing each `.jsx`, check brace/paren balance the same way as the
  schema check above (substitute the bracket characters), and grep each
  imported lucide icon name to make sure none are unused — this repo has no
  build step available to catch it for you mid-session.

### 4. Tell the user, don't run it for them

This user runs all dev/build/migration commands themselves. After schema
changes, give them exactly:

```bash
cd backend
npx prisma db push
npx prisma generate
```

and remind them `db push`/migrations go through `DIRECT_URL` (port 5432,
configured in `backend/prisma.config.ts`) straight into the real Supabase
database — same DB the running app reads via `DATABASE_URL` (pooler), not a
separate local one. Then ask them to restart both `npm run dev` processes
(backend port 5005, frontend port 3001).

It's fine to start a throwaway backend instance yourself (`node api/index.js`
foreground with a timeout, or backgrounded + logged to a temp file) purely to
verify an endpoint or read the real Prisma error after they report a bug —
just stop/kill it again afterward so it doesn't fight with their own
`npm run dev` for the port. Never run `npx prisma db push` yourself; that's
a real schema migration against their live database, not a diagnostic.

## Reference implementations in this repo

- `backend/prisma/schema.prisma` — search `compliance_licenses` and
  `compliance_monitoring` for the two existing dedicated models.
- `backend/routes/complianceRouter.js` — full CRUD + notifications/summary
  merge logic for both modules.
- `frontend/src/components/pages/ComplianceLicensesPage.jsx` and
  `ComplianceDocsPage.jsx` — full dedicated pages.
- `frontend/src/components/pages/ComplianceDocPage.jsx` — the generic
  shared page (config-driven) still used by SOP/HR/Tax/Product, for contrast
  when deciding dedicated-vs-generic.
