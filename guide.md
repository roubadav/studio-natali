# Cloudflare Email Workers – zavedení v projektu

Tento projekt je připravený na odesílání e-mailů přes Cloudflare Worker binding `MAILER` (`send_email`) s fallbackem na `RESEND_API_KEY`.

## Co je už hotové v kódu

- `wrangler.toml` obsahuje:
  - `[[send_email]] name = "MAILER"`
  - `EMAIL_FROM` v `[vars]`
- `src/lib/email.ts` nyní odesílá v pořadí:
  1. Cloudflare Email Workers (`MAILER`)
  2. Resend (`RESEND_API_KEY`)
  3. Mock log (jen když není nastaven žádný provider)
- `src/types.ts` obsahuje typy pro `MAILER` a `EMAIL_FROM`.

## Co potřebuji od tebe

1. Potvrdit finální adresu odesílatele (např. `info@studionatali-ricany.cz`) pro `EMAIL_FROM`.
2. V Cloudflare Email Routing ověřit cílové adresy, na které se má přes Cloudflare posílat.
3. Rozhodnout:
   - **A)** Cloudflare jen pro interní notifikace + Resend pro zákazníky (doporučeno),
   - **B)** jen Cloudflare (omezení viz níže).

## Důležité omezení Cloudflare

Cloudflare Email Workers (`send_email`) umí posílat jen na **ověřené destination adresy** v Email Routing.  
To znamená, že bez externího provideru nelze spolehlivě posílat transakční e-maily na libovolné e-maily zákazníků.

## Nastavení v Cloudflare (dashboard)

1. Zapnout **Email Routing** pro doménu.
2. Přidat a ověřit destination adresy.
3. Zkontrolovat DNS záznamy (MX/SPF/DKIM/DMARC) podle průvodce Cloudflare.
4. Nechat nasazený Worker s bindingem `MAILER`.

## Doporučené produkční nastavení

- `MAILER` používat pro interní notifikace (např. staff/admin).
- `RESEND_API_KEY` ponechat jako fallback pro zákaznické e-maily.

## Ověření po nastavení

1. Vytvořit test rezervaci.
2. Ověřit doručení:
   - zákazníkovi,
   - kadeřnici/adminu.
3. Zkontrolovat Worker logy pro případné chyby `Cloudflare email send failed`.
