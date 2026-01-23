#!/bin/bash

echo "=========================================="
echo "Studio Natali - Nasazeni na Cloudflare"
echo "=========================================="

echo "[1/5] Overovani prihlaseni..."
npx wrangler whoami
if [ $? -ne 0 ]; then
    echo "Nejsi prihlasen. Probiha prihlasovani..."
    npx wrangler login
fi

echo ""
echo "[2/5] Instalace zavislosti..."
npm install

echo ""
echo "[3/5] Build CSS (Tailwind)..."
npm run build:css

echo ""
echo "[4/5] Nasazeni aplikace..."
npm run deploy

echo ""
echo "[5/5] Inicializace a nahrani dat do databaze..."
read -p "Chces inicializovat databazi? (a=ano, n=ne, s=pouze seed): " choice
case "$choice" in
  a|A ) npm run db:init:remote && npm run db:seed:remote;;
  s|S ) npm run db:seed:remote;;
  * ) echo "Preskoceno.";;
esac

echo ""
echo "=========================================="
echo "HOTOVO! Aplikace bezi na Cloudflare."
echo "Zkontroluj wrangler.toml pro URL."
echo "=========================================="
