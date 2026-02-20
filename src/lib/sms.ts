/**
 * SMS Service for Studio Natali
 * Provider: SMSBrána.cz (https://www.smsbrana.cz)
 * 
 * Features:
 * - Daily send limit (configurable in admin, default 20)
 * - Counter stored in D1 database
 * - Automatic phone number formatting for CZ
 */

import type { Env } from '../types';

interface SMSOptions {
  to: string;
  text: string;
}

interface SMSSendResult {
  success: boolean;
  error?: string;
  remaining?: number;
}

export class SMSService {
  private db: D1Database;
  private enabled: boolean;
  private apiLogin: string;
  private apiPassword: string;
  private senderName: string;
  private dailyLimit: number;

  constructor(db: D1Database, settings: Record<string, string>, env: Env) {
    this.db = db;
    this.enabled = settings.sms_enabled === 'true';
    this.apiLogin = env.SMS_API_LOGIN || settings.sms_api_key || '';
    this.apiPassword = env.SMS_API_PASSWORD || '';
    this.senderName = settings.sms_sender || 'StudioNatali';
    this.dailyLimit = parseInt(settings.sms_daily_limit || '20', 10);
    if (isNaN(this.dailyLimit) || this.dailyLimit < 0) this.dailyLimit = 20;
  }

  /**
   * Normalize Czech phone number to international format
   */
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Already international
    if (cleaned.startsWith('+420')) return cleaned;
    if (cleaned.startsWith('00420')) return '+' + cleaned.substring(2);
    // Czech number without prefix
    if (cleaned.startsWith('7') || cleaned.startsWith('6')) return '+420' + cleaned;
    if (cleaned.length === 9) return '+420' + cleaned;
    return cleaned;
  }

  /**
   * Get today's SMS count from the database
   */
  private async getTodayCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.prepare(
      `SELECT count FROM sms_daily_counter WHERE date = ?`
    ).bind(today).first<{ count: number }>();
    return result?.count || 0;
  }

  /**
   * Increment today's counter
   */
  private async incrementCounter(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.db.prepare(`
      INSERT INTO sms_daily_counter (date, count) VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET count = count + 1
    `).bind(today).run();
  }

  /**
   * Get remaining SMS for today
   */
  async getRemainingToday(): Promise<number> {
    const count = await this.getTodayCount();
    return Math.max(0, this.dailyLimit - count);
  }

  /**
   * Check if SMS sending is available
   */
  isConfigured(): boolean {
    return this.enabled && (!!this.apiLogin);
  }

  /**
   * Send SMS via SMSBrána.cz HTTP API
   * API docs: https://www.smsbrana.cz/dokumentace.html
   */
  async send(options: SMSOptions): Promise<SMSSendResult> {
    if (!this.enabled) {
      return { success: false, error: 'SMS odesílání je vypnuto' };
    }

    if (!this.apiLogin) {
      console.log('SMS: No API credentials configured, using mock');
      return this.sendMock(options);
    }

    // Check daily limit
    const remaining = await this.getRemainingToday();
    if (remaining <= 0) {
      console.warn(`SMS: Daily limit reached (${this.dailyLimit}/day)`);
      return { success: false, error: `Denní limit SMS (${this.dailyLimit}) byl vyčerpán`, remaining: 0 };
    }

    const phone = this.normalizePhone(options.to);
    
    // Limit text length (160 chars per SMS segment, max 3 segments = 480)
    const text = options.text.substring(0, 480);

    try {
      // SMSBrána.cz HTTP API
      const params = new URLSearchParams({
        login: this.apiLogin,
        password: this.apiPassword,
        number: phone,
        text: text,
        sender_id: this.senderName.substring(0, 11), // Max 11 chars
        action: 'send_sms',
      });

      const res = await fetch(`https://http-api.smsmanager.com/Send?${params.toString()}`);
      
      if (!res.ok) {
        const errorBody = await res.text();
        console.error('SMS API error:', res.status, errorBody);
        return { success: false, error: `SMS API chyba: ${res.status}` };
      }

      const responseText = await res.text();
      
      // SMSManager returns "OK" on success
      if (responseText.trim().startsWith('OK')) {
        await this.incrementCounter();
        const newRemaining = remaining - 1;
        console.log(`SMS sent to ${phone}, remaining today: ${newRemaining}/${this.dailyLimit}`);
        return { success: true, remaining: newRemaining };
      } else {
        console.error('SMS API unexpected response:', responseText);
        return { success: false, error: `SMS API odpověď: ${responseText.substring(0, 100)}` };
      }
    } catch (e) {
      console.error('SMS send error:', e);
      return { success: false, error: 'Chyba při odesílání SMS' };
    }
  }

  /**
   * Mock SMS for development/testing
   */
  private async sendMock(options: SMSOptions): Promise<SMSSendResult> {
    console.log('========== MOCK SMS SENT ==========');
    console.log('To:', options.to);
    console.log('Text:', options.text);
    console.log('Sender:', this.senderName);
    console.log('===================================');
    
    await this.incrementCounter();
    const remaining = await this.getRemainingToday();
    return { success: true, remaining: this.dailyLimit - remaining };
  }
}

// ============ SMS TEMPLATES ============

/**
 * SMS sent to customer when reservation is confirmed by worker
 */
export function smsReservationConfirmed(customerName: string, date: string, time: string): string {
  // Keep under 160 chars for single SMS
  const name = customerName.split(' ')[0]; // First name only
  return `${name}, Vaše rezervace v Studio Natali na ${date} v ${time} byla potvrzena. Těšíme se na Vás! Info: +420774889606`;
}

/**
 * SMS sent to customer when reservation is rejected
 */
export function smsReservationRejected(customerName: string, date: string): string {
  const name = customerName.split(' ')[0];
  return `${name}, bohužel Vaši rezervaci na ${date} v Studio Natali nemůžeme potvrdit. Zkuste prosím jiný termín na studionatali-ricany.cz`;
}

/**
 * SMS reminder sent day before appointment
 */
export function smsReservationReminder(customerName: string, date: string, time: string): string {
  const name = customerName.split(' ')[0];
  return `Připomínka: ${name}, zítra ${date} v ${time} máte rezervaci v Studio Natali. Adresa: Černokostelecká 80/42, Říčany. Tel: +420774889606`;
}

/**
 * SMS sent to worker when new reservation arrives
 */
export function smsNewReservationForWorker(customerName: string, date: string, time: string): string {
  return `Nová rezervace: ${customerName}, ${date} v ${time}. Schválte na webu.`;
}
