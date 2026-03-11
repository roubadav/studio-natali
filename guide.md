# Vercel Mail Hub - stav + co potřebuji od tebe

## 1) Co je hotové

- `studio-natali` je upravené a nasazené:
  - právní stránky používají kontakt na Vilmu
  - adresa s `\n` se správně láme na řádky
  - sekce `Moje práce` se skryje, když galerie nemá obrázky
  - e-mail vrstva je přepnutá na vlastní API (`EMAIL_API_URL` + `EMAIL_API_KEY`) s Cloudflare fallbackem
- Produkční deploy `studio-natali`:
  - Worker verze: `14d277cb-fd5f-435d-8070-36cbfa57b9c6`
- Nový projekt je vytvořen:
  - `/Volumes/data/Projekty/vercel-mail-hub`
- Vercel projekt je nasazen a běží na:
  - `https://vercel-mail-hub.vercel.app`
- Mail Hub GUI je připravené na:
  - `https://vercel-mail-hub.vercel.app/`
- Mail Hub bezpečnostní hardening je nasazen:
  - admin auth přes `Authorization: Bearer <token>`
  - nově i login přes e-mail + heslo (`POST /api/admin/auth/login`) s krátkodobou session
  - allowlist domén (`allowed_origins`) + allowlist IP/CIDR (`allowed_ips`)
  - rate limiting (`API key` / `project` / `IP`)
  - bezpečnostní HTTP hlavičky + CSP
  - sanitizované SMTP chyby (bez úniku citlivých detailů)

## 2) Aktuální stav po ověření

- Ověřeno na produkci:
  - `POST /api/v1/send` z povolené domény vrací `202`
  - `POST /api/v1/send` z nepovolené domény vrací `403`
  - admin endpoint bez auth vrací `401`
  - admin endpoint s bearer tokenem vrací data (`200`)
- Login přes e-mail+heslo je funkční v kódu/API, ale momentálně není zapnutý env konfigurací (API vrací `503`, dokud se nedoplní env proměnné).

## 3) Co potřebuji od tebe

- Vyber admin e-mail pro přihlášení do Mail Hubu (`MAIL_HUB_ADMIN_EMAIL`).
- Nastav admin heslo ideálně jako hash (`MAIL_HUB_ADMIN_PASSWORD_HASH`; fallback je `MAIL_HUB_ADMIN_PASSWORD`).
- (Doporučeno) Omez admin přístup na tvoje prostředí:
  - `MAIL_HUB_ADMIN_ALLOWED_ORIGINS`
  - `MAIL_HUB_ADMIN_ALLOWED_IPS`
- Bezpečně ulož všechny secrety mimo repozitář (vault / password manager).

## 4) Co je už dokončené

1. Přidaný sender účet `info@studionatali-ricany.cz` v Mail Hubu.
2. Vygenerovaný API klíč pro `studio-natali` a uložený jako `EMAIL_API_KEY` secret ve Cloudflare Workeru.
3. Ověřený send přes `POST /api/v1/send` (status `202`, log `sent`).
4. `studio-natali` je nasazené na produkci a přepnuté na Vercel Mail Hub (s Cloudflare fallbackem).

## 5) Admin API (už připraveno)

- Projekty: `GET/POST /api/admin/projects`
- Login: `POST /api/admin/auth/login`
- Origins: `GET/POST /api/admin/projects/:projectId/origins`
- IP allowlist: `GET/POST /api/admin/projects/:projectId/ips`
- Senders: `GET/POST /api/admin/projects/:projectId/senders`
- API keys: `POST /api/admin/projects/:projectId/keys`
- Logy + CSV: `GET /api/admin/logs`
- Záloha: `GET /api/admin/backup`
- Mazání historie: `DELETE /api/admin/logs?before=<ISO_DATETIME>`
