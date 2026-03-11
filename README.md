# Studio Natali - Rezervační Systém

Moderní webová aplikace pro kadeřnické studio s rezervačním systémem, administrací a e-mailovými notifikacemi.

## 🚀 Funkcionality

### Pro Zákazníky
*   **Online rezervace:** Průvodce v 5 krocích (výběr kadeřnice, služeb, termínu, kontakt, potvrzení).
*   **Inteligentní kalendář:** Zobrazuje pouze dostupné termíny, zohledňuje pracovní dobu, pauzy a jiné rezervace.
*   **Rezervační pravidla:** 
    *   **Inteligentní blokování slotů:** Termíny se dočasně zamykají (5 minut) při vyplňování rezervace.
    *   **Vlastní zámky:** Uživatel může znovu vybrat vlastní zamčený slot při návratu zpět v průvodci.
    *   **Client Token System:** SessionStorage token zajišťuje rozlišení vlastních vs. cizích zámků.
    *   Kontrola 24h limitu pro zrušení rezervace.
*   **Galerie:** Lazy-loading obrázků s animacemi.
*   **Responzivní design:** Optimalizováno pro mobily i desktopy, podpora Dark Mode.

### Pro Administrátory / Kadeřnice
*   **Dashboard:** Přehled dnešních rezervací a tržeb.
*   **Správa rezervací:** Kalendářový pohled, schvalování/zamítání rezervací.
*   **Pracovní doba:**
    *   Nastavení běžné pracovní doby.
    *   Výjimky a dovolené (prioritní záložka).
    *   Obědové pauzy.
    *   Read-only pohled na kalendář kolegyně.
*   **Služby & Kategorie:** Správa ceníku a nabídky.
*   **Galerie:** Nahrávání a správa obrázků (alt texty).
*   **Uživatelé:** Správa přístupů (Admin/User role).

## 🛠 Technologie

*   **Backend:** Hono (Node.js/Cloudflare Workers runtime), D1 Database (SQLite).
*   **Frontend:** Hono JSX (Server-side rendering), Tailwind CSS, HTMX, Lucide Icons.
*   **Email:** Vlastní `EmailService` (podpora pro Mock / Resend).
*   **Bezpečnost:** Secure headers, HTTP-only cookies, bcrypt hesla, ochrana proti CSRF/XSS (validace vstupů).

## 📦 Instalace a Spuštění

### 1. Prvotní nastavení
Nainstalujte závislosti:
```bash
npm install
```

### 2. Databáze
Inicializujte databázi a nahrajte seed data (uživatelé, služby):
```bash
npm run db:init
npm run db:seed
```

**Pro aplikaci migrací (např. přidání lock_token):**
```bash
# Migrace jsou automaticky aplikovány při spuštění dev serveru
# Pro manuální aplikaci na produkci viz MIGRATION_GUIDE.md
./migrate-production.sh
```

**Výchozí uživatelé:**
*   **Admin:** `admin0` / `admin123` (změňte heslo v produkci!)
*   **Kadeřnice:** `natali0` / `admin123`
*   **Kadeřnice:** `vilma0` / `admin123`

### 3. Spuštění (Lokální vývoj)
```bash
npm run dev
```
Aplikace poběží na `http://localhost:8787`.

### 4. Testování
Pro spuštění E2E testů (dostupné pouze lokálně):
```bash
# Navštivte v prohlížeči
http://localhost:8787/test
```

### 5. Nasazení na Cloudflare (Produkce)

Pro jednoduché nasazení jsme připravili skript (Windows):

```bash
deploy.bat
```

Nebo manuálně:

1.  **Přihlášení:**
    ```bash
    npx wrangler login
    ```

2.  **Vytvoření databáze (pokud ještě neexistuje):**
    ```bash
    npx wrangler d1 create studio-natali-db
    # Zkopírujte vygenerované ID do wrangler.toml (položka database_id)
    ```

3.  **Nasazení aplikace:**
    ```bash
    npm run deploy
    ```

4.  **Inicializace a nahrání dat:**
    ```bash
    npm run db:init:remote
    npm run db:seed:remote
    ```

## 📧 E-maily
Priorita odesílání je:
1. `MAILER` (`send_email` binding v Cloudflare Workers)
2. `RESEND_API_KEY` (fallback provider)
3. Mock log do konzole (jen když není nakonfigurovaný žádný provider)

Pro čistě Cloudflare režim nastavte Email Routing + `send_email` binding.  
Pozor: Cloudflare Email Workers umí posílat jen na **ověřené destination adresy** v Email Routing (ne libovolně na všechny zákazníky).

## 🔒 Bezpečnostní opatření
*   **Placeholdery:** V přihlašovacím formuláři odstraněny reálné e-maily.
*   **API:** Všechny admin endpointy chráněny middlewarem `requireAuth`.
*   **Validace:** Zod schémata pro vstupy, kontrola 24h storna.
*   **Lock System:** Client token systém brání double-bookingu a umožňuje vlastní slot reselection.

## 🧹 Údržba

### Cleanup zamčených slotů
Pokud v databázi zůstanou persistentní zámky kvůli chybě:

```bash
# Lokální databáze
./cleanup-locks.sh

# Produkční databáze
./cleanup-locks.sh --remote

# Windows
cleanup-locks.bat [--remote]
```

Více informací v [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

## 📝 Sprint Log
*   **Sprint 1:** Security & Core Data (Users, Schema).
*   **Sprint 2:** Reservation Logic (Locks, Wizard).
*   **Sprint 3:** Admin Panel (Working Hours, Calendar).
*   **Sprint 4:** Email Flow & Validation Rules.
*   **Sprint 5:** UI/UX & Gallery Optimization.
