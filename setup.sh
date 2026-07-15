#!/bin/bash

# ==============================================================================
# SCRIPT SETUP OTOMATIS: GLC MRA INTEGRATED SYSTEM
# OS Target: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (Proxmox LXC/VM)
# ==============================================================================

# Hentikan eksekusi jika ada error
set -e

echo "=== 1. UPDATE & UPGRADE SYSTEM ==="
sudo apt update && sudo apt upgrade -y

echo "=== 2. INSTALL PREREQUISITES ==="
sudo apt install -y curl git nginx build-essential

echo "=== 3. INSTALL NODE.JS 20 (LTS) ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== 4. VERIFIKASI INSTALASI ==="
node -v
npm -v

echo "=== 5. INSTALL PM2 (PROCESS MANAGER) ==="
sudo npm install -g pm2

echo "=== 6. MENYIAPKAN FOLDER APLIKASI ==="
sudo mkdir -p /var/www/glc-system
sudo chown -R $USER:$USER /var/www/glc-system
cd /var/www/glc-system

echo "=== 7. CLONE REPOSITORI ==="
if [ ! -d "GLC-System-MRA" ]; then
  git clone https://github.com/halonemuinai-sys/GLC-System-MRA.git GLC-System-MRA
fi
cd GLC-System-MRA

echo "=== 8. INSTALL DEPENDENSI BACKEND & RUN PRISMA GENERATE ==="
cd backend
npm install
# Generator ORM Prisma wajib dijalankan untuk menyinkronkan client database PostgreSQL
npx prisma generate
cd ..

echo "=== 9. INSTALL DEPENDENSI FRONTEND & BUILD NEXT.JS ==="
cd frontend
npm install

# Membuat file environment default untuk Next.js
if [ ! -f ".env" ]; then
  echo "NEXT_PUBLIC_API_URL=\"/api\"" > .env
fi

npm run build
cd ..

echo "=== 10. KONFIGURASI PM2 STARTUP ==="
# Membuat PM2 menyala otomatis saat server boot/restart
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || true

echo "=== 11. KONFIGURASI NGINX REVERSE PROXY ==="
# Membuat konfigurasi blok server Nginx
cat << 'EOF' > /tmp/glc-nginx.conf
server {
    listen 80;
    server_name glc.mra.local; # Ganti dengan IP LXC Proxmox atau FQDN Domain Anda

    # Frontend Next.js Server (Port 3001)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API Proxy (Port 5005)
    location /api/ {
        proxy_pass http://localhost:5005/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo mv /tmp/glc-nginx.conf /etc/nginx/sites-available/glc-system
sudo ln -sf /etc/nginx/sites-available/glc-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true

echo ""
echo "=== SETUP SELESAI ==="
echo "Langkah selanjutnya yang harus Anda lakukan manual:"
echo "1. Konfigurasikan file env backend:"
echo "   nano /var/www/glc-system/GLC-System-MRA/backend/.env"
echo "   (Pastikan menambahkan DATABASE_URL, DIRECT_URL, JWT_SECRET, PORT=5005, dsb.)"
echo ""
echo "2. Jalankan backend & frontend menggunakan PM2:"
echo "   cd /var/www/glc-system/GLC-System-MRA/backend"
echo "   pm2 start api/index.js --name \"glc-backend\""
echo "   cd ../frontend"
echo "   pm2 start node_modules/next/dist/bin/next --name \"glc-frontend\" -- start -p 3001"
echo "   pm2 save"
echo ""
echo "3. Uji dan restart Nginx:"
echo "   sudo nginx -t && sudo systemctl restart nginx"
echo ""
