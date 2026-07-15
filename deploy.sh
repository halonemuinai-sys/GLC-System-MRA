#!/bin/bash
# Script deployment otomatis GLC MRA - jalankan di server: bash deploy.sh
set -e

APP_DIR="/var/www/glc-system/GLC-System-MRA"

echo "=== [1/5] Menarik kode terbaru dari Git ==="
cd "$APP_DIR"
git pull origin main

echo "=== [2/5] Membangun Frontend Next.js ==="
cd "$APP_DIR/frontend"
npm install --prefer-offline
npm run build

echo "=== [3/5] Menginstal dependensi Backend & Regenerasi Prisma ==="
cd "$APP_DIR/backend"
npm install --prefer-offline
npx prisma generate

echo "=== [4/5] Merestart Backend & Frontend via PM2 ==="
# Hapus PM2 lama agar konfigurasi baru dari ecosystem.config.js diterapkan bersih
pm2 delete glc-frontend || true
pm2 delete glc-backend || true

# Start menggunakan file konfigurasi ekosistem PM2
pm2 start "$APP_DIR/ecosystem.config.js"

pm2 save

echo ""
echo "✓ Deployment selesai dengan sukses!"
echo "  Frontend berjalan pada port: 3001 (Reverse Proxied oleh Nginx ke Port 80)"
echo "  Backend berjalan pada port:  5005 (Reverse Proxied oleh Nginx ke /api)"
echo ""
