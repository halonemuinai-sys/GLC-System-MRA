#!/bin/bash
# Script Quick Update GLC MRA (Cepat & Ringan - tanpa download ulang node_modules)
set -e

APP_DIR="/var/www/glc-system/GLC-System-MRA"

echo "=== [1/3] Menarik kode terbaru dari Git ==="
cd "$APP_DIR"
git pull origin main

echo "=== [2/3] Membangun Frontend Next.js (Incremental Build) ==="
cd "$APP_DIR/frontend"
npm run build

echo "=== [3/3] Merestart PM2 (Frontend & Backend) ==="
pm2 restart all

echo ""
echo "✓ Quick update berhasil dan selesai dalam hitungan detik!"
echo ""
