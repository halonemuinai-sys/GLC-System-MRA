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
# Restart frontend
pm2 restart glc-frontend || pm2 start node_modules/next/dist/bin/next --name "glc-frontend" -- start -p 3001
# Restart backend
pm2 restart glc-backend || pm2 start api/index.js --name "glc-backend"

pm2 save

echo ""
echo "✓ Deployment selesai dengan sukses!"
echo "  Frontend berjalan pada port: 3001 (Reverse Proxied oleh Nginx ke Port 80)"
echo "  Backend berjalan pada port:  5005 (Reverse Proxied oleh Nginx ke /api)"
echo ""
