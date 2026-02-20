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
    // Priority: 1. SMTP (via MailChannels or relay), 2. Resend API, 3. Mock
    if (this.env.SMTP_HOST && this.env.SMTP_USER) {
      return this.sendWithMailChannels(options);
    }

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

  /**
   * Send email via MailChannels API (free for Cloudflare Workers).
   * This is the recommended approach for CF Workers since direct SMTP
   * connections are not supported in the Workers runtime.
   * 
   * To use seznam.cz SMTP directly, you would need a proxy/relay service
   * or Cloudflare Email Workers + Email Routing.
   * 
   * MailChannels setup:
   * 1. Add DNS TXT record: _mailchannels.yourdomain.com TXT "v=mc1 cfid=your-worker-subdomain.workers.dev"
   * 2. No API key needed - authenticated via Cloudflare Workers
   * 
   * Alternative: Use SMTP_PASS as Resend API key if using Resend for production.
   */
  private async sendWithMailChannels(options: EmailOptions): Promise<boolean> {
    const fromAddress = this.env.SMTP_FROM || `Studio Natali <${this.env.SMTP_USER}>`;
    
    // Parse "Name <email>" format
    const fromMatch = fromAddress.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : 'Studio Natali';
    const fromEmail = fromMatch ? fromMatch[2].trim() : (this.env.SMTP_USER || 'info@studionatali-ricany.cz');

    try {
      const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: options.to }],
          }],
          from: {
            email: fromEmail,
            name: fromName,
          },
          subject: options.subject,
          content: [{
            type: 'text/html',
            value: options.html,
          }],
          ...(options.replyTo ? { reply_to: { email: options.replyTo } } : {}),
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error('MailChannels send failed:', res.status, error);
        // Fallback to mock if MailChannels fails
        console.log('Falling back to mock email...');
        return this.sendMock(options);
      }

      console.log('Email sent via MailChannels to:', options.to);
      return true;
    } catch (e) {
      console.error('MailChannels send error:', e);
      // Fallback to mock
      return this.sendMock(options);
    }
  }

  private async sendWithResend(options: EmailOptions): Promise<boolean> {
    const fromAddress = this.env.SMTP_FROM || 'Studio Natali <rezervace@studionatali.cz>';

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
        console.error('Email send failed:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Email send error:', e);
      return false;
    }
  }
}

export function generateConfirmationEmail(
  customerName: string,
  date: string,
  time: string,
  services: string,
  cancelLink: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Dobrý den, ${customerName},</h1>
      <p>Děkujeme za Vaši rezervaci ve Studiu Natali.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Datum:</strong> ${date}</p>
        <p><strong>Čas:</strong> ${time}</p>
        <p><strong>Služby:</strong> ${services}</p>
      </div>

      <p>Vaše rezervace čeká na schválení kadeřnicí. O výsledku Vás budeme informovat dalším e-mailem.</p>

      <p>Pokud jste tuto rezervaci neprovedli Vy, prosím ignorujte tento e-mail nebo nás kontaktujte.</p>

      <div style="margin-top: 30px; font-size: 12px; color: #666;">
        <p>Zrušit žádost můžete kliknutím na tento odkaz: <a href="${cancelLink}">Zrušit rezervaci</a></p>
      </div>
    </div>
  `;
}

export function generateApprovalRequestEmail(
  workerName: string,
  reservation: any,
  approveLink: string,
  rejectLink: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Nová rezervace</h1>
      <p>Dobrý den, ${workerName},</p>
      <p>Máte novou žádost o rezervaci.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Zákazník:</strong> ${reservation.customer_name} (${reservation.customer_phone})</p>
        <p><strong>Datum:</strong> ${reservation.date}</p>
        <p><strong>Čas:</strong> ${reservation.start_time} - ${reservation.end_time}</p>
        <p><strong>Poznámka:</strong> ${reservation.note || '-'}</p>
        <p><strong>Služby:</strong> ${reservation.items.map((i: any) => i.service_name).join(', ')}</p>
      </div>

      <div style="margin-top: 20px;">
        <a href="${approveLink}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Schválit</a>
        <a href="${rejectLink}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Odmítnout</a>
      </div>
    </div>
  `;
}

export function generateApprovedEmail(
  customerName: string,
  date: string,
  time: string,
  cancelLink: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Rezervace potvrzena</h1>
      <p>Dobrý den, ${customerName},</p>
      <p>Vaše rezervace na <strong>${date} v ${time}</strong> byla schválena.</p>
      
      <p>Těšíme se na Vaši návštěvu.</p>

      <div style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
        <p>Pokud se nemůžete dostavit, zrušte prosím rezervaci co nejdříve, nejpozději však 24 hodin předem.</p>
        <p><a href="${cancelLink}">Spravovat nebo zrušit rezervaci</a></p>
      </div>
    </div>
  `;
}

export function generateRejectedEmail(
  customerName: string,
  date: string,
  time: string,
  reason: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Změna stavu rezervace</h1>
      <p>Dobrý den, ${customerName},</p>
      <p>Je nám líto, ale Vaši rezervaci na <strong>${date} v ${time}</strong> jsme museli odmítnout.</p>
      
      ${reason ? `<div style="background: #fff1f2; padding: 15px; border-left: 4px solid #f43f5e; margin: 20px 0;"><strong>Důvod:</strong> ${reason}</div>` : ''}

      <p>Prosím zkuste si vybrat jiný termín na našem webu.</p>
    </div>
  `;
}
