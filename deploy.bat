@echo off
echo ==========================================
echo Studio Natali - Nasazeni na Cloudflare
echo ==========================================

echo [1/5] Overovani prihlaseni...
call npx wrangler whoami
if %errorlevel% neq 0 (
    echo Nejsi prihlasen. Probiha prihlasovani...
    call npx wrangler login
)

echo.
echo [2/5] Instalace zavislosti...
call npm install

echo.
echo [3/5] Build CSS (Tailwind)...
call npm run build:css

echo.
echo [4/5] Nasazeni aplikace...
call npm run deploy

echo.
echo [5/5] Inicializace a nahrani dat do databaze...
set /p choice="Chces inicializovat databazi? (a=ano, n=ne, s=pouze seed): "
if /i "%choice%"=="a" (
    call npm run db:init:remote
    call npm run db:seed:remote
) else if /i "%choice%"=="s" (
    call npm run db:seed:remote
) else (
    echo Preskoceno.
)

echo.
echo ==========================================
echo HOTOVO! Aplikace bezi na Cloudflare.
echo Zkontroluj wrangler.toml pro URL.
echo ==========================================
pause
