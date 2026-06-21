---
name: glc-mra-system-development
description: Panduan pengembangan dan referensi teknis lengkap untuk sistem terpadu GLC MRA (General Affairs, Legal, Compliance). Mencakup arsitektur monorepo backend Express.js + Prisma 7, skema database PostgreSQL (Supabase, schema glc_mra), frontend Next.js 16 / React 19 / Tailwind v4, pola CRUD konsisten dengan Framer Motion, dan konvensi kode yang harus diikuti saat menambahkan modul atau fitur baru.
---

# GLC MRA System — Complete Development Reference

Sistem terpadu General Affairs, Legal & Compliance untuk MRA Group.
Monorepo di `D:\Private Project\GLC Apps` dengan dua workspace: `backend/` dan `frontend/`.

---

## 1. Tech Stack & Versions

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20+ |
| Backend Framework | Express.js | 5.x |
| ORM | Prisma Client JS | 7.8 (with `@prisma/adapter-pg`) |
| Database | PostgreSQL (Supabase Cloud, Singapore) | 15+ |
| DB Schema | `glc_mra` (single schema, all tables) | — |
| Frontend Framework | Next.js (App Router) | 16.2.9 |
| UI Library | React | 19.2.4 |
| CSS | Tailwind CSS v4 (PostCSS plugin) | 4.x |
| Animation | Framer Motion | 12.x |
| Icons | Lucide React | 1.21+ |
| Charts | Recharts | 3.8+ |
| Forms | React Hook Form + Zod (some pages) | 7.x / 4.x |
| Auth | JWT (jsonwebtoken) + bcryptjs | — |
| HTTP Client | Custom `apiClient` (fetch-based) | — |
| Cookie Library | js-cookie | 3.x |
| PDF Export | jspdf + jspdf-autotable | — |

---

## 2. Project Structure

```
GLC Apps/
├── backend/
│   ├── api/
│   │   ├── index.js            # Express app entry, route mounting, CORS, error handler
│   │   ├── db.js               # Prisma Client init with pg adapter + search_path glc_mra
│   │   └── authMiddleware.js   # verifyToken (JWT) + checkRole middleware
│   ├── routes/
│   │   ├── authRouter.js       # POST /api/auth/login, /api/auth/register
│   │   ├── gaRouter.js         # /api/ga/* — assets, vehicles, vendors, maintenances, device-rentals, IT-rentals, expenses, locations
│   │   ├── legalRouter.js      # /api/legal/* — documents (PKS/kontrak), insurances
│   │   ├── complianceRouter.js # /api/compliance/* — legal_documents (Legal, Compliance modules)
│   │   ├── masterRouter.js     # /api/master/* — companies, company-masters, branches, asset-categories, asset-types, conditions, statuses, users, divisions, doc-types, vendor-categories, expense-categories, COA, banks
│   │   └── adminRouter.js      # /api/admin/* — user management, role permissions, audit logs (protected: admin only)
│   ├── prisma/
│   │   └── schema.prisma       # All models in glc_mra schema
│   ├── scripts/                # Seed/migration utility scripts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.jsx          # Root layout: dark mode init script, metadata
│   │   │   ├── globals.css         # Tailwind v4 import, custom theme (indigo→blue remap, dark navy surfaces)
│   │   │   ├── page.jsx            # Redirect to /login
│   │   │   ├── login/page.jsx      # Login route
│   │   │   └── dashboard/
│   │   │       ├── layout.jsx      # Dashboard shell: Sidebar, top navbar, theme toggle, clock, hide-prices
│   │   │       ├── page.jsx        # Dashboard home (DashboardPage)
│   │   │       ├── assets/page.jsx
│   │   │       ├── vehicles/page.jsx
│   │   │       ├── vendors/page.jsx
│   │   │       ├── maintenances/page.jsx
│   │   │       ├── documents/page.jsx
│   │   │       ├── insurances/page.jsx
│   │   │       ├── device-rentals/page.jsx
│   │   │       ├── it-rentals/page.jsx
│   │   │       ├── expenses/page.jsx
│   │   │       ├── admin/page.jsx
│   │   │       └── master/companies/page.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.jsx     # Collapsible sidebar with role-based menu, animated layoutId active indicator
│   │   │   ├── pages/
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── GaAssetsPage.jsx
│   │   │   │   ├── GaVehiclesPage.jsx
│   │   │   │   ├── GaVendorsPage.jsx
│   │   │   │   ├── GaMaintenancesPage.jsx
│   │   │   │   ├── GaDocumentsPage.jsx
│   │   │   │   ├── GaInsurancesPage.jsx
│   │   │   │   ├── GaDeviceRentalsPage.jsx
│   │   │   │   ├── GaItRentalsPage.jsx
│   │   │   │   ├── GaExpensesPage.jsx
│   │   │   │   ├── AdminPage.jsx
│   │   │   │   └── MasterCompanyPage.jsx
│   │   │   └── ui/
│   │   │       ├── DatePicker.jsx   # Custom responsive datepicker
│   │   │       └── tooltip.jsx      # @base-ui/react Tooltip wrapper
│   │   └── lib/
│   │       ├── apiClient.js        # Centralized fetch wrapper with JWT from cookies
│   │       └── utils.js            # cn() utility (classname merge)
│   └── package.json
│
└── .gitignore
```

---

## 3. Database Connection

### Prisma Config
```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["glc_mra"]
}
```

### Runtime Connection (`api/db.js`)
- Uses `@prisma/adapter-pg` with raw `pg` Pool
- **search_path** is set to `glc_mra, public` on every pool connect event
- Connection string from `DATABASE_URL` env var (Supabase pooler port `6543`)
- `DIRECT_URL` for Prisma migrations (direct port `5432`)

### Schema Migration
```bash
cd backend
npx prisma db push         # Push schema changes (development)
npx prisma generate        # Regenerate client after schema changes
```

---

## 4. Authentication System

### Backend
- JWT-based auth via `authMiddleware.js`
- Token stored in cookie `glc_mra_token` (set by frontend on login)
- `verifyToken` middleware decodes JWT → sets `req.user` = `{ id, email, role, full_name }`
- `checkRole(['admin', 'ga'])` middleware checks `req.user.role` (case-insensitive)
- Password hashing: `bcryptjs`

### Frontend
- Login sets 3 cookies: `glc_mra_token`, `glc_user_name`, `glc_user_role`
- `apiClient` auto-attaches `Authorization: Bearer <token>` from cookie
- Dashboard layout reads cookies for role-based sidebar menu
- No Next.js middleware file — auth is handled client-side

### User Roles
```
admin | ga | legal | compliance | legal_compliance | auditor | staff
```

---

## 5. API Client (`frontend/src/lib/apiClient.js`)

Centralized fetch wrapper — **always use this**, never raw fetch:

```javascript
import { apiClient } from '@/lib/apiClient';

// GET with query params
const res = await apiClient.get('/api/ga/assets', {
  params: { page: 1, limit: 10, search: 'AC', companyId: 5 }
});

// POST
await apiClient.post('/api/ga/maintenances', payload);

// PUT
await apiClient.put(`/api/ga/maintenances/${id}`, payload);

// DELETE
await apiClient.delete(`/api/ga/maintenances/${id}`);
```

- Base URL: `NEXT_PUBLIC_API_URL` env var (default `http://localhost:5005`)
- Auto-filters `undefined`/`null` params
- Throws `Error` with server error message on non-OK responses

---

## 6. Backend API Endpoint Convention

### Route Registration (`api/index.js`)
```javascript
app.use('/api/auth', require('../routes/authRouter'));
app.use('/api/ga', require('../routes/gaRouter'));
app.use('/api/legal', require('../routes/legalRouter'));
app.use('/api/compliance', require('../routes/complianceRouter'));
app.use('/api/master', require('../routes/masterRouter'));
app.use('/api/admin', [verifyToken, checkRole(['admin'])], require('../routes/adminRouter'));
```

### Standard CRUD Pattern (per module in router files)
```javascript
// GET    /api/ga/maintenances        — List with pagination, search, filters, summary stats
// GET    /api/ga/maintenances/:id    — Get single record with relations
// POST   /api/ga/maintenances        — Create new record
// PUT    /api/ga/maintenances/:id    — Update record
// DELETE /api/ga/maintenances/:id    — Delete record
```

### Standard Response Shape
```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 },
  "summary": { "totalCost": 50000000, "pendingCount": 5, "completedCount": 20, "uniqueCompaniesCount": 3 }
}
```

### Include Relations Pattern (Prisma)
```javascript
const records = await prisma.maintenances.findMany({
  include: {
    m_company: { select: { id: true, name: true } },
    m_location: { select: { id: true, full_name: true } },
    vendors: { select: { id: true, vendor_name: true, pic_name: true, phone: true } },
    assets: { select: { id: true, asset_name: true, asset_code: true } }
  },
  orderBy: { created_at: 'desc' }
});
```

---

## 7. Frontend Page Component Pattern

Setiap halaman modul mengikuti pola yang **sangat konsisten**. Ikuti pola ini saat membuat modul baru:

### 7.1 File Structure
```
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconName, Search, Plus, X, Loader2, Edit3, Trash2, ExternalLink, ... } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// 1. Reusable sub-components (SearchableCompanySelect, SearchingRadarAnimation)
// 2. Main page component (export default)
```

### 7.2 State Management Pattern
```javascript
export default function GaXxxPage() {
  // Data states
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({...});
  const [error, setError] = useState(null);

  // Active filters (sent to API)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Temporary filters (bound to UI, committed on "Proses Data")
  const [tempSearch, setTempSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');

  // Process control — data only loads after user clicks "Proses Data"
  const [hasProcessed, setHasProcessed] = useState(false);

  // CRUD states
  const [selectedItem, setSelectedItem] = useState(null);      // Detail drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false);   // Add/Edit drawer
  const [editingItem, setEditingItem] = useState(null);        // Editing mode
  const [submitting, setSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);      // Delete modal

  // Form data with defaults
  const defaultFormData = { field1: '', field2: '', reference_link: '' };
  const [formData, setFormData] = useState({ ...defaultFormData });

  // Handlers
  const handleCloseAddDrawer = () => { setShowAddDrawer(false); setEditingItem(null); setFormData({...defaultFormData}); };
  const openEditItem = (item) => { setEditingItem(item); setFormData({...mapItemToForm(item)}); setShowAddDrawer(true); };
  const handleDeleteItem = (item) => { setItemToDelete(item); };
  const confirmDeleteItem = async () => { /* DELETE API call, refresh data */ };
}
```

### 7.3 "Proses Data" Filter Pattern
Data **tidak langsung dimuat** saat halaman pertama kali dibuka. User harus klik tombol **"Proses Data"** untuk memproses filter dan memuat data. Ini adalah pola standar di semua halaman.

```javascript
// Saat hasProcessed = false, tampilkan SearchingRadarAnimation (blank state animasi radar)
// Saat hasProcessed = true, tampilkan summary cards + data table

const handleProcessFilter = (e) => {
  if (e) e.preventDefault();
  setPage(1);
  setSearch(tempSearch);
  setStatusFilter(tempStatusFilter);
  setCompanyId(tempCompanyId);
  setHasProcessed(true);    // triggers useEffect → fetchData()
};
```

### 7.4 SearchableCompanySelect Component
Setiap halaman punya dropdown company searchable yang di-copy inline (bukan shared component). Pattern:
- Custom dropdown dengan search input
- `isOpen` state, fixed backdrop overlay
- AnimatePresence untuk animasi open/close
- Clear button (X) saat ada value

### 7.5 SearchingRadarAnimation Component
Setiap halaman punya animasi blank state yang unik per modul:
- Pulse rings, rotating radar sweep, floating dots
- Center icon SVG dengan animated `pathLength`
- Icon sesuai konteks modul (Wrench untuk maintenance, ShieldCheck untuk insurance, dll)

### 7.6 Table Action Column Pattern
```jsx
<td className="p-4 text-center">
  <div className="flex items-center justify-center gap-1.5">
    {/* Link to reference document (conditional) */}
    {item.reference_link && (
      <a href={item.reference_link} target="_blank" rel="noopener noreferrer"
        className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
        title="Open Reference Doc">
        <ExternalLink className="w-4 h-4" />
      </a>
    )}
    {/* View Detail */}
    <button onClick={() => setSelectedItem(item)} className="p-1 text-neutral-400 hover:text-indigo-500 ...">
      <Maximize2 className="w-4 h-4" />
    </button>
    {/* Edit */}
    <button onClick={() => openEditItem(item)} className="p-1 text-neutral-400 hover:text-indigo-500 ...">
      <Edit3 className="w-4 h-4" />
    </button>
    {/* Delete with micro-animation */}
    <motion.button onClick={() => handleDeleteItem(item)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
      <Trash2 className="w-4 h-4" />
    </motion.button>
  </div>
</td>
```

### 7.7 Slide-Over Drawer Pattern (Add/Edit)
- Right-side drawer, `max-w-md`, spring animation (`x: '100%'` → `x: 0`)
- Backdrop overlay with `opacity: 0.5`
- Dynamic title: `editingItem ? 'Edit ...' : 'Add ...'`
- Form submit → `POST` (new) or `PUT` (edit)
- Cancel closes drawer and resets form via `handleCloseAddDrawer()`
- Reference link input with `FileText` icon prefix

### 7.8 Animated Delete Confirmation Modal
```jsx
<AnimatePresence>
  {itemToDelete && (
    <>
      {/* Backdrop with blur */}
      <motion.div initial={{opacity:0}} animate={{opacity:0.5}} exit={{opacity:0}}
        onClick={() => setItemToDelete(null)}
        className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
      {/* Modal card — centered, spring scale animation */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
        <motion.div initial={{opacity:0,scale:0.9,y:15}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:15}}
          transition={{type:'spring',duration:0.35}}
          className="w-full max-w-sm bg-white dark:bg-neutral-900 border rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center">
          {/* Pulsing warning icon */}
          <div className="relative mb-4">
            <motion.div className="absolute inset-0 rounded-full bg-red-500/10 blur-sm"
              animate={{scale:[1,1.25,1]}} transition={{duration:2,repeat:Infinity}} />
            <div className="relative w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <h3>Konfirmasi Hapus ...</h3>
          <p>Apakah Anda yakin...?</p>
          {/* Batal + Ya, Hapus buttons */}
        </motion.div>
      </div>
    </>
  )}
</AnimatePresence>
```

### 7.9 Detail Drawer Pattern
- Right-side slide-over, same spring animation
- Shows all fields in `grid grid-cols-2` layout
- Grouped sections with dividers (`h-px bg-neutral-100 dark:bg-neutral-800`)
- Labels: `text-[10px] text-neutral-400 font-bold uppercase tracking-wider`
- Values: `text-xs text-neutral-800 dark:text-slate-200 font-semibold`

---

## 8. Styling Conventions

### Color System
- **Primary**: Indigo (remapped to Blue `#2563eb` family in globals.css)
- **Dark surfaces**: Deep navy (`neutral-950: #030712`, `neutral-900: #0d1424`)
- **Dark mode**: Class-based (`.dark` on `<html>`), toggled via `localStorage.theme`
- **Accent colors**: Emerald (success), Amber (warning/pending), Red (error/delete), Violet (secondary)

### Component Styling Patterns
- Cards: `bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl`
- Buttons primary: `bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl`
- Buttons secondary: `bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700`
- Input fields: `bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs`
- Table header: `text-neutral-400 text-[10px] font-bold uppercase tracking-wider`
- Status badges: `inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-{color}-500/10 text-{color}-600`

### Animation Patterns
- Table row stagger: `initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:idx*0.02}}`
- Drawer spring: `type:'spring', stiffness:350, damping:30`
- Delete button: `whileHover={{scale:1.1}} whileTap={{scale:0.9}}`
- Modal spring: `type:'spring', duration:0.35`

---

## 9. Database Schema — All Models

### Transactional Tables
| Model | Description | Key Relations |
|-------|-------------|---------------|
| `assets` | Aset inventaris (komputer, AC, meja) | → m_company, m_location (m_company_branch), m_asset_category, m_asset_type, m_condition, m_status, m_user |
| `vehicles` | Kendaraan operasional | → m_company |
| `vendors` | Vendor/supplier | → m_company, m_vendor_category, m_expense_category, m_division, m_bank |
| `maintenances` | Tiket pemeliharaan | → m_company, m_location, assets, vendors |
| `device_rentals` | Sewa perangkat IT (laptop, printer) | → m_company, m_location, m_user, vendors |
| `documents` | Dokumen PKS/kontrak Legal | → m_company, m_document_type, m_division, vendors |
| `insurances` | Polis asuransi | → m_company, vehicles |
| `legal_documents` | Dokumen hukum (Legal & Compliance) | → m_company |
| `expense_budget` | Anggaran biaya per COA per bulan | → m_coa, m_company |
| `approval_requests` | Persetujuan aset | — |
| `inventory_checks` | Item stock opname | → assets, stock_opname_sessions |
| `stock_opname_sessions` | Sesi stock opname | — |
| `audit_log` | Log audit sistem | → m_user |
| `legal_audit_logs` | Log audit dokumen legal | → legal_documents |
| `m_role_permission` | Hak akses per role per modul | — |

### Master Tables (prefix `m_`)
| Model | Purpose |
|-------|---------|
| `m_company_master` | Holding group (MRA, MRK, dll) |
| `m_company` | PT entities | 
| `m_company_branch` | Kantor cabang per company master |
| `m_user` | User sistem |
| `m_asset_category` | Kategori aset (Elektronik, Furniture, dll) |
| `m_asset_type` | Tipe aset per kategori |
| `m_condition` | Kondisi aset (Baik, Rusak, dll) |
| `m_status` | Status aset (Aktif, Disposal, dll) |
| `m_location` | Lokasi fisik (building/floor/room) |
| `m_division` | Divisi perusahaan |
| `m_document_type` | Tipe dokumen legal |
| `m_vendor_category` | Kategori vendor |
| `m_expense_category` | Kategori biaya (self-referencing hierarchy) |
| `m_coa` | Chart of Accounts |
| `m_bank` | Bank untuk rekening vendor |

---

## 10. Document Link Fields

Beberapa model mendukung link dokumen referensi (Google Drive, etc.):

| Model | Field | UI Label |
|-------|-------|----------|
| `assets` | `reference_link` | Reference Link |
| `maintenances` | `reference_link` | Reference Document Link |
| `documents` | `digital_doc_url` | Digital Doc URL |
| `insurances` | `doc_url` | Policy Document |
| `vehicles` | `doc_url` | Document Link |
| `legal_documents` | `file_url` | File URL |

Di tabel, jika ada link → tampilkan tombol `ExternalLink` icon.
Di form, gunakan input `type="url"` dengan icon `FileText` prefix.

---

## 11. Next.js Route Convention

Setiap route page hanya berisi import dan render komponen page:
```jsx
// frontend/src/app/dashboard/maintenances/page.jsx
import GaMaintenancesPage from '@/components/pages/GaMaintenancesPage';
export default function Page() {
  return <GaMaintenancesPage />;
}
```

Semua logic ada di `components/pages/` — **bukan** di file page route.

---

## 12. Running the Project

### Backend
```bash
cd backend
npm install
npx prisma generate    # Generate Prisma client
npm run dev            # Start with nodemon on port 5005
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Next.js dev server on port 3000
```

### Environment Variables (backend/.env)
```
DATABASE_URL=postgresql://...:6543/postgres     # Supabase pooler
DIRECT_URL=postgresql://...:5432/postgres       # Direct for migrations
JWT_SECRET=glc-mra-secret-key-2026-auth-token
PORT=5005
```

### Environment Variables (frontend/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5005
```

---

## 13. Adding a New Module — Step by Step

1. **Schema**: Add model in `backend/prisma/schema.prisma` with `@@schema("glc_mra")`
2. **Push**: `cd backend && npx prisma db push && npx prisma generate`
3. **Backend Router**: Add CRUD endpoints in new or existing router file, following standard response shape with `data`, `meta`, `summary`
4. **Register Route**: Mount in `backend/api/index.js`
5. **Frontend Page Component**: Create `components/pages/GaXxxPage.jsx` following Section 7 patterns
6. **Route Page**: Create `app/dashboard/xxx/page.jsx` with simple import wrapper
7. **Sidebar**: Add menu item in `components/layout/Sidebar.jsx` with appropriate icon and role guard
8. **Build Test**: `cd frontend && npx next build` — must pass with zero errors

---

## 14. Common Gotchas & Rules

- **Selalu gunakan `'use client'`** di setiap page component (karena menggunakan React hooks dan Framer Motion)
- **Jangan nested `<button>` di dalam `<button>`** — akan menyebabkan hydration error
- **Tooltip**: Gunakan `<TooltipTrigger asChild>` dengan `<span>` bukan `<button>` untuk menghindari nested button
- **Tailwind v4**: Menggunakan `@import "tailwindcss"` dan `@custom-variant dark`, bukan config file lama
- **Indigo = Blue**: Warna `indigo-*` telah di-remap ke keluarga Blue (`#2563eb`) di `globals.css`
- **Dark mode border**: `border-neutral-800` di dark mode di-override jadi semi-transparent `rgba(148, 163, 184, 0.10)`
- **Framer Motion**: Jangan gunakan `motion.*` di dalam element yang sudah ada CSS transition global (gunakan class `no-transition` jika perlu)
- **API Response**: Backend selalu return `{ data, meta, summary }` untuk list endpoints
- **Form reset**: Selalu reset form state saat menutup drawer (baik Cancel maupun backdrop click)
- **Prisma schema**: Semua model harus punya `@@schema("glc_mra")`
