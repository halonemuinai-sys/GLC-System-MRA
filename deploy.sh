#!/bin/bash
# Script deployment otomatis GLC MRA - jalankan di server: bash deploy.sh
set -e

APP_DIR="/var/www/glc-system/GLC-System-MRA"

echo "=== [1/6] Membersihkan proses port 3001 & 5005 yang menggantung ==="
# Hentikan semua process node/npm yang mengunci port frontend (3001) dan backend (5005)
sudo fuser -k 3001/tcp || true
sudo fuser -k 5005/tcp || true

echo "=== [2/6] Memperbaiki Hak Akses Folder ==="
# Pastikan user ubuntu24 memiliki kepemilikan penuh atas semua file
sudo chown -R ubuntu24:ubuntu24 "$APP_DIR" || true

echo "=== [3/6] Menarik kode terbaru dari Git ==="
cd "$APP_DIR"
git pull origin main

echo "=== [4/6] Membangun Frontend Next.js (Clean Build) ==="
cd "$APP_DIR/frontend"
# Hapus cache build lama agar tidak terjadi Chunk Mismatch / Turbopack crash
rm -rf .next
npm install --prefer-offline
npm run build

echo "=== [5/6] Menginstal dependensi Backend & Regenerasi Prisma ==="
cd "$APP_DIR/backend"
npm install --prefer-offline
npx prisma generate

echo "=== [6/6] Merestart Backend & Frontend via PM2 ==="
# Hapus PM2 lama agar konfigurasi baru dari ecosystem.config.js diterapkan bersih
pm2 delete glc-frontend || true
pm2 delete glc-backend || true

# Start menggunakan file konfigurasi ekosistem PM2
pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

echo ""
echo "✓ Deployment selesai dengan sukses!"
echo "  Frontend berjalan pada port: 3001 (Managed by PM2 directly)"
echo "  Backend berjalan pada port:  5005"
echo ""
