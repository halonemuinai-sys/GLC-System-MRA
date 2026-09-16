#!/bin/bash
# ==============================================================================
# Script Quick Update GLC MRA pada Proxmox VM / LXC
# Otomatis: Git Pull -> Prisma Generate -> Frontend Build -> Restart PM2
# ==============================================================================
set -e

APP_DIR="/var/www/glc-system/GLC-System-MRA"

echo "=== [1/4] Menarik kode terbaru dari Git ==="
cd "$APP_DIR"
git pull origin main

echo "=== [2/4] Sinkronisasi Schema Database (Prisma Generate) ==="
cd "$APP_DIR/backend"
npx prisma generate

echo "=== [3/4] Membangun Frontend Next.js (Incremental Build) ==="
cd "$APP_DIR/frontend"
npm run build

echo "=== [4/4] Merestart Layanan PM2 (Frontend & Backend) ==="
pm2 restart all

echo ""
echo "=========================================================="
echo "✓ Update GLC MRA di Proxmox VM berhasil selesai (~15-20s)!"
echo "=========================================================="
echo ""

