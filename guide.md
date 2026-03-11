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
- Vercel env je nastavené (`DATABASE_URL`, `MAIL_HUB_ADMIN_TOKEN`, `MAIL_HUB_API_KEY_PEPPER`, `MAIL_HUB_MASTER_KEY`)
- DB schema je nahraná (`projects`, `api_keys`, `allowed_origins`, `senders`, `email_logs`)
- V Mail Hubu je vytvořen projekt `studio-natali` + povolené origins:
  - `https://studionatali-ricany.cz`
  - `https://www.studionatali-ricany.cz`
- V Mail Hubu je připravené i GUI:
  - `https://vercel-mail-hub.vercel.app/`
  - přihlášení přes `MAIL_HUB_ADMIN_TOKEN`

## 2) Aktuální blocker

Aktuálně žádný blocker není. Mail Hub je nakonfigurovaný a testovací odeslání proběhlo úspěšně.

## 3) Co potřebuji od tebe

- V této chvíli nic navíc nepotřebuji.
- Doporučení: bezpečně si ulož hodnoty admin/API secretů mimo repozitář (vault / password manager).

## 4) Co je už dokončené

1. Přidaný sender účet `info@studionatali-ricany.cz` v Mail Hubu.
2. Vygenerovaný API klíč pro `studio-natali` a uložený jako `EMAIL_API_KEY` secret ve Cloudflare Workeru.
3. Ověřený send přes `POST /api/v1/send` (status `202`, log `sent`).
4. `studio-natali` je nasazené na produkci a přepnuté na Vercel Mail Hub (s Cloudflare fallbackem).

## 5) Admin API (už připraveno)

- Projekty: `GET/POST /api/admin/projects`
- Origins: `GET/POST /api/admin/projects/:projectId/origins`
- Senders: `GET/POST /api/admin/projects/:projectId/senders`
- API keys: `POST /api/admin/projects/:projectId/keys`
- Logy + CSV: `GET /api/admin/logs`
- Záloha: `GET /api/admin/backup`
- Mazání historie: `DELETE /api/admin/logs?before=<ISO_DATETIME>`
