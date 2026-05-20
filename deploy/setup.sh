#!/bin/bash
set -e

echo "=== AdFlow Server Setup ==="

# 1. 安装 Node.js 20+ (使用 fnm)
echo "[1/8] Installing Node.js..."
curl -fsSL https://fnm.vercel.app/install | bash
export PATH="$HOME/.local/share/fnm:$PATH"
eval "$(fnm env)"
fnm install 20
fnm use 20
fnm default 20

# 2. 安装 pnpm
echo "[2/8] Installing pnpm..."
npm install -g pnpm

# 3. 安装 pm2
echo "[3/8] Installing pm2..."
npm install -g pm2

# 4. 安装 Nginx
echo "[4/8] Installing Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# 5. 克隆项目
echo "[5/8] Cloning project..."
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/hqm1026131753/AdFlow.git adflow
cd adflow

# 6. 配置环境变量
echo "[6/8] Setting up environment..."
cp apps/api/.env.example apps/api/.env
echo "请编辑 apps/api/.env 填入你的 API 密钥"

# 7. 构建
echo "[7/8] Building project..."
pnpm install
cd apps/api
pnpm build || npx tsc --outDir dist
cd ../web
pnpm build
cd ../..

# 8. 配置 Nginx + pm2
echo "[8/8] Configuring services..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/adflow
sudo ln -sf /etc/nginx/sites-available/adflow /etc/nginx/sites-enabled/adflow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

mkdir -p logs
pm2 start deploy/pm2.config.cjs
pm2 save
pm2 startup systemd

echo "=== Setup Complete ==="
echo "请编辑 /var/www/adflow/apps/api/.env 填入 API 密钥后运行 ./deploy/update.sh"
