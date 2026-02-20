# 🧪 Studio Natali – Testovací checklist

> Manuální testovací scénáře pro ověření funkčnosti webu. Projděte po nasazení na staging/produkci.

---

## 1. Homepage (veřejná část)

### 1.1 Hero sekce
- [X] Nadpis a popis se zobrazují správně
- [ ] CTA tlačítko má animovaný glow efekt (pulzující záře)
> nemá, možná zkusit restart serveru, výmaz cache a provést init seed, protože nefunguje ani admin panel
- [X] CTA tlačítko vede na `/rezervace`

### 1.2 Služby
- [X] Karty služeb se zobrazují správně
- [ ] Tlačítko "Prozkoumat služby" má glow efekt
> Nemá
- [X] Odkaz vede na `/rezervace`

### 1.3 Tým
- [ ] **Natálie** – zobrazuje se karta s modré tlačítkem "Facebook" (ne "Rezervovat")
> ano, ale chtěl jsem Rezervovat přes Facebook text
- [X] Kliknutí na Facebook vede na `https://www.facebook.com/StudioNatali`
- [X] **Vilma Strakatá** – zobrazuje se karta s tlačítkem "Rezervovat"
- [ ] Kliknutí na "Rezervovat" vede na `/rezervace?worker=vilma`
> ne, na workerId=3

### 1.4 Galerie
- [X] Obrázky se načítají (nebo placeholder zprávy)
> v tomto případě se zobrazuje Zatím žádné obrázky, v předchozí commit verzi na githubu zmizely obrázky, tedy chybí obrázek v Hero sekci, obrázek Natálie, obrázky služeb, můžeš to z toho githubu z těch předchozích verzí nějak dotáhnout?

### 1.5 CTA sekce
- [ ] Tlačítko "Objednat se" má glow efekt
> Ne nemá, možná to chce reset cache, nebo něco jinéhoé, ale stále tam není

### 1.6 Kontakt
- [X] Email zobrazuje: `info@studionatali-ricany.cz`
- [X] Mailto odkaz funguje
- [X] Mapa se zobrazuje

### 1.7 Patička (Footer)
- [X] Email: `info@studionatali-ricany.cz`
- [ ] Odkazy na Obchodní podmínky a GDPR fungují
> odkazy fungují, jen v nich nejsou aktualizované ty kontektní údaje - e-mail, není tam odřádkované tel. číslo, ani adresa, chci aby se vizuálně vylepšily

### 1.8 Header
- [X] ❌ CZ/EN přepínač je SKRYTÝ (nesmí se zobrazovat)
- [X] Hamburger menu funguje na mobilu
- [X] Navigační odkazy fungují

---

## 2. Rezervační wizard (`/rezervace`)

### 2.1 Krok 1 – Výběr pracovníka
- [ ] Zobrazuje se **pouze Vilma** (ne Natálie, ne Admin)
> Zobrazuje se pouze Natálie, přesně naopak, má tam být Vilma
- [ ] Předvolení přes `?worker=vilma` funguje
> spis ne, ani worker=natalie nepřeskočí 1. krok
> a když je na výběr jen jedna, což v tomto přípaqdě je mělo by to první krok přeskočit vždy a vůbec ho nezobrazovat
- [X] Kliknutí na kartu vybere pracovníka

### 2.2 Krok 2 – Výběr služeb
- [X] Služby se filtrují podle kategorie
- [X] Košík správně počítá celkovou dobu
- [X] Výběr/odznačení služby funguje
- [X] Při změně služeb se resetuje výběr data/času

### 2.3 Krok 3 – Datum a čas
- [X] Kalendář se zobrazuje správně
- [X] Dny s dostupnými sloty jsou zvýrazněné
- [X] Kliknutí na den načte time sloty
- [X] Time sloty se zobrazují jako klikatelná tlačítka
- [X] **Vybraný slot má hnědé pozadí + bílý text** (`.selected` CSS třída)
- [X] Zamykání slotů funguje (lock endpoint)
- [ ] Nedostupné sloty jsou šedé a neklikatelné
> nejsou šedé, je tam dopsáno (obsazeno), kliknout se dá, vybrat ne, místo textu, bych chtěl spíše vizuálně odlišit a aby nebyl kurzor pointer na hover 

### 2.4 Krok 4 – Kontaktní údaje
- [X] Povinná pole: Jméno, Telefon, Email
- [X] **Email validace na blur** – červený okraj + chybová zpráva při neplatném emailu
- [X] **Telefon validace na blur** – červený okraj + chybová zpráva při neplatném formátu
- [X] Po opravě se chybová zpráva zmizí
- [X] Souhlas s obchodními podmínkami je povinný checkbox
> jen ho můžeš ozačit hvězdičkou (jako povinný)

### 2.5 Krok 5 – Potvrzení
- [X] Shrnutí zobrazuje správné údaje (pracovník, datum, čas, služby, trvání)
- [ ] Tlačítko "Odeslat" vytvoří rezervaci
> Napíše mi to Vybraný termín již není k dispozici, ikdyž to testuji sám v jedné session, takžře v rezervačním systému je nějaká chyba a chce to pořádně prozkoumat
- [ ] Po úspěchu se zobrazí potvrzovací zpráva
> sem už jsem nedošel, navíc nejsem schopný se přihlásit do admin panelu, takže nemohu zkontrolovat založenou rezervaci
- [ ] Po odeslání se zámek uvolní

### 2.6 Honeypot
- [ ] Skryté pole `website` je přítomné (anti-spam)
- [ ] Pokud je vyplněné botem, požadavek je zamítnut

---

## 3. Email notifikace

### 3.1 Email zákazníkovi po vytvoření
- [ ] Přijde potvrzovací email s detaily rezervace
- [ ] Obsahuje odkaz na zrušení

### 3.2 Email kadeřnici (approval request)
- [ ] Přijde email s detaily a tlačítky Schválit/Odmítnout
- [ ] Kliknutí na "Schválit" schválí rezervaci
- [ ] Kliknutí na "Odmítnout" zobrazí formulář s důvodem

### 3.3 Email zákazníkovi po schválení
- [ ] Přijde email o potvrzení rezervace
- [ ] Obsahuje odkaz na správu/zrušení

### 3.4 Email zákazníkovi po odmítnutí
- [ ] Přijde email s důvodem odmítnutí

### 3.5 Konfigurace
- [ ] MailChannels/Resend API funguje na produkci
- [ ] Na localhostu se používá mock (console.log)

---

## 4. Admin panel (`/admin`)

### 4.1 Přihlášení
- [ ] Login formulář funguje
- [ ] Neplatné heslo zobrazí chybu
- [ ] Po 5 pokusech se zobrazí rate limit chyba (429)
- [ ] Po přihlášení redirect na dashboard

### 4.2 Dashboard
- [ ] Zobrazuje statistiky (čekající, dnes, celkem)

### 4.3 Rezervace
- [ ] Seznam rezervací se načítá
- [ ] Filtry (stav, datum) fungují
- [ ] **Tlačítko "Nová rezervace"** otevře modální okno
- [ ] V modálu: výběr pracovníka → načtou se služby
- [ ] V modálu: výběr data → načtou se time sloty
- [ ] V modálu: odeslání vytvoří rezervaci se statusem "confirmed"
- [ ] Schválení/odmítnutí existující rezervace funguje

### 4.4 Služby
- [ ] CRUD služeb funguje (vytvořit, upravit, smazat)
- [ ] Služby se přiřazují ke kategoriím a pracovníkům

### 4.5 Uživatelé
- [ ] Seznam uživatelů se zobrazuje
- [ ] Úprava profilu funguje
- [ ] Změna hesla funguje

### 4.6 Pracovní doba
- [ ] Nastavení šablony pracovní doby funguje
- [ ] Výjimky (dovolená, speciální dny) fungují

### 4.7 Nastavení
- [ ] Klíčová nastavení se ukládají
- [ ] Booking window funguje správně

### 4.8 Galerie
- [ ] Upload/správa obrázků funguje

---

## 5. Responzivní design

### 5.1 Homepage
- [ ] Mobil (320px–480px): jednosloupový layout
- [ ] Tablet (768px–1024px): dvousloupcový layout
- [ ] Desktop (1280px+): plný layout

### 5.2 Rezervační wizard
- [ ] Kalendář je čitelný na mobilu
- [ ] Time sloty se zobrazují ve 2-3 sloupcích na mobilu
- [ ] Formulář je použitelný na malých displejích

### 5.3 Admin panel
- [ ] **Mobil**: sidebar je skrytý, hamburger menu ho otevře
- [ ] **Mobil**: overlay zakryje obsah při otevřeném menu
- [ ] **Mobil**: kliknutí na overlay nebo odkaz zavře menu
- [ ] **Desktop**: sidebar je vždy viditelný
- [ ] Tabulka rezervací je horizontálně scrollovatelná
- [ ] Filtry se zabalí na menších displejích

---

## 6. Bezpečnost

### 6.1 Autentizace
- [ ] JWT cookie má `httpOnly`, `secure`, `sameSite: Lax`
- [ ] Neplatný/expirovaný token → redirect na login
- [ ] Admin stránky vyžadují admin roli

### 6.2 Rate limiting
- [ ] Login: max 5 pokusů za 15 minut z jedné IP
- [ ] Rezervace: max 10 za hodinu z jedné IP
- [ ] Po překročení limitu se vrací 429

### 6.3 SQL injection
- [ ] Všechny dotazy používají bind parametry
- [ ] Update funkce mají whitelistované sloupce

### 6.4 XSS
- [ ] JSX auto-escapuje textový obsah
- [ ] Client-side JS používá `escapeHTML()` pro innerHTML
- [ ] Žádný `dangerouslySetInnerHTML`

### 6.5 CORS
- [ ] API povoluje pouze povolené originy (ne `*`)

### 6.6 Headers
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

### 6.7 Hesla
- [ ] Hashována pomocí PBKDF2 se 100k iteracemi
- [ ] Žádné hardcodované hesla v kódu (bcrypt backdoor odstraněn)

---

## 7. Edge cases

- [ ] Dvojklik na "Odeslat" nevytvoří dvojitou rezervaci
- [ ] Rezervace na minulý datum je zamítnuta
- [ ] Rezervace mimo pracovní dobu je zamítnuta
- [ ] Expirovaný zámek se automaticky uvolní
- [ ] Zrušení přes email link funguje (management_token)
- [ ] 404 stránka se zobrazuje pro neexistující URL
- [ ] Test runner je přístupný pouze na localhost

---

## 8. Produkční kontroly

- [ ] `npx wrangler secret put JWT_SECRET` – nastaveno
- [ ] `npx wrangler secret put SMTP_PASS` – nastaveno (pokud používáte SMTP)
- [ ] `npx wrangler secret put RESEND_API_KEY` – nastaveno (pokud používáte Resend)
- [ ] Database schema je migrována (`schema.sql`)
- [ ] Seed data je načtena (`seed.sql`)
- [ ] **Změnit výchozí heslo `admin123`!** ⚠️
- [ ] DNS záznamy pro email (SPF, DKIM, DMARC)
- [ ] SSL certifikát aktivní
- [ ] Cloudflare cache rules nastaveny
- [ ] `_headers` soubor se aplikuje na statické soubory

---

## Výsledky testování

| Oblast | Stav | Poznámka |
|--------|------|----------|
| Homepage | ⬜ | |
| Rezervační wizard | ⬜ | |
| Email notifikace | ⬜ | |
| Admin panel | ⬜ | |
| Responzivní design | ⬜ | |
| Bezpečnost | ⬜ | |
| Edge cases | ⬜ | |
| Produkční kontroly | ⬜ | |

**Legenda**: ✅ OK | ⚠️ Částečně | ❌ Selhalo | ⬜ Netestováno
