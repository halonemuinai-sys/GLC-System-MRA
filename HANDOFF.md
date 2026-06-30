# GLC Apps — Handoff Notes (Marketing Budget Module)

Ditulis untuk lanjut kerja di tool lain (Google Antigravity). Semua kerja di bawah ini **masih lokal, belum di-commit/push ke git**.

## Stack
- Backend: Express 5 + Prisma 7 (multi-schema: `glc_mra`, `marketing_budget`, `helpdesk`), PostgreSQL (Supabase)
- Frontend: Next.js 16 (App Router) + React 19 + Tailwind, Framer Motion, lucide-react, Recharts
- Auth: JWT, role-based (`admin`/`ga`/`legal`/`compliance`/`legal_compliance`/`auditor`)
- Dev server: backend `npm run dev` (port 5005, nodemon), frontend `npm run dev` (port 3001)
- **Penting**: `nodemon` TIDAK auto-restart kalau yang berubah cuma hasil `npx prisma generate` (file di `node_modules`). Setelah `prisma generate`, backend harus di-stop manual (Ctrl+C) lalu `npm run dev` lagi — restart "otomatis" via nodemon saja TIDAK cukup.

## Migrasi DB yang sudah dibuat — cek mana yang SUDAH dijalankan
Semua di `backend/scripts/`, dijalankan manual via `node scripts/<nama>.js` (bukan `prisma db push`, karena schema.prisma juga mendeklarasikan model `helpdesk_*` yang TIDAK boleh disentuh Prisma — itu punya aplikasi Helpdesk terpisah).

| Script | Status saat handoff | Fungsi |
|---|---|---|
| `add_vendor_to_marketing_items.js` | ✅ sudah dijalankan | Tambah `vendor_id` ke `marketing_plan_items` (FK ke `glc_mra.vendors`) |
| `add_approval_magic_links.js` | ✅ sudah dijalankan | Buat tabel `approval_magic_links` (token approval via email) |
| `switch_marketing_company_fk.js` | ✅ sudah dijalankan | Ganti FK `marketing_plans.company_id` dari `helpdesk_company` (banyak duplikat) ke `glc_mra.m_company` (bersih) |
| `add_approval_role_contacts.js` | ✅ sudah dijalankan | Buat tabel `approval_role_contacts` (email approver per role, default global) |
| `add_holding_override_approval_contacts.js` | ✅ sudah dijalankan | Tambah `company_master_id` ke `approval_role_contacts` (override per Holding Group) |
| `cleanup_ghost_holdings.js` | ✅ sudah dijalankan | Hapus 7 baris `m_company_master` placeholder yang tidak terpakai |

Setelah pindah ke Antigravity, kalau schema.prisma berubah lagi: tetap pakai pola raw-SQL script seperti di atas, **jangan** `prisma db push` langsung.

## Fitur yang sudah dibangun & ditest end-to-end

### 1. Vendor di item budget Marketing Plan
- `marketing_plan_items.vendor_id` → FK ke `glc_mra.vendors` (Vendor Database GA), bukan teks bebas
- Dropdown vendor di wizard Step 2, ditampilkan juga di review & detail plan

### 2. Magic Link Approval (gaya DocHub)
- Tabel `approval_magic_links`: token sekali-pakai, expired 7 hari
- `GET /api/marketing/magic/:token` & `POST /api/marketing/magic/:token` — **endpoint publik**, tidak pakai `verifyToken` (perhatikan: `app.use('/api/marketing', ...)` di `backend/api/index.js` sengaja TIDAK pasang `verifyToken` di level mount lagi — setiap route lain sudah pasang `verifyToken` sendiri-sendiri)
- Frontend publik: `frontend/src/app/approve/[token]/page.jsx` → `PublicApprovalPage.jsx` (di luar `/dashboard`, tidak perlu login)
- Helper inti di `marketingRouter.js`: `queueMagicLink`, `dispatchMagicLinkEmails`, `executeApprovalDecision` (dipakai bersama oleh `/approvals/:id` yang perlu login DAN `/magic/:token` yang publik)

### 3. Konfigurasi Approval (menu admin)
- Tabel `approval_role_contacts`: `role` + `email` + `company_master_id` (nullable)
  - `company_master_id = NULL` → default global (fallback, wajib ada 1 per role, tidak bisa dihapus)
  - `company_master_id = <id>` → override khusus 1 Holding Group (semua PT di bawahnya ikut pakai ini)
- Endpoint: `GET/POST/PUT/DELETE /api/marketing/approval-contacts` (admin only via `checkRole(['admin'])`)
- Frontend: Sidebar → MARKETING BUDGET → **Konfigurasi Approval** (`/dashboard/marketing-approval-settings`, admin only)
- **Konsep penting**: "Group/Holding" di `m_company_master` itu sebenarnya cuma **tag sektor** (Retail/F&B/Media/General), bukan struktur holding berjenjang asli. Project/Marketing Plan tetap terikat per PT (`m_company`), tapi approval di tier VP/BU/COO ditentukan dari sektor/Holding Group PT itu.
- Email dummy saat ini (bisa diubah lewat menu Settings):
  - `MARKETING_MANAGER` → aris@mraretail.co.id
  - `VP_DIRECTOR` / `BU_DIRECTOR` → helpdesk@mraretail.co.id
  - `FINANCE_CONTROLLER` / `CFO_CEO` → csv.ares@gmail.com (sengaja ke email user sendiri untuk testing)

### 4. UI/UX Marketing Plan wizard
- `CampaignDateRangePicker.jsx` — kalender visual 2 bulan untuk rentang tanggal (pakai `react-datepicker`, sudah ada di project)
- `SearchableCompanySelect` (inline component) — dropdown PT bisa diketik, tampilkan badge sektor (RETAIL/FB/MEDIA/dll)
- Input nominal (`Alokasi Anggaran`, `Nominal Pengeluaran`) auto-format pemisah ribuan saat diketik
- Tahun Anggaran auto-sync dari tanggal mulai campaign yang dipilih
- Tab default "Pengajuan & Pipeline Approval" (bukan dashboard grafik) — status pending menampilkan progres step (`Step 2/3 · VP DIRECTOR`)

### 5. Bug fix: Cabang & Lokasi Fisik (Admin → Master Company → Tab "Cabang & Lokasi Fisik")
- `MasterCompanyPage.jsx`: ganti `alert()` jadi banner error inline di form edit Cabang, supaya kalau gagal save, pesan errornya pasti kelihatan (sebelumnya validasi silent-return tanpa feedback)
- Backend endpoint `PUT /api/master/companies/branch/:id` sudah dicek manual via API — berfungsi normal
- **Belum terbukti root cause pasti** dari laporan user "tidak bisa di edit save" — kalau masih terjadi di Antigravity, cek pesan error yang sekarang muncul di banner form

## File-file baru/berubah (belum di-commit)
Lihat `git status` untuk daftar lengkap. Yang paling penting:
- `backend/routes/marketingRouter.js` — semua logic Marketing module (plans, payments, approvals, magic link, approval-contacts config)
- `backend/prisma/schema.prisma` — model baru: `approval_magic_links`, `approval_role_contacts`, `vendor_id` di `marketing_plan_items`, FK `marketing_plans.company_id` → `m_company`
- `frontend/src/components/pages/MarketingPlanPage.jsx`, `CostApprovalsPage.jsx`, `MarketingApprovalSettingsPage.jsx`, `PublicApprovalPage.jsx`
- `frontend/src/components/ui/CampaignDateRangePicker.jsx`

## Yang belum disentuh / pending (kalau mau dilanjutkan)
- Field "Cabang" dan "Lokasi Fisik" masih digabung 1 field (`location`) — user sudah bilang TIDAK perlu dipisah untuk sekarang
- DOA matrix (`approval_rules` — tier nominal & jumlah step) masih hardcode via `seed_marketing.js`, belum ada UI admin untuk edit tier/threshold-nya (beda dari "Konfigurasi Approval" yang cuma atur email penerima)
- Belum push ke git — tunggu konfirmasi user sebelum commit/push
