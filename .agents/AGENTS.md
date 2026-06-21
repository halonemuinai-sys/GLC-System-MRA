# GLC MRA System — Project Rules

## Language
- Semua komentar kode dan commit message boleh dalam Bahasa Indonesia atau Inggris
- UI labels menggunakan campuran Indonesia & Inggris sesuai konteks bisnis

## Code Style
- Gunakan single quotes untuk string JavaScript
- Gunakan semicolons di akhir statement
- Indentasi: 2 spasi
- Semua page components harus `'use client'` di baris pertama
- Penamaan file component: PascalCase (e.g. `GaAssetsPage.jsx`)
- Penamaan route folder: kebab-case (e.g. `device-rentals/`)

## UI/UX Standards
- Setiap halaman HARUS memiliki:
  1. Header dengan icon + judul + deskripsi singkat
  2. Filter bar dengan "Proses Data" button (data tidak langsung dimuat)
  3. SearchingRadarAnimation untuk blank state
  4. Summary cards setelah data dimuat
  5. Tabel data dengan pagination
  6. Action column: ExternalLink (jika ada link), View Detail, Edit, Delete
  7. Slide-over drawer untuk Add/Edit
  8. Animated delete confirmation modal
- Gunakan Framer Motion untuk semua animasi transisi
- Warna status: Emerald=completed/active, Amber=pending, Blue=in-progress, Red=error/delete

## Backend Standards
- Setiap endpoint list HARUS return `{ data, meta, summary }`
- Gunakan Prisma `include` untuk relasi, bukan raw SQL
- Selalu validasi input di backend
- Gunakan try/catch di setiap handler

## Testing
- Setelah perubahan frontend, jalankan `npx next build` untuk verifikasi
- Setelah perubahan schema, jalankan `npx prisma db push` lalu `npx prisma generate`
