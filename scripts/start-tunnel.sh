#!/bin/bash
# Instagram OAuth icin API'yi public URL ile expose eder
# Kullanim: ./scripts/start-tunnel.sh
# Cikti URL'i Meta'da Redirect URI olarak ekle: https://XXX/auth/instagram/callback

echo "Tunnel baslatiliyor (port 4000)..."
echo "API'nin calistigindan emin ol: pnpm dev"
echo ""
npx --yes localtunnel --port 4000
