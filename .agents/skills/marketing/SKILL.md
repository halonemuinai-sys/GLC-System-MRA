---
name: glc-mra-marketing-development
description: Panduan pengembangan dan referensi desain modul Marketing (Campaign, Budgeting, & Timeline) pada sistem terpadu GLC MRA. Mencakup aturan desain (tanpa warna ungu), spesifikasi animasi KPI card dengan trendline keuangan, layout Gantt Chart fullscreen dengan sidebar budget kanan, skema relasi database marketing, dan validasi data.
---

# GLC MRA — Modul Marketing Development Reference

Modul Marketing menangani perencanaan campaign, budgeting (anggaran vs realisasi terbayar), dan visualisasi timeline interaktif (Gantt Chart).

---

## 1. Desain & Estetika (Aturan Kritis)

*   **TIDAK BOLEH MENGGUNAKAN WARNA UNGU**: Warna ungu dilarang keras di seluruh halaman modul Marketing. Gunakan palet warna modern, cerah, dan bersih:
    *   **Blue (`#3b82f6`)**: Total Anggaran / Campaign Utama.
    *   **Emerald (`#10b981`)**: Realisasi / Burn Rate.
    *   **Amber (`#f59e0b`)**: Sisa Anggaran / Pending.
    *   **Rose/Red (`#f43f5e`/`#ef4444`)**: Status Campaign / Rejected.
    *   **Slate/Gray (`#64748b`/`#94a3b8`)**: Draft.

---

## 2. Spesifikasi Tampilan KPI Cards

Setiap KPI card di halaman utama Overview memiliki layout premium:
1.  **Aksen & Glow**: Memiliki garis indikator di sebelah kiri dan efek glow radial di pojok kanan atas yang mengikuti tema warna card.
2.  **Sparkline Trendline Finansial (Bukan Wave/Gelombang)**:
    *   Menggunakan visualisasi garis grafik stock/financial sharp (polygonal path dengan `L` command pada SVG).
    *   Garis ini digambar dengan ketebalan `1.5` dan diisi dengan gradien linear transparansi (`stopOpacity="0.22"` ke `0.00`).
    *   Berjalan secara looping mulus (seamless scrolling) dengan animasi CSS `@keyframes waveMove` memindahkan `translateX(0)` ke `translateX(-50%)` pada container lebar `200%`.
3.  **Pola Grid Koordinat**:
    *   Memiliki overlay background dengan motif grid kertas milimeter (kombinasi `linear-gradient` to right & to top tipis).
4.  **Status Campaign Card (Rose Theme)**:
    *   Menampilkan status breakdown berjejer horisontal dengan dot indikator warna (`amber-500` pending, `neutral-400` ditolak, `#64748b` draft).
    *   Memiliki **progress bar horizontal di bagian bawah** berwarna rose-pink untuk menunjukkan persentase campaign disetujui (`APPROVED`), dilengkapi teks label persentase (e.g. `44%`) di sisi kanan bar.

---

## 3. Spesifikasi Fullscreen Gantt Chart (Modal)

Tampilan modal timeline Gantt Chart diatur dengan layout khusus:
1.  **Tanpa Panel Kiri (Campaign Detail)**: Campaign hanya digambarkan sebagai floating bars di dalam area timeline utama.
2.  **Right Sidebar (Total Budget)**:
    *   Memiliki kolom tetap di sebelah kanan bernama **"Total Budget"** dengan lebar `140px`.
    *   Menampilkan nilai budget ringkas (e.g. `Rp 25,0Jt`) untuk setiap campaign pada baris yang sejajar.
    *   Dilengkapi **mini progress bar** di bawah angka budget yang menunjukkan tingkat serapan realisasi anggaran.
3.  **Quarter Header Bar**:
    *   Row Quarter (Q1-Q4) menggunakan gradien warna horizontal yang cerah untuk membedakan kuartal:
        *   Q1: Blue-Cyan (`from-blue-400 to-cyan-400`)
        *   Q2: Emerald-Teal (`from-emerald-400 to-teal-400`)
        *   Q3: Amber-Orange (`from-amber-400 to-orange-400`)
        *   Q4: Rose-Pink (`from-rose-400 to-pink-400`)
4.  **Month Header Row**: Menampilkan inisial bulan (`JAN`, `FEB`, dll.) di bawah Quarter row.
5.  **Floating Bubble Campaign Bars**:
    *   Bar digambar berbentuk kapsul/bubble rounded-2xl dengan warna background pastel lembut dan border 1.5px sesuai statusnya.
    *   Di dalam bar tertulis rentang tanggal acara (e.g. `Feb 1 – Feb 28`) dan total anggaran campaign tersebut.
    *   Dot penanda status berwarna solid diletakkan di sisi paling kiri teks di dalam bar.
6.  **Today Line Marker**:
    *   Garis putus-putus vertikal berwarna biru-indigo (`dashed`) yang turun dari area header sampai ke bawah baris terbawah.
    *   Terdapat label badge **"TODAY"** oval biru kecil di atas garis hari ini pada baris quarter header.
7.  **Footer**:
    *   Menyediakan legenda dots status (`Pending`, `Rejected`, `Draft`).
    *   Menampilkan ringkasan total rencana anggaran (`Total Budget Plan`) di bagian tengah.
    *   Tombol aksi **"Download Timeline"** dengan icon download.

---

## 4. Struktur Database & Model Relasi

### Model `MarketingPlan`
*   `id`: Primary Key (Autoincrement / UUID)
*   `title`: Nama campaign/event
*   `companyId` / `company`: Relasi ke perusahaan (PT) penyelenggara
*   `brandId` / `brand`: Relasi ke brand yang dipromosikan
*   `branchId` / `branch`: Kantor cabang terkait
*   `start_date` / `end_date`: Periode persiapan/CTA campaign
*   `event_start_date` / `event_end_date`: Periode aktual berjalannya event/campaign
*   `total_budget`: Anggaran yang direncanakan
*   `status`: Enum (`APPROVED`, `PENDING_APPROVAL`, `REJECTED`, `DRAFT`)
*   `doc_url`: URL dokumen pendukung/proposal marketing
*   `items`: Relasi One-to-Many ke detail item anggaran (`MarketingItem`)

### Model `MarketingItem`
*   `id`: Primary Key
*   `planId`: Relasi ke `MarketingPlan`
*   `event_location_id` / `event_location`: Lokasi pelaksanaan
*   `qty`: Kuantitas item
*   `unit_price`: Harga satuan item
*   `actual_amount`: Realisasi terbayar aktual untuk item tersebut

---

## 5. Validasi & Standar Kode

*   **Pembaruan Data**: Data overview tidak langsung dimuat ulang secara otomatis ketika filter diubah jika terdapat filter besar; gunakan tombol aksi "Proses Data" atau "Refresh" untuk sinkronisasi.
*   **Format Rupiah**: Gunakan `formatIDRCompact()` untuk ringkasan nominal besar pada visualisasi grafis demi efisiensi ruang baca, dan `formatIDR()` untuk angka presisi detail.
*   **Verifikasi**: Selalu jalankan `npx next build` setelah mengubah komponen frontend marketing untuk memastikan integritas parsing compiler Next.js / Turbopack.
