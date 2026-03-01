import { Env } from '../types';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export class EmailService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async send(options: EmailOptions): Promise<boolean> {
    // Priority: 1. Resend API, 2. Mock (development)
    if (this.env.RESEND_API_KEY) {
      return this.sendWithResend(options);
    }

    // Mock fallback for development
    return this.sendMock(options);
  }

  private async sendMock(options: EmailOptions): Promise<boolean> {
    console.log('========== MOCK EMAIL SENT ==========');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Reply-To:', options.replyTo);
    console.log('HTML Preview:', options.html.substring(0, 200) + '...');
    console.log('=====================================');
    return true;
  }

  private async sendWithResend(options: EmailOptions): Promise<boolean> {
    const fromAddress = this.env.SMTP_FROM || 'Studio Natali <info@studionatali-ricany.cz>';

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          reply_to: options.replyTo
        })
      });

      if (!res.ok) {
        const error = await res.text();
        console.error('Resend email failed:', res.status, error);
        return false;
      }

      console.log('Email sent via Resend to:', options.to);
      return true;
    } catch (e) {
      console.error('Resend email error:', e);
      return false;
    }
  }
}

/**
 * Shared email layout wrapper.
 * Best practices for spam-filter compliance:
 * - Full HTML5 document with DOCTYPE, html, head, body
 * - Physical mailing address in footer (CAN-SPAM / GDPR)
 * - High text-to-image ratio, no external images
 * - Table-based layout for maximum email client compatibility
 * - Inline styles only (no <style> blocks)
 * - No URL shorteners, no suspicious link text
 * - reply-to set at send time via EmailService
 */
function emailLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333; line-height: 1.6; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f1ec;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid #ede8e0;">
              <a href="https://studionatali-ricany.cz" style="text-decoration: none; color: #333;">
                <span style="font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #333;">STUDIO</span>
                <span style="font-size: 22px; font-weight: 300; letter-spacing: 2px; color: #8a654b;"> Natali</span>
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px 20px; font-size: 15px; color: #333333; line-height: 1.7;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; border-top: 1px solid #ede8e0; font-size: 12px; color: #999999; text-align: center; line-height: 1.6;">
              <p style="margin: 0 0 6px;">Studio Natali &middot; Černokostelecká 80/42 &middot; 251 01 Říčany u Prahy</p>
              <p style="margin: 0 0 6px;">Tel: <a href="tel:+420774889606" style="color: #999;">+420 774 889 606</a> &middot; <a href="mailto:info@studionatali-ricany.cz" style="color: #999;">info@studionatali-ricany.cz</a></p>
              <p style="margin: 0;"><a href="https://studionatali-ricany.cz" style="color: #8a654b;">studionatali-ricany.cz</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateConfirmationEmail(
  customerName: string,
  date: string,
  time: string,
  services: string,
  cancelLink: string
): string {
  const firstName = customerName.split(' ')[0];
  return emailLayout(`Rezervace přijata`, `
    <p>Ahoj ${firstName},</p>
    <p>díky za rezervaci v Studio Natali. Tady je shrnutí:</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr><td style="background: #f8f5f0; padding: 20px; border-radius: 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 4px 0; color: #555;">Datum</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${date}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Čas</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${time}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Služby</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${services}</td></tr>
        </table>
      </td></tr>
    </table>

    <p>Kadeřnice vaši rezervaci ještě potvrdí &ndash; jakmile se tak stane, přijde vám další e-mail.</p>

    <p style="font-size: 13px; color: #888; margin-top: 24px;">Pokud se potřebujete odhlásit, můžete to udělat <a href="${cancelLink}" style="color: #8a654b;">tímto odkazem</a>.</p>
  `);
}

export function generateApprovalRequestEmail(
  workerName: string,
  reservation: any,
  approveLink: string,
  rejectLink: string
): string {
  const firstName = workerName.split(' ')[0];
  return emailLayout(`Nová rezervace ke schválení`, `
    <p>Ahoj ${firstName},</p>
    <p>přišla nová rezervace, co čeká na tvé potvrzení:</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr><td style="background: #f8f5f0; padding: 20px; border-radius: 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 4px 0; color: #555;">Zákazník</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${reservation.customer_name}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Telefon</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${reservation.customer_phone}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Datum</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${reservation.date}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Čas</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${reservation.start_time} &ndash; ${reservation.end_time}</td></tr>
          <tr><td style="padding: 4px 0; color: #555;">Služby</td><td style="padding: 4px 0; font-weight: 600; color: #333; text-align: right;">${reservation.items.map((i: any) => i.service_name).join(', ')}</td></tr>
          ${reservation.note ? `<tr><td style="padding: 4px 0; color: #555;">Poznámka</td><td style="padding: 4px 0; color: #333; text-align: right;">${reservation.note}</td></tr>` : ''}
        </table>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${approveLink}" style="display: inline-block; background: #3d7a4a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">Schválit</a>
          <a href="${rejectLink}" style="display: inline-block; background: #c0392b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Odmítnout</a>
        </td>
      </tr>
    </table>
  `);
}

export function generateApprovedEmail(
  customerName: string,
  date: string,
  time: string,
  cancelLink: string
): string {
  const firstName = customerName.split(' ')[0];
  return emailLayout(`Rezervace potvrzena`, `
    <p>Ahoj ${firstName},</p>
    <p>vaše rezervace na <strong>${date} v ${time}</strong> je potvrzená. Budeme se na vás těšit!</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr><td style="background: #edf7ed; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #3d7a4a; color: #2d5a35;">
        Rezervace je závazná. Pokud se nemůžete dostavit, zrušte ji prosím nejpozději 24 hodin předem.
      </td></tr>
    </table>

    <p style="font-size: 13px; color: #888; margin-top: 24px;">Potřebujete změnit termín? <a href="${cancelLink}" style="color: #8a654b;">Spravovat rezervaci</a></p>
  `);
}

export function generateRejectedEmail(
  customerName: string,
  date: string,
  time: string,
  reason: string
): string {
  const firstName = customerName.split(' ')[0];
  return emailLayout(`Rezervace nebyla potvrzena`, `
    <p>Ahoj ${firstName},</p>
    <p>mrzí nás to, ale vaši rezervaci na <strong>${date} v ${time}</strong> bohužel nemůžeme potvrdit.</p>
    
    ${reason ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr><td style="background: #fef2f2; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #c0392b; color: #7f1d1d;">
        ${reason}
      </td></tr>
    </table>` : ''}

    <p>Zkuste prosím jiný termín &ndash; rádi vás uvidíme jindy.</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr><td align="center">
        <a href="https://studionatali-ricany.cz/rezervace" style="display: inline-block; background: #8a654b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Vybrat jiný termín</a>
      </td></tr>
    </table>
  `);
}
