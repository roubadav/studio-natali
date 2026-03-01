/**
 * Agent Booking API – Studio Natali
 *
 * Veřejné API určené pro AI asistenty (ChatGPT, Copilot, Claude, Perplexity atd.),
 * kteří mohou rezervovat termíny jménem zákazníka.
 *
 * Ochrana před spamem:
 *  1. SMS OTP – každá rezervace vyžaduje ověřovací kód zaslaný SMS zákazníkovi
 *  2. Rate limiting – nastaveno v index.tsx (10 OTP ověřovacích pokusů / IP / hodinu, brute-force ochrana)
 *  3. Max 2 čekající rezervace na jedno telefonní číslo najednou
 *  4. OTP vyprší za 30 minut, max. 3 chybné pokusy
 *
 * Průběh:
 *  1. GET  /api/agent/services     → seznam služeb s ID
 *  2. GET  /api/agent/workers      → seznam kadeřnic s ID
 *  3. GET  /api/agent/availability → volné sloty pro daný den
 *  4. POST /api/agent/book         → vytvoří čekající záznam, odešle SMS OTP zákazníkovi
 *  5. POST /api/agent/verify       → zákazník/agent ověří OTP → rezervace je vytvořena
 */

import type { Hono } from 'hono';
import type { Env } from '../types';
import * as db from '../lib/db';
import {
  EmailService,
  generateConfirmationEmail,
  generateApprovalRequestEmail,
} from '../lib/email';
import { parseLocalDate, isWithinBookingWindow } from '../lib/booking';
import { createSMSService, getBookingWindowDays } from './apiShared';
import { smsNewReservationForWorker } from '../lib/sms';

// ── Pomocné funkce ──────────────────────────────────────────────────────────────

/** Normalizace CZ telefonního čísla na formát +420XXXXXXXXX */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+420')) return cleaned;
  if (cleaned.startsWith('00420')) return '+' + cleaned.substring(2);
  if (/^[67]\d{8}$/.test(cleaned)) return '+420' + cleaned;
  if (cleaned.length === 9) return '+420' + cleaned;
  return cleaned;
}

/** Vygeneruje 6místný OTP kód */
function generateOTP(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, '0');
}

/** Vygeneruje bezpečný verification token */
function generateVerificationToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

/** Vrátí ISO čas za N minut od teď */
function expiresAt(minutes = 30): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

// ── Registrace rout ─────────────────────────────────────────────────────────────

export function registerAgentRoutes(apiRoutes: Hono<{ Bindings: Env }>) {
  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/agent/services
  // Vrátí seznam aktivních služeb pro AI agenta (bez auth).
  // ────────────────────────────────────────────────────────────────────────────
  apiRoutes.get('/agent/services', async (c) => {
    try {
      const services = await db.getAllServices(c.env.DB, true);
      return c.json({
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || null,
          price: s.price,
          price_type: s.price_type,
          duration: s.duration,
          category: s.category_name || null,
          worker_id: s.user_id,
        })),
      });
    } catch (err) {
      console.error('agent/services error:', err);
      return c.json({ error: 'Nepodařilo se načíst služby' }, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/agent/workers
  // Vrátí seznam kadeřnic s online rezervací (bez auth).
  // ────────────────────────────────────────────────────────────────────────────
  apiRoutes.get('/agent/workers', async (c) => {
    try {
      const workers = await db.getBookableWorkers(c.env.DB);
      return c.json({
        workers: workers.map((w) => ({
          id: w.id,
          name: w.name,
          bio: w.bio || null,
          slug: w.slug,
        })),
      });
    } catch (err) {
      console.error('agent/workers error:', err);
      return c.json({ error: 'Nepodařilo se načíst kadeřnice' }, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /api/agent/availability?workerId=&date=&duration=
  // Vrátí volné sloty pro daný den (bez auth).
  // ────────────────────────────────────────────────────────────────────────────
  apiRoutes.get('/agent/availability', async (c) => {
    try {
      const workerIdStr = c.req.query('workerId');
      const date = c.req.query('date');
      const durationStr = c.req.query('duration');

      if (!workerIdStr || !date || !durationStr) {
        return c.json({ error: 'Chybí parametry: workerId, date, duration' }, 400);
      }

      const workerId = parseInt(workerIdStr, 10);
      const duration = parseInt(durationStr, 10);

      if (Number.isNaN(workerId) || Number.isNaN(duration) || duration <= 0) {
        return c.json({ error: 'Neplatné parametry' }, 400);
      }

      if (!parseLocalDate(date)) {
        return c.json({ error: 'Neplatné datum. Použij formát YYYY-MM-DD' }, 400);
      }

      const bookingWindow = await getBookingWindowDays(c.env.DB);
      if (!isWithinBookingWindow(date, bookingWindow)) {
        return c.json({
          error: `Datum je mimo dostupné rezervační okno (${bookingWindow} dní dopředu)`,
          slots: [],
        }, 400);
      }

      // Smazat vypršené zámky
      await c.env.DB.prepare(
        `DELETE FROM reservations WHERE status = 'locked' AND lock_expires_at < datetime('now')`
      ).run();

      const slots = await db.getAvailableSlots(c.env.DB, date, duration, workerId);

      return c.json({ date, slots });
    } catch (err) {
      console.error('agent/availability error:', err);
      return c.json({ error: 'Nepodařilo se načíst dostupnost' }, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/agent/book
  // Krok 1: vytvoří čekající záznam + odešle SMS OTP zákazníkovi.
  // ────────────────────────────────────────────────────────────────────────────
  apiRoutes.post('/agent/book', async (c) => {
    try {
      // Smazat vypršené verifikace
      await c.env.DB.prepare(
        `DELETE FROM agent_verifications WHERE expires_at < datetime('now')`
      ).run();

      const body = await c.req.json();

      const {
        workerId,
        date,
        time,
        customerName,
        customerPhone,
        customerEmail,
        items,
        note,
        termsAccepted,
      } = body;

      // Základní validace
      if (!workerId || !date || !time || !customerName || !customerPhone || !customerEmail) {
        return c.json({ error: 'Chybí povinné pole: workerId, date, time, customerName, customerPhone, customerEmail' }, 400);
      }

      if (!termsAccepted) {
        return c.json({
          error: 'Zákazník musí souhlasit s obchodními podmínkami (termsAccepted: true). Viz https://studionatali-ricany.cz/obchodni-podminky',
        }, 400);
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return c.json({ error: 'Pole items musí obsahovat alespoň jednu službu' }, 400);
      }

      // Validace e-mailu
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return c.json({ error: 'Neplatný e-mail' }, 400);
      }

      // Validace telefonu
      const phone = normalizePhone(customerPhone);
      if (!/^\+\d{10,15}$/.test(phone)) {
        return c.json({ error: 'Neplatný formát telefonního čísla (použij mezinárodní formát nebo české číslo bez předvolby)' }, 400);
      }

      // Validace data
      if (!parseLocalDate(date)) {
        return c.json({ error: 'Neplatné datum. Použij formát YYYY-MM-DD' }, 400);
      }

      const bookingWindow = await getBookingWindowDays(c.env.DB);
      if (!isWithinBookingWindow(date, bookingWindow)) {
        return c.json({ error: `Datum je mimo rezervační okno (${bookingWindow} dní dopředu)` }, 400);
      }

      // Validace existujících položek
      let totalDuration = 0;
      for (const item of items) {
        const service = await db.getServiceById(c.env.DB, item.serviceId);
        if (!service) {
          return c.json({ error: `Služba ID ${item.serviceId} neexistuje` }, 404);
        }
        if (service.user_id !== workerId) {
          return c.json({ error: `Služba ID ${item.serviceId} není k dispozici u vybrané kadeřnice` }, 400);
        }
        totalDuration += service.duration * (item.quantity || 1);
      }

      // Ověření dostupnosti termínu
      await c.env.DB.prepare(
        `DELETE FROM reservations WHERE status = 'locked' AND lock_expires_at < datetime('now')`
      ).run();

      const availableSlots = await db.getAvailableSlots(c.env.DB, date, totalDuration, workerId);
      if (!availableSlots.includes(time)) {
        return c.json({ error: 'Vybraný termín není k dispozici. Zkus /api/agent/availability pro aktuální volné sloty.' }, 409);
      }

      // Anti-spam: max 2 čekající verifikace na jedno telefonní číslo
      const pendingCount = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM agent_verifications WHERE phone = ? AND expires_at > datetime('now')`
      ).bind(phone).first<{ cnt: number }>();

      if (pendingCount && pendingCount.cnt >= 2) {
        return c.json({
          error: 'Pro toto telefonní číslo existují 2 čekající rezervace. Počkej na jejich vypršení nebo dokonči ověření.',
        }, 429);
      }

      // Generování OTP a tokenu
      const otpCode = generateOTP();
      const verificationToken = generateVerificationToken();
      const tokenExpiry = expiresAt(30);

      // Uložení čekající verifikace
      const reservationData = JSON.stringify({
        workerId,
        date,
        time,
        customerName,
        customerPhone: phone,
        customerEmail,
        items: items.map((i: { serviceId: number; quantity?: number }) => ({
          serviceId: i.serviceId,
          quantity: i.quantity || 1,
        })),
        note: note || null,
        termsAccepted: true,
      });

      await c.env.DB.prepare(`
        INSERT INTO agent_verifications (verification_token, reservation_data, otp_code, phone, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(verificationToken, reservationData, otpCode, phone, tokenExpiry).run();

      // Odeslání SMS s OTP kódem
      let smsSent = false;
      try {
        const smsService = await createSMSService(c.env.DB, c.env);
        if (smsService.isConfigured()) {
          const smsResult = await smsService.send({
            to: phone,
            text: `Studio Natali: Tvůj ověřovací kód pro rezervaci ${date} v ${time} je: ${otpCode}. Platí 30 minut.`,
          });
          smsSent = smsResult.success;
        }
      } catch (smsErr) {
        console.error('Agent booking SMS error:', smsErr);
        // V testovacím prostředí bez SMS logy kód do konzole
        console.log(`[DEV] OTP pro ${phone}: ${otpCode}`);
      }

      return c.json({
        verification_token: verificationToken,
        message: smsSent
          ? `SMS s ověřovacím kódem byla odeslána na ${phone}. Zákazník zadá kód do /api/agent/verify.`
          : `SMS není nakonfigurována. Pro dokončení rezervace je potřeba OTP kód (testovací prostředí: zkontroluj server logy).`,
        expires_at: tokenExpiry,
        sms_sent: smsSent,
        next_step: 'POST /api/agent/verify s { verification_token, otp_code }',
      });
    } catch (err) {
      console.error('agent/book error:', err);
      return c.json({ error: 'Nepodařilo se vytvořit rezervaci' }, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /api/agent/verify
  // Krok 2: zákazník/agent ověří OTP → rezervace je vytvořena
  // ────────────────────────────────────────────────────────────────────────────
  apiRoutes.post('/agent/verify', async (c) => {
    try {
      const body = await c.req.json();
      const { verification_token, otp_code } = body;

      if (!verification_token || !otp_code) {
        return c.json({ error: 'Chybí verification_token nebo otp_code' }, 400);
      }

      if (!/^\d{6}$/.test(String(otp_code))) {
        return c.json({ error: 'otp_code musí být 6místné číslo' }, 400);
      }

      // Načtení záznamu
      const record = await c.env.DB.prepare(`
        SELECT * FROM agent_verifications
        WHERE verification_token = ? AND expires_at > datetime('now')
      `).bind(verification_token).first<{
        id: number;
        verification_token: string;
        reservation_data: string;
        otp_code: string;
        phone: string;
        attempts: number;
        expires_at: string;
      }>();

      if (!record) {
        return c.json({ error: 'Neplatný nebo vypršený verification_token. Spusť rezervaci znovu přes /api/agent/book.' }, 400);
      }

      // Kontrola počtu pokusů
      if (record.attempts >= 3) {
        await c.env.DB.prepare(
          `DELETE FROM agent_verifications WHERE id = ?`
        ).bind(record.id).run();
        return c.json({ error: 'Příliš mnoho chybných pokusů. Spusť rezervaci znovu přes /api/agent/book.' }, 429);
      }

      // Ověření kódu
      if (record.otp_code !== String(otp_code)) {
        await c.env.DB.prepare(
          `UPDATE agent_verifications SET attempts = attempts + 1 WHERE id = ?`
        ).bind(record.id).run();
        const remaining = 2 - record.attempts;
        return c.json({ error: `Nesprávný kód. Zbývají ${remaining} pokusy.` }, 400);
      }

      // OTP ověřen – smazat verifikaci a vytvořit rezervaci
      await c.env.DB.prepare(
        `DELETE FROM agent_verifications WHERE id = ?`
      ).bind(record.id).run();

      const reservationData = JSON.parse(record.reservation_data);

      // Znovu ověřit dostupnost před finálním vytvořením
      let totalDuration = 0;
      const mappedItems: Array<{ service_id: number; quantity: number }> = [];
      for (const item of reservationData.items) {
        const service = await db.getServiceById(c.env.DB, item.serviceId);
        if (!service) {
          return c.json({ error: `Služba ID ${item.serviceId} již neexistuje` }, 400);
        }
        totalDuration += service.duration * item.quantity;
        mappedItems.push({ service_id: item.serviceId, quantity: item.quantity });
      }

      await c.env.DB.prepare(
        `DELETE FROM reservations WHERE status = 'locked' AND lock_expires_at < datetime('now')`
      ).run();

      const availableSlots = await db.getAvailableSlots(
        c.env.DB,
        reservationData.date,
        totalDuration,
        reservationData.workerId
      );

      if (!availableSlots.includes(reservationData.time)) {
        return c.json({ error: 'Termín byl obsazen během ověřování. Spusť rezervaci znovu přes /api/agent/book.' }, 409);
      }

      // Vytvořit rezervaci
      const reservation = await db.createReservation(c.env.DB, {
        worker_id: reservationData.workerId,
        customer_name: reservationData.customerName,
        customer_email: reservationData.customerEmail,
        customer_phone: reservationData.customerPhone,
        date: reservationData.date,
        start_time: reservationData.time,
        note: reservationData.note,
        terms_accepted: true,
        items: mappedItems,
      });

      // Odeslat e-mail zákazníkovi
      const emailService = new EmailService(c.env);
      const cancelLink = `${c.env.APP_URL}/rezervace/zrusit/${reservation.management_token}`;
      const servicesList = reservation.items.map((i) => i.service_name).join(', ');

      await emailService.send({
        to: reservationData.customerEmail,
        subject: 'Potvrzení přijetí rezervace - Studio Natali',
        html: generateConfirmationEmail(
          reservationData.customerName,
          reservationData.date,
          reservationData.time,
          servicesList,
          cancelLink
        ),
      }).catch((e) => console.error('Agent verify email error:', e));

      // Notifikovat kadeřnici
      const worker = await db.getUserById(c.env.DB, reservationData.workerId);
      if (worker && (worker.notification_email || worker.email)) {
        const approveLink = `${c.env.APP_URL}/admin/rezervace/schvalit/${reservation.management_token}`;
        const rejectLink = `${c.env.APP_URL}/admin/rezervace/odmitnout/${reservation.management_token}`;

        await emailService.send({
          to: worker.notification_email || worker.email,
          subject: 'Nová rezervace (AI agent) ke schválení',
          html: generateApprovalRequestEmail(worker.name, reservation, approveLink, rejectLink),
        }).catch((e) => console.error('Agent verify worker email error:', e));

        try {
          const smsService = await createSMSService(c.env.DB, c.env);
          if (smsService.isConfigured() && worker.notification_phone) {
            await smsService.send({
              to: worker.notification_phone,
              text: smsNewReservationForWorker(
                reservationData.customerName,
                reservationData.date,
                reservationData.time
              ),
            });
          }
        } catch (smsErr) {
          console.error('Agent verify worker SMS error (non-fatal):', smsErr);
        }
      }

      return c.json(
        {
          message: 'Rezervace byla úspěšně vytvořena. Potvrzení bylo odesláno e-mailem.',
          reservation_id: reservation.id,
          date: reservationData.date,
          time: reservationData.time,
          worker: worker?.name || 'Kadeřnice',
          services: servicesList,
          status: reservation.status,
          cancel_link: cancelLink,
        },
        201
      );
    } catch (err) {
      console.error('agent/verify error:', err);
      return c.json({ error: 'Nepodařilo se ověřit rezervaci' }, 500);
    }
  });
}
