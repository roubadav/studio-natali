# Vercel Mail Hub - stav + co potřebuji od tebe

## 1) Co je hotové

- `studio-natali` je upravené a nasazené:
  - právní stránky používají kontakt na Vilmu
  - adresa s `\n` se správně láme na řádky
  - sekce `Moje práce` se skryje, když galerie nemá obrázky
  - e-mail vrstva je přepnutá na vlastní API (`EMAIL_API_URL` + `EMAIL_API_KEY`) s Cloudflare fallbackem
- Produkční deploy `studio-natali`:
  - Worker verze: `c815c8e4-100b-4cf6-b043-22fa3ee8f25c`
- Nový projekt je vytvořen:
  - `/Volumes/data/Projekty/vercel-mail-hub`
- Vercel projekt je nasazen a běží na:
  - `https://vercel-mail-hub.vercel.app`

## 2) Aktuální blocker

Mail Hub teď vrací `500` kvůli chybějící env proměnné:

- `DATABASE_URL`

Bez databáze nejde dokončit bootstrap projektu, klíče ani sender účty.

## 3) Co potřebuji od tebe

1. **Database URL**
   - Pošli mi produkční `DATABASE_URL` (Neon/Postgres pro Mail Hub).

2. **SMTP účet(y) pro odesílání**
   - Pro první sender potřebuji:
     - `smtpHost`
     - `smtpPort`
     - `smtpUser`
     - `smtpPass` (ideálně app password)
     - e-mail odesílatele (From)

3. **Potvrzení domén**
   - Potvrď, že pro Studio Natali máme povolit:
     - `https://studionatali-ricany.cz`
     - `https://www.studionatali-ricany.cz`

## 4) Co udělám hned potom (bez další práce od tebe)

1. Nastavím env ve Vercelu:
   - `DATABASE_URL`
   - `MAIL_HUB_ADMIN_TOKEN`
   - `MAIL_HUB_API_KEY_PEPPER`
   - `MAIL_HUB_MASTER_KEY`
2. Spustím SQL bootstrap (`scripts/bootstrap.sql`).
3. Vytvořím projekt `studio-natali`, povolené origins a sender.
4. Vygeneruju API klíč pro Studio Natali.
5. Nastavím `EMAIL_API_KEY` secret ve Cloudflare Workeru.
6. Udělám end-to-end test odeslání rezervace přes Vercel Mail Hub.

## 5) Admin API (už připraveno)

- Projekty: `GET/POST /api/admin/projects`
- Origins: `GET/POST /api/admin/projects/:projectId/origins`
- Senders: `GET/POST /api/admin/projects/:projectId/senders`
- API keys: `POST /api/admin/projects/:projectId/keys`
- Logy + CSV: `GET /api/admin/logs`
- Záloha: `GET /api/admin/backup`
- Mazání historie: `DELETE /api/admin/logs?before=<ISO_DATETIME>`
