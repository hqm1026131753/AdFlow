#!/bin/bash
set -e

echo "=== AdFlow Update Started ==="
cd /var/www/adflow

echo "[1/6] Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "[2/6] Installing dependencies..."
pnpm install

echo "[3/6] Building backend..."
cd apps/api
pnpm build || npx tsc --outDir dist
cd ../..

echo "[4/6] Building frontend..."
cd apps/web
pnpm build
cd ../..

echo "[5/6] Restarting API server..."
pm2 restart adflow-api || pm2 start deploy/pm2.config.cjs

echo "[6/6] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "=== AdFlow Update Complete ==="
