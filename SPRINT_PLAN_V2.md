# Sprint Plan v2 – Studio Natali

> **Datum:** 20. února 2026  
> **Stav:** Aktivní sprint

---

## 1. Optimalizace scrollování a výkonu stránky

**Status: ✅ Implementováno**

### Provedené optimalizace

| Problém | Řešení | Soubor |
|---------|--------|--------|
| Render-blocking skripty (HTMX, Lucide) | Přidáno `defer` na oba `<script>` tagy | `Layout.tsx` |
| `backdrop-blur-md` na fixed headeru způsoboval jank při scrollu | Vytvořena třída `.header-blur` s `transform: translateZ(0)` a `backface-visibility: hidden` pro GPU akceleraci | `Layout.tsx` |
| `will-change: opacity, transform` permanentně na `.animate-on-scroll` – blokoval paměť GPU | `will-change` se přidává jen těsně před animací a odebírá po jejím skončení | `Layout.tsx` |
| `transition: box-shadow 0.3s` na `.card` – pomalejší než nutné | Zkráceno na `0.2s ease-out` + `transform: translateZ(0)` pro GPU layer | `Layout.tsx` |
| Google Maps iframe se načítal okamžitě (heavy embed) | Lazy-load přes `IntersectionObserver` – iframe src se nastaví až při viditelnosti | `Sections.tsx` |
| Hero obrázek měl `loading="lazy"` (zbytečně zpomaloval LCP) | Změněno na `loading="eager"` + `fetchpriority="high"` + explicit `width/height` | `Sections.tsx` |
| Chybělo `content-visibility: auto` pro offscreen sekce | Přidáno na `.section` s `contain-intrinsic-size: auto 600px` | `Layout.tsx` |
| Scroll listener bez `passive: true` | Přidán rAF-throttled scroll handler s `{ passive: true }` | `Layout.tsx` |
| Chybělo `prefers-reduced-motion` | Přidáno: vypne animace, smooth scroll i btn glow pro uživatele s preferencí | `Layout.tsx` |
| `overflow-x` nerestriktované | Přidáno `overflow-x: hidden` na body | `Layout.tsx` |
| `clip-path` polygon bez GPU hintu na blob maskách | Přidáno `transform: translateZ(0)` na `.blob-mask-*` třídy | `Sections.tsx` |

### Doporučení pro další sprint
- Zvážit self-hosting Lucide ikon (subset) místo stahování celé lib z CDN
- Přidat `<link rel="preload">` pro hero obrázek
- Zvážit přechod na `tailwindcss v4` pro menší output CSS

---

## 2. Design audit (Light / Dark mode)

**Status: ✅ Hotovo (manuální review kódu)**

> Pozn.: Screenshoty nelze automaticky generovat v Cloudflare Workers prostředí bez headless prohlížeče. Níže je kompletní designový audit všech stránek na základě kódu. Pro budoucí automatické screenshoty je na konci kapitoly postup s Playwright.

### 2.1 Přehled stránek

| Stránka | Route | Dark mode | Light mode |
|---------|-------|-----------|------------|
| Homepage | `/` | ✅ | ✅ |
| Rezervace | `/rezervace` | ✅ | ✅ |
| Obchodní podmínky | `/obchodni-podminky` | ✅ | ✅ |
| Zpracování údajů | `/zpracovani-udaju` | ✅ | ✅ |
| Admin Login | `/admin/login` | ✅ | ✅ |
| Admin Dashboard | `/admin/dashboard` | ✅ | ✅ |
| Admin Služby | `/admin/sluzby` | ✅ | ✅ |
| Admin Galerie | `/admin/galerie` | ✅ | ✅ |
| Admin Uživatelé | `/admin/uzivatele` | ✅ | ✅ |
| Admin Pracovní doba | `/admin/pracovni-doba` | ✅ | ✅ |
| Admin Nastavení | `/admin/nastaveni` | ✅ | ✅ |

### 2.2 Typografie – hodnocení

| Prvek | Font | Velikost | Hodnocení |
|-------|------|----------|-----------|
| H1 (Hero) | Nunito Sans | `text-5xl` → `lg:text-7xl` | ⚠️ Hero H1 by měl být `font-display` (Cormorant Garamond) pro eleganci, nyní je `font-sans` |
| H2 (Section titles) | Cormorant Garamond | `2rem` → `md:2.5rem` | ✅ Elegantní, odpovídá brandingu |
| Body text | Nunito Sans | `text-lg` / `text-sm` | ✅ Dobré |
| Navigace | Nunito Sans | `font-medium` | ✅ Čistý |
| Buttony | Nunito Sans | `font-medium` / `font-weight: 500` | ✅ OK |

#### Nalezené problémy a doporučení

1. **Hero H1** – `font-sans` by měl být `font-display` pro konzistenci s ostatními nadpisy
2. **Section subtitle** – chybí `leading-relaxed` na delších textech v About sekci
3. **Footer** – texty `text-sm` v patičce jsou na mobilu trochu malé, zvážit `text-base`
4. **Team karty** – `max-h-56` na fotce member – může oříznout nevhodně, zvážit `max-h-64`

### 2.3 Barevný systém – hodnocení

| Kontext | Light mode | Dark mode | WCAG AA? |
|---------|------------|-----------|:---:|
| Primary CTA button | `bg-[#171717]` / `text-white` | `bg-[#b8936a]` / `text-[#171717]` | ✅ / ✅ |
| Body text | `#262626` na `#f8f4ef` | `#f5f5f5` na `#171717` | ✅ / ✅ |
| Muted text | `#737373` na `#f8f4ef` | `#a3a3a3` na `#171717` | ⚠️ Hraniční (~4.1:1) |
| Card border | `rgba(184,147,106,0.12)` | – | ✅ Subtilní |
| Primary-600 text | `#a67d5a` na `#f8f4ef` | `#c9ac86` na `#171717` | ⚠️ Hraniční (3.8:1) |

#### Doporučení
1. **Muted texty**: `text-neutral-500` → `text-neutral-600` / `dark:text-neutral-400` → `dark:text-neutral-300`
2. **Primary-600 na světlém pozadí**: pro delší texty použít `primary-700` nebo `primary-800`
3. Některé `hover:` stavy nemají dark mode variantu

### 2.4 Screenshotovací postup (pro budoucnost)

```bash
# 1. Nainstalovat Playwright
npm install -D @playwright/test
npx playwright install chromium

# 2. Vytvořit skript scripts/screenshots.ts:
```

```typescript
// scripts/screenshots.ts
import { chromium } from '@playwright/test';

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'rezervace', path: '/rezervace' },
  { name: 'podminky', path: '/obchodni-podminky' },
  { name: 'admin-login', path: '/admin/login' },
];

async function captureScreenshots() {
  const browser = await chromium.launch();

  for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: mode as 'light' | 'dark',
    });

    for (const page of PAGES) {
      const p = await context.newPage();
      await p.goto(`http://localhost:8787${page.path}`);
      await p.waitForTimeout(2000); // čekat na fonty a animace
      await p.screenshot({
        path: `screenshots/${mode}/${page.name}.png`,
        fullPage: true,
      });
      await p.close();
    }
    await context.close();
  }
  await browser.close();
}

captureScreenshots();
```

```bash
# 3. Spustit dev server a poté screenshoty
npm run dev &
npx tsx scripts/screenshots.ts
```

---

## 3. Copywriting audit

**Status: ✅ Hotovo**

### 3.1 Hodnocení textů z pohledu copywritera

| Text | Kde | Hodnocení | Problém | Navrhovaná oprava |
|------|-----|:---------:|---------|-------------------|
| „Profesionální péče o vaše vlasy v příjemném prostředí. Přijďte k nám a odejděte s úsměvem." | Hero subtitle | ⚠️ | Klišé „odejděte s úsměvem" – generické, nic neříkající | „Vaše vlasy si zaslouží pozornost, na kterou se budete těšit. Přes 10 let v Říčanech." |
| „Profesionální péče o vaše vlasy v příjemném prostředí. Navštivte nás a odejděte s úsměvem." | Footer description | ⚠️ | Téměř totožné s hero – duplikát | „Kadeřnický salon s tradicí v srdci Říčan. Střih, barva i péče na jednom místě." |
| „Připraveni na změnu?" | CTA sekce title | ⚠️ | Generické klišé | „Máte chuť na nový vzhled?" |
| „Zarezervujte si termín online a my se o vás rádi postaráme. Těšíme se na vaši návštěvu!" | CTA description | ⚠️ | „Těšíme se na vaši návštěvu" – klišé | „Online rezervace zabere minutu. Vyberte kadeřnici, termín a přijďte." |
| „Vítejte ve Studio Natali, vašem kadeřnickém salonu s více než 10letou tradicí." | About p1 | ⚠️ | „Vítejte" na webu je zbytečné | „Studio Natali funguje v Říčanech u Prahy přes 10 let. Za tu dobu jsme se postaraly o tisíce spokojených klientek." |
| „Naším posláním je přinášet krásu a sebevědomí každému klientovi" | About p1 | ⚠️ | Corporate klišé | Sloučit s opravou výše |
| „V příjemném a moderním prostředí" | About p3 | ⚠️ | „příjemné a moderní prostředí" | „Odpočiňte si u nás od shonu. Salon je klimatizovaný, nabízíme kávu a Wi-Fi." |
| „Seznamte se s našimi odbornicemi, které se o vás postarají." | Team subtitle | ⚠️ | „seznamte se" – pasivní | „Dvě kadeřnice. Každá s vlastním stylem a rukopisem." |
| „Máte dotaz nebo potřebujete poradit? Neváhejte nás kontaktovat." | Contact subtitle | ⚠️ | „Neváhejte" – zbytečný tlumič | „Napište nám nebo zavolejte – rádi poradíme." |
| „Nabízíme kompletní péči o vaše vlasy" | Services subtitle | ✅ | Funkční, stručné | – |
| „Dámské, pánské a dětské střihy od zkušených kadeřnic." | Service descriptions | ✅ | Funkční | – |
| „Prohlédněte si naše práce" | Gallery subtitle | ✅ | OK | – |
| Texty v rezervačním wizardu | Reservation | ✅ | UX-friendly, jasné | – |
| Obchodní podmínky + GDPR | Legal pages | ✅ | Právně korektní | – |

### 3.2 Shrnutí

**Hlavní problémy:**
1. **Duplicitní texty** – hero subtitle ≈ footer description
2. **Klišé fráze** – „odejděte s úsměvem", „přinášet krásu a sebevědomí", „příjemné prostředí"
3. **Pasivní oslovení** – „neváhejte", „vítejte", „seznamte se"
4. **Chybí lokální kotvení** – texty nezmiňují Říčany u Prahy (důležité pro SEO)
5. **Chybí konkrétní benefity** – co je na salonu unikátní?

**Co funguje dobře:**
- Service descriptions jsou stručné a funkční
- CTAs jsou jasné (Rezervovat termín)
- Wizard texty jsou UX-friendly
- Legal texty jsou kompletní a korektní

> Opravy textů doporučuji implementovat po schválení klientem – jde o brand voice.

---

## 4. Nastavení domény z Wedos na Cloudflare

**Status: ✅ Návod hotov**

### 4.1 Předpoklady
- Doména registrovaná u **Wedos** (např. `studionatali-ricany.cz`)
- Účet na **Cloudflare** (free plan stačí)
- Nasazený Cloudflare Worker (`studio-natali-hono`)

### 4.2 Krok za krokem

#### A) Přidání domény na Cloudflare

1. Přihlaste se na [dash.cloudflare.com](https://dash.cloudflare.com)
2. Klikněte **„Add a site"**
3. Zadejte doménu: `studionatali-ricany.cz`
4. Vyberte **Free plan**
5. Cloudflare naskenuje DNS – nechte je zatím být
6. Cloudflare ukáže **2 nameservery**, např.:
   ```
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```

#### B) Změna nameserverů na Wedos

1. Přihlaste se na [client.wedos.com](https://client.wedos.com)
2. Jděte do **Domény** → vyberte doménu
3. Klikněte na **DNS servery** / „Nameservery"
4. **Smažte stávající** Wedos NS (`ns.wedos.com`, `ns2.wedos.com`)
5. **Přidejte Cloudflare NS**:
   ```
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
6. Uložte
7. Propagace: **1–48 hodin** (typicky ~15 min pro .cz)

#### C) DNS záznamy na Cloudflare

| Typ | Název | Obsah | Proxy |
|-----|-------|-------|:---:|
| `CNAME` | `@` | `studio-natali-hono.VAŠE_SUBDOMÉNA.workers.dev` | ✅ Proxied |
| `CNAME` | `www` | `studionatali-ricany.cz` | ✅ Proxied |
| `TXT` | `@` | `v=spf1 include:_spf.seznam.cz ~all` | – |
| `MX` | `@` | `mx1.seznam.cz` (priorita 10) | – |
| `MX` | `@` | `mx2.seznam.cz` (priorita 20) | – |

#### D) Přiřazení domény k Workeru

Na Cloudflare dashboardu:  
**Workers & Pages** → `studio-natali-hono` → **Settings** → **Domains & Routes** → **Add** → **Custom Domain** → `studionatali-ricany.cz`

Nebo v `wrangler.toml`:
```toml
routes = [
  { pattern = "studionatali-ricany.cz/*", custom_domain = true }
]
```

Poté nasadit:
```bash
npx wrangler deploy
```

#### E) SSL/TLS

1. Cloudflare → **SSL/TLS** → **Full (strict)**
2. Zapněte **Always Use HTTPS**
3. Zapněte **Automatic HTTPS Rewrites**

#### F) Redirect www → root

Cloudflare → **Rules** → **Redirect Rules** → nové pravidlo:
- Pokud: hostname = `www.studionatali-ricany.cz`
- Pak: 301 redirect na `https://studionatali-ricany.cz${http.request.uri.path}`

#### G) Ověření

```bash
# Po propagaci NS
dig studionatali-ricany.cz NS
# → Cloudflare nameservery

curl -I https://studionatali-ricany.cz
# → 200 OK s CF headery
```

### 4.3 Poznámky

- **Webhosting Wedos není třeba** – vše běží na Cloudflare Workers
- U Wedos ponechte pouze **registraci domény** (prodlužování)
- .cz domény: CZ.NIC aktualizuje NS cca 2× denně
- Po přesunu NS ztratíte Wedos e-mailový hosting → proto MX záznamy výše

---

## 5. Nastavení e-mailu ze Seznam.cz

**Status: ✅ Návod hotov**

### 5.1 Architektura

Cloudflare Workers **neumí** přímo SMTP spojení. Dostupné metody:

| Metoda | Cena | Doporučení |
|--------|------|------------|
| **MailChannels** (přes CF Workers) | Zdarma | ✅ Pro produkci |
| **Resend.com** API | 100 emailů/den zdarma | ✅ Pro začátek |
| **SMTP relay** přes proxy | Závisí | ❌ Overkill |

### 5.2 Co nastavit na Seznam.cz

1. Přihlaste se na [email.seznam.cz](https://email.seznam.cz) → `info@studionatali-ricany.cz`
2. **Nastavení** → **IMAP/POP3 a SMTP** → povolte SMTP
3. Parametry:
   - Server: `smtp.seznam.cz`
   - Port: `465` (SSL) nebo `587` (STARTTLS)
   - Uživatel: `info@studionatali-ricany.cz`
   - Heslo: heslo k e-mailu

### 5.3 Bezpečné uložení hesla

#### Lokálně (`.dev.vars` – nikdy necommitovat!)

```env
# .dev.vars (v kořenu projektu, přidejte do .gitignore!)
SMTP_PASS=heslo_ze_seznamu
RESEND_API_KEY=re_xxxxxxxxxxxxxx
```

#### Na serveru (Cloudflare Secrets – šifrované)

```bash
# SMTP heslo
npx wrangler secret put SMTP_PASS
# → zadejte heslo a potvrďte

# Volitelně: Resend API klíč
npx wrangler secret put RESEND_API_KEY
```

> **Bezpečnost Cloudflare Secrets:**
> - ✅ Šifrované v Cloudflare infrastruktuře
> - ✅ Neviditelné v dashboardu (zobrazí se jen `***`)
> - ✅ Nepřístupné přes API / logy
> - ✅ AI ani třetí strany k nim nemají přístup
> - ✅ Dostupné jen za runtime přes `env.SMTP_PASS`

### 5.4 DNS záznamy pro e-mail (na Cloudflare)

| Typ | Název | Obsah |
|-----|-------|-------|
| `MX` | `@` | `mx1.seznam.cz` (priorita 10) |
| `MX` | `@` | `mx2.seznam.cz` (priorita 20) |
| `TXT` | `@` | `v=spf1 include:_spf.seznam.cz ~all` |

Pokud používáte i Resend, rozšiřte SPF:
```
v=spf1 include:_spf.seznam.cz include:amazonses.com ~all
```

### 5.5 Ověření `.gitignore`

Ujistěte se, že `.gitignore` obsahuje:
```
.dev.vars
.wrangler
node_modules
```

### 5.6 Doporučený postup pro produkci

1. Zaregistrujte se na [resend.com](https://resend.com) (zdarma do 100 e-mailů/den)
2. Přidejte doménu `studionatali-ricany.cz` → ověřte DNS záznamy
3. `npx wrangler secret put RESEND_API_KEY`
4. Kód v `src/lib/email.ts` již podporuje Resend jako fallback

---

## 6. SMS API služby pro ČR

**Status: ✅ Výzkum hotov**

### 6.1 Srovnání poskytovatelů

| Poskytovatel | Cena/SMS (bez DPH) | Měsíční paušál | API | Web |
|-------------|-------------------|----------------|-----|-----|
| **SMSBrána** | **1,08 Kč** (min. 0,89 Kč s bonusy) | 0 Kč | REST | [smsbrana.cz](https://www.smsbrana.cz) |
| **BulkGate** | **0,76–1,08 Kč** dle operátora | 0 Kč (+ max 400 Kč/měs za custom odesílatele) | REST | [bulkgate.com/cs](https://www.bulkgate.com/cs/) |
| **GoSMS** | ~1,10–1,50 Kč (nepublikují veřejně) | 0 Kč | REST | [gosms.eu](https://www.gosms.eu/cs/) |
| **Twilio** | **~1,53 Kč** ($0.0666) | ~280 Kč ($12/měsíc za číslo) | REST | [twilio.com](https://www.twilio.com) |

### 6.2 Doporučení: SMSBrána

**Proč:**
- Žádné měsíční poplatky
- České řešení, česká podpora (+420 533 533 332)
- REST API
- Textový odesílatel „InfoSMS" zdarma
- Kredit platí 14 měsíců

### 6.3 Ceník SMSBrána

| Dobití | Bonus | Cena/SMS |
|--------|-------|----------|
| Do 2 500 Kč | 0% | 1,08 Kč |
| 2 500 Kč+ | 3% | 1,05 Kč |
| 5 000 Kč+ | 5% | 1,03 Kč |
| 10 000 Kč+ | 9% | 0,99 Kč |
| 30 000 Kč+ | 14% | 0,95 Kč |
| 100 000 Kč+ | 22% | 0,89 Kč |

### 6.4 Odhad nákladů pro Studio Natali

| Typ SMS | Odhadovaný objem/měsíc | Cena |
|---------|------------------------|------|
| Potvrzení rezervace | ~30–50 | ~33–54 Kč |
| Připomínka den předem | ~30–50 | ~33–54 Kč |
| Notifikace kadeřnici | ~30–50 | ~33–54 Kč |
| **CELKEM** | **~90–150 SMS** | **~100–162 Kč/měsíc** |

### 6.5 Implementační návod

#### A) Registrace a kredity

1. Zaregistrujte se na [smsbrana.cz/registration](https://www.smsbrana.cz/registration)
2. V portálu získáte **login** a **HTTP API heslo**
3. Dobijte kredit (doporučeno min. 500 Kč)

#### B) Nastavení secrets

```bash
# Produkce
npx wrangler secret put SMS_API_LOGIN
npx wrangler secret put SMS_API_PASSWORD

# Lokálně (.dev.vars)
# SMS_API_LOGIN=vas_login
# SMS_API_PASSWORD=vase_http_heslo
```

#### C) Kód – `src/lib/sms.ts`

```typescript
import { Env } from '../types';

export class SmsService {
  private env: Env;
  constructor(env: Env) { this.env = env; }

  async send(phone: string, message: string): Promise<boolean> {
    if (!this.env.SMS_API_LOGIN || !this.env.SMS_API_PASSWORD) {
      console.log('[SMS Mock]', phone, message);
      return true;
    }

    try {
      const url = new URL('https://http-api.smsmanager.com/Send');
      url.searchParams.set('login', this.env.SMS_API_LOGIN);
      url.searchParams.set('password', this.env.SMS_API_PASSWORD);
      url.searchParams.set('number', phone.replace(/\s/g, ''));
      url.searchParams.set('message', message);

      const res = await fetch(url.toString());
      const text = await res.text();
      
      if (res.ok) {
        console.log('SMS sent to:', phone);
        return true;
      }
      console.error('SMS failed:', text);
      return false;
    } catch (e) {
      console.error('SMS error:', e);
      return false;
    }
  }

  async notifyWorker(workerPhone: string, customerName: string, date: string, time: string) {
    return this.send(workerPhone,
      `Nova rezervace: ${customerName}, ${date} v ${time}. Zkontrolujte admin panel.`);
  }

  async confirmReservation(customerPhone: string, date: string, time: string) {
    return this.send(customerPhone,
      `Studio Natali: Vase rezervace na ${date} v ${time} byla potvrzena. Tesime se na Vas!`);
  }

  async sendReminder(customerPhone: string, time: string) {
    return this.send(customerPhone,
      `Studio Natali: Pripominame zitrejsi navstevu v ${time}. Zmena: +420 774 889 606`);
  }
}
```

#### D) Úprava `types.ts`

Přidat do `Env`:
```typescript
SMS_API_LOGIN?: string;
SMS_API_PASSWORD?: string;
```

---

## 7. Souhrnné akce pro další sprint

| # | Akce | Priorita | Odhad |
|---|------|:--------:|-------|
| 1 | Přesunout NS z Wedos na Cloudflare | 🔴 | 30 min |
| 2 | Nastavit Cloudflare secrets (SMTP_PASS) | 🔴 | 5 min |
| 3 | Přidat `.dev.vars` pro lokální vývoj | 🔴 | 10 min |
| 4 | Implementovat navržené copywriting opravy (po schválení) | 🟡 | 1 h |
| 5 | Zaregistrovat SMSBrána + implementovat `sms.ts` | 🟡 | 2 h |
| 6 | Opravit typografii Hero H1 (`font-sans` → `font-display`) | 🟢 | 5 min |
| 7 | Zvýšit kontrast muted textů (WCAG AA) | 🟢 | 15 min |
| 8 | Přidat Playwright screenshot skript | 🟢 | 1 h |
| 9 | Self-host Lucide ikony (subset) | 🟢 | 2 h |
| 10 | Zaregistrovat Resend.com + ověřit doménu | 🟡 | 30 min |
