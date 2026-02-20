# Změny - Sprint V2 (aktuální)

## Přehled
Komplexní sprint zaměřený na UI perfekci, SEO, SMS notifikace a testování.

### UI Vylepšení
- **Header**: role="banner", aria-label, aria-expanded na hamburger menu, mobilní menu se zavírá po kliknutí na odkaz
- **Footer**: Vylepšený kontrast textu v dark mode (neutral-400 → neutral-300), rel="noopener noreferrer" na sociálních odkazech, aria-label na ikonách
- **Hero H1**: Přepnuto na font-display (Cormorant Garamond)
- **Kontrast**: CSS proměnné text-muted zvýšeny (light: #525252, dark: #b5b5b5)
- **Admin sidebar**: Breakpoint md → lg (1024px), žádné překrývání na tabletech
- **Admin tabulky**: overflow-x-auto pro mobilní zařízení

### SEO
- **Structured data**: JSON-LD HairSalon schema (adresa, GPS, otevírací doba, sameAs)
- **Meta tagy**: og:type, og:locale (cs_CZ), og:site_name, Twitter Cards, geo.region, ICBM, theme-color
- **Canonical URL**: Na všech stránkách
- **noindex**: Admin stránky, obchodní podmínky, GDPR
- **robots.txt**: Blokuje /admin/, /api/, /test
- **sitemap.xml**: 4 veřejné URL
- **SEO Guide**: Kompletní návod pro manuální kroky (SEO_GUIDE.md)

### SMS Notifikace
- **Nový soubor**: src/lib/sms.ts – SMSService s denním limitem
- **Denní limit**: Konfigurovatelný v admin nastavení (výchozí 20/den)
- **Počítadlo**: Nová tabulka sms_daily_counter v D1
- **Integrace**: SMS při potvrzení/odmítnutí rezervace, notifikace kadeřnici
- **API endpoint**: GET /api/sms/status pro zjištění zbývajících SMS
- **Admin UI**: Denní limit pole + sender ID v nastavení
- **Migrace**: migrations/0002_add_sms_counter.sql

### Lucide Ikony
- **Self-hosted**: 49 ikon, 8.8 KB (vs ~200 KB CDN)
- **Build script**: scripts/build-icons.cjs s alias mapováním

### Copywriting
- 7 českých textů přepsáno (bez klišé, lokální zaměření)

### Playwright Testování
- **Screenshot script**: scripts/screenshots.ts (3 viewporty × 2 režimy)
- **Admin testy**: scripts/admin-tests.ts – 36 E2E testů, 100% pass rate
- **Pokrytí**: Auth, navigace, CRUD služby/kategorie, nastavení, responzivita, API, SEO

### Opravy chyb
- **createService**: Odstraněn neexistující slug sloupec z INSERT dotazu
- **Mobile menu**: Hamburger přepíná ikonu menu/x, zavírá menu na klik odkazu

---

# Změny - Systém Zámků Slotů (23. ledna 2026)

## Přehled Problému
Uživatel, který vybral termín a šel na další krok, nemohl se vrátit zpět a znovu vybrat stejný termín, protože byl zablokován jako "locked". Systém nerozlišoval mezi vlastním a cizím zámkem.

## Implementované Řešení

### 1. Databázové změny

#### Schema Updates
- **Nový sloupec:** `lock_token TEXT` v tabulce `reservations`
- **Index:** `idx_reservations_lock_token` pro rychlé vyhledávání

#### Migrace
- Lokální: Automaticky aplikováno
- Produkční: `./migrate-production.sh` nebo manuální SQL příkazy

### 2. Backend Změny

#### `src/types.ts`
- Přidána property `lock_token: string | null` do `Reservation` interface

#### `src/lib/db.ts` - funkce `createLock()`
**Nové chování:**
```typescript
createLock(db, userId, date, time, duration, clientToken)
```

1. Vyčistí expirované zámky
2. Zkontroluje existující vlastní zámek → prodlouží ho
3. Smaže ostatní zámky od tohoto klienta (změna termínu)
4. Ověří dostupnost slotu
5. Vytvoří nový zámek s `lock_token`

**Return hodnoty:**
- `success: boolean`
- `expiresAt: string`
- `reservationId: number`
- `lockToken: string`
- `reused: boolean` - indikuje prodloužení existujícího zámku

#### `src/routes/api.ts` 

**POST /api/reservations/lock**
- Nový parametr: `clientToken` (required)
- Volá `createLock()` s client tokenem

**POST /api/reservations/unlock**
- Akceptuje buď `reservationId` nebo `clientToken`
- Prefer `clientToken` pro bezpečnější mazání pouze vlastních zámků

**GET /api/reservations?detailed=true**
- Nový parametr: `clientToken` (query string)
- Vrací rozšířené informace o slotech:
  ```typescript
  {
    time: string,
    status: 'available' | 'locked' | 'own-lock',
    lockToken?: string // pouze pro own-lock
  }
  ```

### 3. Frontend Změny

#### `public/reservation-wizard.js`

**Nová funkcionalita:**

1. **Client Token Management**
   ```javascript
   function getClientToken() {
     let token = sessionStorage.getItem('reservationClientToken');
     if (!token) {
       token = 'client_' + crypto.randomUUID();
       sessionStorage.setItem('reservationClientToken', token);
     }
     return token;
   }
   ```

2. **loadTimeSlots()** - vylepšeno
   - Posílá `clientToken` v query stringu
   - Renderuje tři stavy slotů:
     - **Available:** Zelený, klikatelný
     - **Own-lock:** Primary barva s lock ikonou, klikatelný
     - **Locked:** Červený, disabled

3. **nextStep()** - aktualizováno
   - Při vytváření zámku posílá `clientToken`

4. **prevStep()** - nová logika
   ```javascript
   async function prevStep() {
     // ... navigace ...
     
     // Při návratu na krok 3 z kroku 4
     if (currentStep === 3 && previousStep === 4) {
       await loadTimeSlots(); // Znovu načte sloty
       if (selectedTime) {
         // Znovu zvýrazní vybraný čas
         selectTime(selectedTime);
       }
     }
   }
   ```

5. **selectTime()** - vylepšeno
   - Správně odstraňuje všechny CSS třídy před aplikací nových
   - Funguje pro available i own-lock sloty

6. **beforeunload** handler
   - Posílá `clientToken` při unlock requestu

### 4. Vizuální Změny

#### Stavy Slotů
| Stav | Barva | Ikona | Klikatelný |
|------|-------|-------|------------|
| Available | Neutral gray | - | ✅ |
| Own Lock | Primary blue | 🔒 | ✅ |
| Locked | Red | - | ❌ |

**CSS třídy pro "own-lock":**
```css
bg-primary-100 dark:bg-primary-900/30 
text-primary-700 dark:text-primary-300 
hover:bg-primary-200 dark:hover:bg-primary-900/50
border-2 border-primary-400 dark:border-primary-600
```

### 5. Utility Scripts

#### cleanup-locks.sh / cleanup-locks.bat
```bash
# Lokální
./cleanup-locks.sh

# Produkce
./cleanup-locks.sh --remote
```

**Co dělá:**
1. Maže všechny locked rezervace
2. Čistí expirované zámky
3. Zobrazuje statistiky rezervací

#### migrate-production.sh
```bash
./migrate-production.sh
```

**Co dělá:**
1. Přidá `lock_token` sloupec
2. Vytvoří index
3. Vyčistí existující locked rezervace
4. Zobrazí statistiky

### 6. Dokumentace

- **MIGRATION_GUIDE.md** - Kompletní průvodce migracemi
- **README.md** - Aktualizován s informacemi o novém systému
- **AI_MEMORY.md** - Zdokumentována architektura rozhodnutí

## Testování

### Scénáře
1. ✅ Uživatel vybere slot → vidí ho jako "own-lock" při návratu zpět
2. ✅ Uživatel vybere jiný slot → starý zámek se smaže
3. ✅ Jiný uživatel vidí zámek jako "locked" (červený)
4. ✅ Zámek vyprší po 5 minutách → automaticky smazán
5. ✅ Zavření stránky → zámek uvolněn
6. ✅ Refresh stránky → nový clientToken, staré zámky viditelné jako "locked"

### Jak testovat
1. **Lokální:**
   ```bash
   npm run dev
   ```
   Otevřít http://localhost:8787

2. **Dual Session Test:**
   - Otevřít v normálním prohlížeči
   - Otevřít v inkognito módu
   - Vybrat stejný slot v obou → jeden uvidí "own-lock", druhý "locked"

3. **Cleanup Test:**
   ```bash
   ./cleanup-locks.sh
   # Zkontrolovat, že locked sloty zmizely
   ```

## Deployment Checklist

- [x] Lokální migrace aplikována
- [x] Lokální cleanup proveden
- [x] Dev build úspěšný
- [x] Prod build úspěšný (dry-run)
- [x] TypeScript bez chyb
- [x] Dokumentace vytvořena
- [ ] Produkční migrace (`./migrate-production.sh`)
- [ ] Deploy (`npm run deploy`)
- [ ] Produkční cleanup pokud potřeba (`./cleanup-locks.sh --remote`)

## Soubory Změněny

### Nové
- `migrations/0001_add_lock_token.sql`
- `cleanup-locks.sh`
- `cleanup-locks.bat`
- `migrate-production.sh`
- `MIGRATION_GUIDE.md`
- `CHANGES.md` (tento soubor)

### Upravené
- `schema.sql` - přidán lock_token a index
- `src/types.ts` - přidán lock_token do Reservation
- `src/lib/db.ts` - vylepšen createLock(), getAvailableSlots()
- `src/routes/api.ts` - aktualizovány lock/unlock endpointy, slots endpoint
- `public/reservation-wizard.js` - client token system, slot reselection
- `README.md` - aktualizována dokumentace
- `AI_MEMORY.md` - zdokumentována architektura
