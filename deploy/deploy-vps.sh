#!/usr/bin/env bash
# FETS Accounts — deploy to Hostinger VPS.
# Usage:
#   VPS_HOST=1.2.3.4 [VPS_USER=root] [VPS_PATH=/var/www/fets-accounts] bash deploy/deploy-vps.sh
# Optional: VPS_SSH_OPTS="-i ~/.ssh/mykey" for key auth.
set -euo pipefail

: "${VPS_HOST:?Set VPS_HOST to your VPS IP or hostname}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/var/www/fets-accounts}"
VPS_SSH_OPTS="${VPS_SSH_OPTS:-}"

cd "$(dirname "$0")/.."

echo "== Building production bundle =="
npm run build

echo "== Uploading to $VPS_USER@$VPS_HOST:$VPS_PATH =="
ssh $VPS_SSH_OPTS "$VPS_USER@$VPS_HOST" "mkdir -p '$VPS_PATH'"
scp $VPS_SSH_OPTS -r dist/. "$VPS_USER@$VPS_HOST:$VPS_PATH/"

echo
echo "Upload complete. First-time server setup (once):"
echo "  ssh $VPS_USER@$VPS_HOST"
echo "  apt install -y nginx && mkdir -p $VPS_PATH"
echo "  # put deploy/nginx-fets-accounts.conf into /etc/nginx/sites-available/fets-accounts"
echo "  ln -s /etc/nginx/sites-available/fets-accounts /etc/nginx/sites-enabled/"
echo "  nginx -t && systemctl reload nginx"
echo "  certbot --nginx -d <your-domain>   # free HTTPS"
