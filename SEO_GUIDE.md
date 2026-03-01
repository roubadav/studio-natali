# SEO Průvodce – Studio Natali

## Co je už hotové (automaticky)

### ✅ Technické SEO
- **Strukturovaná data (JSON-LD)**: Schema.org HairSalon s adresou, GPS, provozní dobou, sociální sítě
- **Open Graph meta tagy**: og:title, og:description, og:image, og:locale (cs_CZ), og:site_name
- **Twitter Cards**: summary_large_image
- **Canonical URLs**: Na každé stránce
- **robots.txt**: Blokuje /admin/, /api/, /test – explicitně povoluje AI crwlery a /api/agent/
- **sitemap.xml**: 4 veřejné URL
- **Geo meta tagy**: geo.region (CZ-20), geo.placename (Říčany), ICBM souřadnice
- **Theme-color**: Pro mobilní prohlížeče
- **Sémantické HTML**: role="banner", aria-label na navigaci
- **Noindex na admin/právních stránkách**: Admin login, obchodní podmínky, zpracování údajů
- **Preconnect na Google Fonts**: Rychlejší načtení fontů
- **Lazy-loading obrázků**: loading="lazy" + decoding="async"
- **Hero obrázek**: fetchpriority="high" pro LCP
- **Self-hosted ikony**: 8.8 KB místo 200 KB z CDN

### ✅ AEO – AI Engine Optimization (doporučování AI agenty)
- **`/llms.txt`**: Soubor pro LLM modely (ChatGPT, Claude, Perplexity) – popis salonu, ceník, FAQ, popis API
- **`/.well-known/ai-plugin.json`**: OpenAI ChatGPT plugin manifest → AI agent pozná, že web umí rezervace
- **`/.well-known/openapi.json`**: Plná OpenAPI 3.1 dokumentace rezervačního API (AI čitelná)
- **FAQPage schema**: 7 běžných otázek v JSON-LD → AI asistenti je použijí jako odpovědi
- **Rozšířený HairSalon schema**: hasOfferCatalog s cenami, makesOffer s odkazem na rezervaci, paymentAccepted
- **Rezervační API pro agenty** (`/api/agent/*`): Agenti mohou sami rezervovat jménem zákazníka

### ✅ Obsah
- **Unikátní texty**: Bez klišé, přirozené, lokální zaměření
- **Lokální klíčová slova**: "Říčany u Prahy", "kadeřnictví v Říčanech"
- **H1 s display fontem**: Správná typografická hierarchie
- **alt texty na obrázcích**: Popisné alternativní texty

---

## Rezervační API pro AI agenty

Web má plnohodnotné API, které umožňuje AI asistentovi (ChatGPT, Copilot, Gemini…) rezervovat termín **jménem zákazníka**. Ochrana před spamem je řešena povinným SMS ověřením.

### Jak to funguje

```
Zákazník: "Zarezervuj mi střih u Vilmy v Studio Natali v Říčanech na středu"
        ↓
AI agent: GET /api/agent/services      → zjistí ID služeb
AI agent: GET /api/agent/workers       → zjistí ID Vilmy
AI agent: GET /api/agent/availability  → ověří volné sloty ve středu
AI agent: POST /api/agent/book         → vytvoří čekající rezervaci
        ↓
Zákazník: dostane SMS s 6místným kódem
        ↓
AI agent: POST /api/agent/verify       → odešle kód → rezervace vytvořena
Zákazník: dostane potvrzovací e-mail
```

### Ochrana před spam/fake rezervacemi

| Ochrana | Popis |
|---------|-------|
| **SMS OTP** | Bez kódu ze SMS nelze rezervaci dokončit – fake čísla kód neobdrží |
| **Token expiry** | OTP i verifikační token vyprší za 30 minut |
| **Max. pokusy** | 3 chybné OTP pokusy = token zneplatněn |
| **Rate limiting** | Max 10 OTP ověřovacích pokusů za hodinu na IP (brute-force ochrana) |
| **Limit na telefon** | Max 2 čekající rezervace na jedno tel. číslo najednou |

### Endpointy

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| `GET` | `/api/agent/services` | Seznam služeb s cenami a IDs |
| `GET` | `/api/agent/workers` | Seznam kadeřnic s IDs |
| `GET` | `/api/agent/availability?workerId=&date=&duration=` | Volné sloty |
| `POST` | `/api/agent/book` | Vytvoř rezervaci → SMS zákazníkovi |
| `POST` | `/api/agent/verify` | Ověř OTP → hotovo |

Plná dokumentace: https://studionatali-ricany.cz/.well-known/openapi.json

### Ruční krok: aplikovat DB migraci

```bash
npx wrangler d1 migrations apply studio-natali-db --remote
```



## Co musíte udělat vy (ruční kroky)

### 1. 🔴 Google Search Console (PRIORITA 1)
1. Jděte na https://search.google.com/search-console
2. Přihlaste se svým Google účtem
3. Klikněte **"Přidat vlastnost"** → **"Doména"**
4. Zadejte: `studionatali-ricany.cz`
5. Vyberte **ověření přes DNS TXT záznam**
6. Google vám dá TXT záznam typu: `google-site-verification=xxxxxxxxx`
7. Přejděte na **Wedos** → **DNS správa** → přidejte TXT záznam:
   - **Název**: prázdný (nebo @)
   - **Typ**: TXT
   - **Hodnota**: hodnota od Google
8. Po ověření (může trvat až 48 hodin):
   - Klikněte **"Sitemaps"** → přidejte: `https://studionatali-ricany.cz/sitemap.xml`
   - Požádejte o **indexaci** hlavní stránky

### 2. 🔴 Google Firemní Profil (PRIORITA 1)
1. Jděte na https://business.google.com
2. Přihlaste se nebo vytvořte profil pro **Studio Natali**
3. Vyplňte:
   - **Název**: Studio Natali
   - **Kategorie**: Kadeřnictví
   - **Adresa**: Černokostelecká 80/42, 251 01 Říčany
   - **Telefon**: +420 774 889 606
   - **Web**: https://studionatali-ricany.cz
   - **Provozní doba**: Po-Pá 8:30-18:00
   - **Popis**: Kadeřnický salon v Říčanech u Prahy. Dvě zkušené kadeřnice – Natálie a Vilma. Střihy, barvení, melíry, keratinové ošetření i společenské účesy.
4. Přidejte **fotografie** salonu (exteriér, interiér, práce)
5. Požádejte zákazníky o **recenze** na Google

### 3. 🟡 Mapy.cz / Firmy.cz (PRIORITA 2)
1. Jděte na https://www.firmy.cz/pridat-firmu
2. Vyplňte stejné údaje jako u Google
3. Kategorie: **Kadeřnictví**
4. Přidejte **fotky** a ověřte kontaktní údaje

### 4. 🟡 Facebook stránka (PRIORITA 2)
1. Na stránce https://www.facebook.com/StudioNatali:
   - Zkontrolujte, že je vyplněna **adresa**, **telefon**, **web**
   - Přidejte odkaz na web: `https://studionatali-ricany.cz`
   - Kategorie: **Kadeřnický salon**
2. Pravidelně publikujte příspěvky s fotkami práce

### 5. 🟡 Instagram profil (PRIORITA 2)
1. Na profilu @studionatali:
   - Přidejte do bio odkaz: `https://studionatali-ricany.cz`
   - Přidejte lokaci: Říčany u Prahy
   - Používejte hashtagy: #kadeřnictví #říčany #studionatali #kadernictvi #kadernicericany

### 6. 🟢 Další katalogy (BONUS)
- **Zlaté stránky**: https://www.zlatestranky.cz
- **Heureka** (pokud prodáváte produkty)
- **Yelp**: https://www.yelp.cz
- **TripAdvisor** (pokud máte zahraniční klientelu)

---

## Klíčová slova pro obsah

### Hlavní klíčová slova
- kadeřnictví říčany
- kadeřnice říčany
- kadeřnický salon říčany u prahy
- studio natali říčany
- dámský střih říčany
- barvení vlasů říčany

### Doplňková klíčová slova
- melír říčany
- keratinové ošetření říčany
- balayage říčany
- společenský účes říčany
- pánský střih říčany
- dětský střih říčany

### Long-tail klíčové fráze
- objednat se ke kadeřnici v říčanech
- nejlepší kadeřnictví říčany u prahy  
- online rezervace kadeřnictví říčany
- kadeřnictví říčany otevírací doba

---

## Tipy pro průběžné SEO

1. **Blog / novinky** (budoucí rozšíření)
   - Přidejte na web sekci "Tipy" s články o péči o vlasy
   - Články s klíčovými slovy: "jak pečovat o barvené vlasy", "trendy účesy 2025"
   
2. **Fotogalerie**
   - Pravidelně aktualizujte galerii na webu
   - Přidávejte alt texty typu "Dámský střih s blond melírem - Studio Natali Říčany"

3. **Recenze**
   - Aktivně žádejte spokojené zákazníky o recenze na Google
   - Odpovídejte na všechny recenze (i záporné)

4. **Sociální sítě**
   - Sdílejte práce na Facebook a Instagram
   - Odkazujte na rezervační systém

5. **Rychlost webu**
   - Web běží na Cloudflare Workers = ultra rychlé
   - Self-hosted ikony = minimální payload
   - Lazy-loading obrazů = rychlé první načtení

---

## Monitorování

Po nastavení Google Search Console sledujte:
- **Pokrytí**: Kolik stránek je indexováno
- **Výkon**: Klíčová slova, pozice, kliknutí
- **Core Web Vitals**: LCP, FID, CLS
- **Mobilní použitelnost**: Žádné problémy

Doporučuji kontrolovat 1× týdně první měsíc, pak 1× měsíčně.
