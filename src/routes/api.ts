import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, WorkingHoursOverride } from '../types';
import { signJWT, verifyJWT, verifyPassword, hashPassword } from '../lib/auth';
import * as db from '../lib/db';
import { EmailService, generateConfirmationEmail, generateApprovalRequestEmail, generateApprovedEmail, generateRejectedEmail } from '../lib/email';
import { SMSService, smsReservationConfirmed, smsReservationRejected, smsNewReservationForWorker } from '../lib/sms';
import { parse } from 'date-fns';

export const apiRoutes = new Hono<{ Bindings: Env }>();

async function requireAuth(c: { env: Env } & { json: (body: unknown, status?: number) => Response }) {
  const token = getCookie(c as any, 'auth_token');
  if (!token) return (c as any).json({ error: 'Nepřihlášen' }, 401);

  const payload = await verifyJWT(token, (c as any).env.JWT_SECRET);
  if (!payload) return (c as any).json({ error: 'Neplatný token' }, 401);

  return payload;
}

async function requireAdmin(c: { env: Env } & { json: (body: unknown, status?: number) => Response }) {
  const payload = await requireAuth(c);
  if (payload instanceof Response) return payload;

  if (payload.role !== 'admin' && payload.role !== 'superadmin') {
    return (c as any).json({ error: 'Nedostatečná oprávnění' }, 403);
  }

  return payload;
}

async function requireStaff(c: { env: Env } & { json: (body: unknown, status?: number) => Response }) {
  const payload = await requireAuth(c);
  if (payload instanceof Response) return payload;

  return payload;
}

async function getBookingWindowDays(dbConn: Env['DB']) {
  const settings = await db.getAllSettings(dbConn);
  const bookingWindowValue = settings.find(s => s.key === 'booking_window')?.value;
  const parsed = parseInt(bookingWindowValue || '30', 10);
  return Number.isNaN(parsed) ? 30 : parsed;
}

async function getRetentionDays(dbConn: Env['DB']) {
  const settings = await db.getAllSettings(dbConn);
  const retentionValue = settings.find(s => s.key === 'data_retention_days')?.value;
  const parsed = parseInt(retentionValue || '1095', 10);
  return Number.isNaN(parsed) ? 1095 : parsed;
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function createSMSService(dbConn: D1Database, env: Env) {
  const settings = await db.getAllSettings(dbConn);
  const settingsMap = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);
  return new SMSService(dbConn, settingsMap, env);
}

function isWithinBookingWindow(dateStr: string, bookingWindowDays: number) {
  const requested = parseLocalDate(dateStr);
  if (!requested) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + bookingWindowDays);
  maxDate.setHours(23, 59, 59, 999);
  return requested >= today && requested <= maxDate;
}

// ============ AUTH ============

apiRoutes.post('/auth', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({ error: 'Chybí email nebo heslo' }, 400);
    }
    
    const user = await db.getUserByEmail(c.env.DB, email);
    if (!user) {
      return c.json({ error: 'Neplatné přihlašovací údaje' }, 401);
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Neplatné přihlašovací údaje' }, 401);
    }
    
    const token = await signJWT(
      { userId: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET
    );
    
    const requestUrl = new URL(c.req.url);
    const isLocalhost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    
    const { password_hash, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Chyba při přihlášení' }, 500);
  }
});

apiRoutes.get('/auth', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    if (!token) {
      return c.json({ error: 'Nepřihlášen' }, 401);
    }
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: 'Neplatný token' }, 401);
    }
    
    return c.json({ user: payload });
  } catch (error) {
    return c.json({ error: 'Chyba ověření' }, 500);
  }
});

apiRoutes.delete('/auth', async (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ message: 'Odhlášení úspěšné' });
});

// ============ WORKERS ============

apiRoutes.get('/workers', async (c) => {
  try {
    const workers = await db.getWorkers(c.env.DB);
    return c.json({ workers });
  } catch (error) {
    console.error('Workers error:', error);
    return c.json({ error: 'Nepodařilo se načíst pracovníky' }, 500);
  }
});

// ============ SERVICES ============

apiRoutes.get('/services', async (c) => {
  try {
    const category = c.req.query('category');
    const workerId = c.req.query('workerId');
    
    let services;
    if (workerId) {
      services = await db.getServicesByUserId(c.env.DB, parseInt(workerId));
    } else {
      services = await db.getAllServices(c.env.DB);
    }
    
    const categories = await db.getAllCategories(c.env.DB);
    
    return c.json({ services, categories });
  } catch (error) {
    console.error('Services error:', error);
    return c.json({ error: 'Nepodařilo se načíst služby' }, 500);
  }
});

// ============ RESERVATIONS ============

apiRoutes.get('/availability', async (c) => {
  try {
    const start = c.req.query('start');
    const end = c.req.query('end');
    const workerId = c.req.query('workerId');
    const totalDuration = c.req.query('totalDuration');

    if (!start || !end || !workerId || !totalDuration) {
      return c.json({ error: 'Chybí parametry' }, 400);
    }

    const duration = parseInt(totalDuration, 10);
    const worker = parseInt(workerId, 10);
    if (Number.isNaN(duration) || Number.isNaN(worker) || duration <= 0) {
      return c.json({ error: 'Neplatné parametry' }, 400);
    }

    // Clean expired locks first
    await c.env.DB.prepare(`
      DELETE FROM reservations 
      WHERE status = 'locked' AND lock_expires_at < datetime('now')
    `).run();

    const bookingWindow = await getBookingWindowDays(c.env.DB);
    const startDate = parseLocalDate(start);
    const endDate = parseLocalDate(end);
    if (!startDate || !endDate) {
      return c.json({ error: 'Neplatné datum' }, 400);
    }

    const availableDates: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (isWithinBookingWindow(dateStr, bookingWindow)) {
        const slots = await db.getAvailableSlots(c.env.DB, dateStr, duration, worker);
        if (slots.length > 0) availableDates.push(dateStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return c.json({ availableDates });
  } catch (error) {
    console.error('Availability error:', error);
    return c.json({ error: 'Nepodařilo se načíst dostupnost' }, 500);
  }
});

apiRoutes.get('/reservations', async (c) => {
  try {
    const retentionDays = await getRetentionDays(c.env.DB);
    await db.purgeOldReservations(c.env.DB, retentionDays);

    const date = c.req.query('date');
    const workerId = c.req.query('workerId');
    const totalDuration = c.req.query('totalDuration');
    const detailed = c.req.query('detailed');
    const clientToken = c.req.query('clientToken');
    
    // If requesting available slots
    if (date && totalDuration && workerId) {
      const bookingWindow = await getBookingWindowDays(c.env.DB);
      if (!isWithinBookingWindow(date, bookingWindow)) {
        return c.json({ slots: [] });
      }
      
      // Clean expired locks first
      await c.env.DB.prepare(`
        DELETE FROM reservations 
        WHERE status = 'locked' AND lock_expires_at < datetime('now')
      `).run();
      
      const slots = await db.getAvailableSlots(
        c.env.DB,
        date,
        parseInt(totalDuration),
        parseInt(workerId)
      );
      
      if (detailed === 'true') {
        // Fetch locked slots to overlay (only non-expired ones)
        const reservations = await db.getReservationsByDate(c.env.DB, date, parseInt(workerId));
        const lockedReservations = reservations.filter(r => r.status === 'locked');

        const slotStatuses: { time: string; status: 'available' | 'locked' | 'own-lock'; lockToken?: string }[] = slots.map(time => ({
          time,
          status: 'available',
        }));
        
        // Add locked slots to the list - distinguish own locks from others
        lockedReservations.forEach(r => {
            const isOwnLock = clientToken && r.lock_token === clientToken;
            // Only add if not already in available (shouldn't be, but safety check)
            if (!slots.includes(r.start_time)) {
                slotStatuses.push({ 
                  time: r.start_time, 
                  status: isOwnLock ? 'own-lock' : 'locked',
                  lockToken: isOwnLock ? r.lock_token! : undefined
                });
            } else if (isOwnLock) {
              // If slot is available (own lock was cleaned from available slots computation)
              // Mark it as own-lock so client can reselect
              const idx = slotStatuses.findIndex(s => s.time === r.start_time);
              if (idx >= 0) {
                slotStatuses[idx].status = 'own-lock';
                slotStatuses[idx].lockToken = r.lock_token!;
              }
            }
        });

        // Sort by time
        slotStatuses.sort((a, b) => a.time.localeCompare(b.time));

        return c.json({ slots: slotStatuses });
      }
      
      return c.json({ slots });
    }
    
    // Otherwise return reservations (staff; non-admin limited to own)
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;

    const start = c.req.query('start') || '2025-01-01';
    const end = c.req.query('end') || '2026-12-31';
    
    const effectiveWorkerId = (auth.role === 'admin' || auth.role === 'superadmin')
      ? (workerId ? parseInt(workerId) : undefined)
      : auth.userId;

    const reservations = await db.getReservationsByDateRange(
      c.env.DB,
      start,
      end,
      effectiveWorkerId
    );
    
    return c.json(reservations);
  } catch (error) {
    console.error('Reservations GET error:', error);
    return c.json({ error: 'Nepodařilo se načíst rezervace' }, 500);
  }
});

apiRoutes.post('/reservations', async (c) => {
  try {
    const retentionDays = await getRetentionDays(c.env.DB);
    await db.purgeOldReservations(c.env.DB, retentionDays);

    const body = await c.req.json();
    
    const {
      workerId,
      date,
      time,
      customerName,
      customerEmail,
      customerPhone,
      note,
      termsAccepted,
      items,
      honeypot,
      lockToken,
    } = body;
    
    // Spam check
    if (honeypot) {
      return c.json({ message: 'Rezervace byla vytvořena' }, 201);
    }
    
    // Validation
    if (!workerId || !date || !time || !customerName || !customerEmail || !customerPhone) {
      return c.json({ error: 'Chybí povinné údaje' }, 400);
    }

    const bookingWindow = await getBookingWindowDays(c.env.DB);
    if (!isWithinBookingWindow(date, bookingWindow)) {
      return c.json({ error: 'Termín je mimo povolené období rezervace' }, 400);
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Musíte vybrat alespoň jednu službu' }, 400);
    }
    
    if (!termsAccepted) {
      return c.json({ error: 'Musíte souhlasit s obchodními podmínkami' }, 400);
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return c.json({ error: 'Neplatný formát e-mailu' }, 400);
    }

    const phoneRegex = /^\+?\d[\d\s]{8,}$/;
    if (!phoneRegex.test(customerPhone)) {
      return c.json({ error: 'Neplatný formát telefonního čísla' }, 400);
    }
    
    // Calculate total duration for availability check
    let totalDuration = 0;
    for (const item of items) {
      const service = await db.getServiceById(c.env.DB, item.serviceId);
      if (!service) {
        return c.json({ error: `Služba ${item.serviceId} neexistuje` }, 404);
      }
      totalDuration += service.duration * item.quantity;
    }
    
    if (lockToken) {
      // Delete user's own lock (both expired AND active) before checking availability
      await c.env.DB.prepare(`
        DELETE FROM reservations
        WHERE status = 'locked' AND lock_token = ?
      `).bind(lockToken).run();
    }

    // Check availability (now that our lock is removed, the slot should be free)
    const availableSlots = await db.getAvailableSlots(c.env.DB, date, totalDuration, workerId);
    if (!availableSlots.includes(time)) {
      return c.json({ error: 'Vybraný termín již není k dispozici' }, 409);
    }
    
    // Create reservation
    const reservation = await db.createReservation(c.env.DB, {
      worker_id: workerId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      date,
      start_time: time,
      note: note || null,
      terms_accepted: termsAccepted,
      items: items.map((item: { serviceId: number; quantity: number }) => ({
        service_id: item.serviceId,
        quantity: item.quantity,
      })),
    });
    
    // Send Emails
    const emailService = new EmailService(c.env);
    
    // 1. Confirmation to Customer
    const cancelLink = `${c.env.APP_URL}/rezervace/zrusit/${reservation.management_token}`;
    const servicesList = reservation.items.map(i => i.service_name).join(', ');
    
    await emailService.send({
      to: customerEmail,
      subject: 'Potvrzení přijetí rezervace - Studio Natali',
      html: generateConfirmationEmail(
        customerName,
        date,
        time,
        servicesList,
        cancelLink
      )
    });

    // 2. Approval Request to Worker
    const worker = await db.getUserById(c.env.DB, workerId);
    if (worker && (worker.notification_email || worker.email)) {
      const approveLink = `${c.env.APP_URL}/admin/rezervace/schvalit/${reservation.management_token}`;
      const rejectLink = `${c.env.APP_URL}/admin/rezervace/odmitnout/${reservation.management_token}`;
      
      await emailService.send({
        to: worker.notification_email || worker.email,
        subject: 'Nová rezervace ke schválení',
        html: generateApprovalRequestEmail(
          worker.name,
          reservation,
          approveLink,
          rejectLink
        )
      });
      
      // 3. SMS to worker about new reservation
      try {
        const smsService = await createSMSService(c.env.DB, c.env);
        if (smsService.isConfigured() && worker.notification_phone) {
          await smsService.send({
            to: worker.notification_phone,
            text: smsNewReservationForWorker(customerName, date, time),
          });
        }
      } catch (smsErr) {
        console.error('SMS send error (non-fatal):', smsErr);
      }
    }

    return c.json({
      reservation,
      message: 'Rezervace byla vytvořena a čeká na potvrzení',
    }, 201);
  } catch (error) {
    console.error('Reservation POST error:', error);
    return c.json({ error: 'Nepodařilo se vytvořit rezervaci' }, 500);
  }
});

apiRoutes.post('/reservations/lock', async (c) => {
  try {
    const body = await c.req.json();
    const { workerId, date, time, duration, clientToken } = body;

    if (!workerId || !date || !time || !duration || !clientToken) {
      return c.json({ error: 'Chybí parametry' }, 400);
    }

    const result = await db.createLock(c.env.DB, workerId, date, time, duration, clientToken);
    
    if (!result.success) {
      return c.json({ error: 'Termín je již obsazen' }, 409);
    }

    return c.json(result, 201);
  } catch (error) {
    console.error('Lock error:', error);
    return c.json({ error: 'Nepodařilo se zablokovat termín' }, 500);
  }
});

apiRoutes.post('/reservations/unlock', async (c) => {
  try {
    const body = await c.req.json();
    const { reservationId, clientToken } = body;

    if (!reservationId && !clientToken) {
      return c.json({ error: 'Chybí ID rezervace nebo klientský token' }, 400);
    }

    // Delete locked reservation - prefer clientToken. If using reservationId, require admin.
    if (clientToken) {
      await c.env.DB.prepare(`
        DELETE FROM reservations 
        WHERE status = 'locked' AND lock_token = ?
      `).bind(clientToken).run();
    } else {
      const auth = await requireStaff(c as any);
      if (auth instanceof Response) return auth;

      if (auth.role === 'admin' || auth.role === 'superadmin') {
        await c.env.DB.prepare(`
          DELETE FROM reservations 
          WHERE id = ? AND status = 'locked'
        `).bind(reservationId).run();
      } else {
        await c.env.DB.prepare(`
          DELETE FROM reservations 
          WHERE id = ? AND status = 'locked' AND user_id = ?
        `).bind(reservationId, auth.userId).run();
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Unlock error:', error);
    return c.json({ error: 'Nepodařilo se odemknout termín' }, 500);
  }
});

// ============ RESERVATION MANAGEMENT (from email links) ============

apiRoutes.post('/reservations/manage', async (c) => {
  try {
    const body = await c.req.json();
    const { token, action, reason } = body;

    if (!token || !action) {
      return c.json({ error: 'Chybí parametry' }, 400);
    }

    if (action !== 'approve' && action !== 'reject') {
      return c.json({ error: 'Neplatná akce' }, 400);
    }

    const reservation = await db.getReservationByToken(c.env.DB, token);
    if (!reservation) {
      return c.json({ error: 'Rezervace nenalezena' }, 404);
    }

    if (reservation.status !== 'pending') {
      return c.json({ error: 'Rezervace již byla zpracována' }, 409);
    }

    const emailService = new EmailService(c.env);

    if (action === 'approve') {
      await db.updateReservation(c.env.DB, reservation.id, {
        status: 'confirmed',
        workflow_step: 'approved',
      } as any);

      // Send confirmation email to customer
      const cancelLink = `${c.env.APP_URL}/rezervace/zrusit/${reservation.management_token}`;
      await emailService.send({
        to: reservation.customer_email,
        subject: 'Rezervace potvrzena - Studio Natali',
        html: generateApprovedEmail(
          reservation.customer_name,
          reservation.date,
          reservation.start_time,
          cancelLink
        ),
      });

      // SMS confirmation to customer
      try {
        const smsService = await createSMSService(c.env.DB, c.env);
        if (smsService.isConfigured() && reservation.customer_phone) {
          await smsService.send({
            to: reservation.customer_phone,
            text: smsReservationConfirmed(reservation.customer_name, reservation.date, reservation.start_time),
          });
        }
      } catch (smsErr) {
        console.error('SMS send error (non-fatal):', smsErr);
      }

      return c.json({ message: 'Rezervace byla schválena' });
    }

    // Reject / Cancel
    const cancelReason = reason || 'Bez udání důvodu';
    await db.updateReservation(c.env.DB, reservation.id, {
      status: 'cancelled',
      workflow_step: 'rejected',
      cancellation_reason: cancelReason,
    } as any);

    // Send rejection email to customer
    await emailService.send({
      to: reservation.customer_email,
      subject: 'Rezervace odmítnuta - Studio Natali',
      html: generateRejectedEmail(
        reservation.customer_name,
        reservation.date,
        reservation.start_time,
        cancelReason
      ),
    });

    // SMS rejection to customer
    try {
      const smsService = await createSMSService(c.env.DB, c.env);
      if (smsService.isConfigured() && reservation.customer_phone) {
        await smsService.send({
          to: reservation.customer_phone,
          text: smsReservationRejected(reservation.customer_name, reservation.date),
        });
      }
    } catch (smsErr) {
      console.error('SMS send error (non-fatal):', smsErr);
    }

    return c.json({ message: 'Rezervace byla odmítnuta' });
  } catch (error) {
    console.error('Reservation manage error:', error);
    return c.json({ error: 'Chyba při zpracování rezervace' }, 500);
  }
});

// ============ ADMIN CREATE RESERVATION ============

apiRoutes.post('/reservations/admin-create', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;

    if (auth.role !== 'admin' && auth.role !== 'superadmin') {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }

    const body = await c.req.json();
    const { workerId, date, time, customerName, customerEmail, customerPhone, note, items } = body;

    if (!workerId || !date || !time || !customerName || !customerPhone) {
      return c.json({ error: 'Chybí povinné údaje (pracovník, datum, čas, jméno, telefon)' }, 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Musíte vybrat alespoň jednu službu' }, 400);
    }

    // Email validation (optional for admin-created, phone-in bookings)
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return c.json({ error: 'Neplatný formát e-mailu' }, 400);
      }
    }

    // Calculate total duration for availability check
    let totalDuration = 0;
    for (const item of items) {
      const service = await db.getServiceById(c.env.DB, item.serviceId);
      if (!service) {
        return c.json({ error: `Služba ${item.serviceId} neexistuje` }, 404);
      }
      totalDuration += service.duration * (item.quantity || 1);
    }

    // Check availability
    const availableSlots = await db.getAvailableSlots(c.env.DB, date, totalDuration, workerId);
    if (!availableSlots.includes(time)) {
      return c.json({ error: 'Vybraný termín není k dispozici' }, 409);
    }

    // Create reservation directly as confirmed (admin doesn't need approval)
    const reservation = await db.createReservation(c.env.DB, {
      worker_id: workerId,
      customer_name: customerName,
      customer_email: customerEmail || 'admin-created@internal',
      customer_phone: customerPhone,
      date,
      start_time: time,
      note: note || 'Vytvořeno administrátorem (telefonická rezervace)',
      terms_accepted: true,
      items: items.map((item: { serviceId: number; quantity?: number }) => ({
        service_id: item.serviceId,
        quantity: item.quantity || 1,
      })),
    });

    // Set status to confirmed directly
    await db.updateReservation(c.env.DB, reservation.id, {
      status: 'confirmed',
      workflow_step: 'admin_created',
    } as any);

    // Send confirmation email to customer if email provided
    if (customerEmail) {
      const emailService = new EmailService(c.env);
      const cancelLink = `${c.env.APP_URL}/rezervace/zrusit/${reservation.management_token}`;
      const servicesList = reservation.items.map(i => i.service_name).join(', ');

      await emailService.send({
        to: customerEmail,
        subject: 'Potvrzení rezervace - Studio Natali',
        html: generateConfirmationEmail(
          customerName,
          date,
          time,
          servicesList,
          cancelLink
        ),
      });
    }

    return c.json({ reservation, message: 'Rezervace byla vytvořena a potvrzena' }, 201);
  } catch (error) {
    console.error('Admin create reservation error:', error);
    return c.json({ error: 'Nepodařilo se vytvořit rezervaci' }, 500);
  }
});

apiRoutes.post('/reservations/admin-block', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;

    const body = await c.req.json();
    const { workerId, date, startTime, endTime, reason } = body;

    if (!workerId || !date || !startTime || !endTime) {
      return c.json({ error: 'Chybí parametry' }, 400);
    }

    // Calculate duration
    const start = parse(startTime, 'HH:mm', parse(date, 'yyyy-MM-dd', new Date()));
    const end = parse(endTime, 'HH:mm', parse(date, 'yyyy-MM-dd', new Date()));
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);

    if (duration <= 0) {
      return c.json({ error: 'Neplatný časový úsek' }, 400);
    }

    // Create blocking reservation
    // We use a special customer email/name to identify blocks easily if needed,
    // or relying on status='blocked' which getAvailableSlots treats as busy.
    // Note: status 'blocked' is not in standard flow but accepted by DB string type.
    
    // We reuse createReservation but bypass some checks or manually insert if createReservation 
    // enforces validation we don't want (like email format).
    // createReservation checks email format. So better manual insert here.
    
    if (auth.role !== 'admin' && auth.role !== 'superadmin' && workerId !== auth.userId) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO reservations (
        user_id, customer_name, customer_email, customer_phone,
        date, start_time, end_time, total_duration,
        status, note, workflow_step
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'blocked', ?, 'admin_block')
    `).bind(
      workerId, 
      'Blokace - ' + (reason || 'Admin'), 
      'blocked@internal', 
      '000000000',
      date, 
      startTime, 
      endTime, // We assume HH:mm format
      duration,
      reason || 'Interní blokace'
    ).run();

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Admin block error:', error);
    return c.json({ error: 'Nepodařilo se vytvořit blokaci' }, 500);
  }
});

apiRoutes.get('/reservations/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;

    const id = parseInt(c.req.param('id'));
    const reservation = await db.getReservationById(c.env.DB, id);
    
    if (reservation && auth.role !== 'admin' && auth.role !== 'superadmin' && reservation.user_id !== auth.userId) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }

    if (!reservation) {
      return c.json({ error: 'Rezervace nenalezena' }, 404);
    }
    
    return c.json(reservation);
  } catch (error) {
    return c.json({ error: 'Chyba při načítání rezervace' }, 500);
  }
});

apiRoutes.patch('/reservations/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;

    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Whitelist allowed fields to prevent privilege escalation
    const allowedFields = ['status', 'date', 'start_time', 'end_time', 'note', 'customer_name', 'customer_email', 'customer_phone'];
    const safeBody: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeBody[key] = body[key];
    }

    if (auth.role !== 'admin' && auth.role !== 'superadmin') {
      const existing = await db.getReservationById(c.env.DB, id);
      if (!existing) return c.json({ error: 'Rezervace nenalezena' }, 404);
      if (existing.user_id !== auth.userId) {
        return c.json({ error: 'Nedostatečná oprávnění' }, 403);
      }
    }
    
    const reservation = await db.updateReservation(c.env.DB, id, safeBody);
    
    if (!reservation) {
      return c.json({ error: 'Rezervace nenalezena' }, 404);
    }
    
    return c.json(reservation);
  } catch (error) {
    return c.json({ error: 'Chyba při aktualizaci rezervace' }, 500);
  }
});

// ============ USERS (Admin) ============

apiRoutes.get('/users', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    if (!token) return c.json({ error: 'Nepřihlášen' }, 401);
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }
    
    const users = await db.getAllUsers(c.env.DB);
    return c.json({ users });
  } catch (error) {
    return c.json({ error: 'Chyba při načítání uživatelů' }, 500);
  }
});

// ============ SETTINGS ============

// SMS Status endpoint
apiRoutes.get('/sms/status', async (c) => {
  try {
    const auth = await requireAdmin(c as any);
    if (auth instanceof Response) return auth;

    const smsService = await createSMSService(c.env.DB, c.env);
    const remaining = await smsService.getRemainingToday();

    return c.json({
      enabled: smsService.isConfigured(),
      remaining,
    });
  } catch (error) {
    return c.json({ error: 'Chyba při zjišťování SMS stavu' }, 500);
  }
});

apiRoutes.get('/settings', async (c) => {
  try {
    const auth = await requireAdmin(c as any);
    if (auth instanceof Response) return auth;

    const settings = await db.getAllSettings(c.env.DB);
    return c.json({ settings });
  } catch (error) {
    return c.json({ error: 'Chyba při načítání nastavení' }, 500);
  }
});

// ============ GALLERY ============

apiRoutes.get('/gallery', async (c) => {
  try {
    const images = await db.getAllGalleryImages(c.env.DB);
    return c.json({ images });
  } catch (error) {
    return c.json({ error: 'Chyba při načítání galerie' }, 500);
  }
});

apiRoutes.post('/gallery', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    // We expect JSON body with base64 image
    const body = await c.req.json();
    const { image, alt } = body;
    
    if (!image) return c.json({ error: 'Chybí obrázek' }, 400);
    
    // Image is already base64 string from frontend
    const created = await db.createGalleryImage(c.env.DB, image, alt);
    
    return c.json(created, 201);
  } catch (error) {
    console.error('Gallery upload error:', error);
    return c.json({ error: 'Chyba při nahrávání obrázku' }, 500);
  }
});

apiRoutes.patch('/gallery/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    
    if (body.alt !== undefined) {
      await db.updateGalleryImage(c.env.DB, id, body.alt);
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při úpravě obrázku' }, 500);
  }
});

apiRoutes.delete('/gallery/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    await db.deleteGalleryImage(c.env.DB, id);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při mazání obrázku' }, 500);
  }
});

// ============ SERVICES CRUD ============

apiRoutes.post('/services', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const body = await c.req.json();
    const service = await db.createService(c.env.DB, body);
    return c.json(service, 201);
  } catch (error) {
    console.error('Create service error:', error);
    return c.json({ error: 'Chyba při vytváření služby' }, 500);
  }
});

apiRoutes.put('/services/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    
    // Whitelist allowed fields
    const allowedFields = ['name', 'description', 'category_id', 'user_id', 'price', 'price_type', 'duration', 'is_active'];
    const safeBody: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeBody[key] = body[key];
    }
    
    const service = await db.updateService(c.env.DB, id, safeBody);
    
    if (!service) return c.json({ error: 'Služba nenalezena' }, 404);
    return c.json(service);
  } catch (error) {
    return c.json({ error: 'Chyba při aktualizaci služby' }, 500);
  }
});

apiRoutes.delete('/services/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    const deleted = await db.deleteService(c.env.DB, id);
    
    if (!deleted) return c.json({ error: 'Služba nenalezena' }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při mazání služby' }, 500);
  }
});

// ============ CATEGORIES CRUD ============

apiRoutes.post('/services/categories', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const body = await c.req.json();
    const category = await db.createCategory(c.env.DB, body);
    return c.json(category, 201);
  } catch (error) {
    return c.json({ error: 'Chyba při vytváření kategorie' }, 500);
  }
});

apiRoutes.put('/services/categories/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const category = await db.updateCategory(c.env.DB, id, body);
    
    if (!category) return c.json({ error: 'Kategorie nenalezena' }, 404);
    return c.json(category);
  } catch (error) {
    return c.json({ error: 'Chyba při aktualizaci kategorie' }, 500);
  }
});

apiRoutes.delete('/services/categories/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    const deleted = await db.deleteCategory(c.env.DB, id);
    
    if (!deleted) return c.json({ error: 'Kategorie nenalezena' }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při mazání kategorie' }, 500);
  }
});

// ============ USERS CRUD ============

apiRoutes.post('/users', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    if (!token) return c.json({ error: 'Nepřihlášen' }, 401);
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }
    
    const body = await c.req.json();
    const { password, ...userData } = body;
    
    if (!password) {
      return c.json({ error: 'Chybí heslo' }, 400);
    }
    
    const passwordHash = await hashPassword(password);
    const slug = userData.name.toLowerCase().replace(/\s+/g, '-');
    
    const user = await db.createUser(c.env.DB, {
      ...userData,
      password_hash: passwordHash,
      slug,
    });
    
    const { password_hash, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: 'Chyba při vytváření uživatele' }, 500);
  }
});

apiRoutes.put('/users/:id', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    if (!token) return c.json({ error: 'Nepřihlášen' }, 401);
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }
    
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { password, ...rawUpdates } = body;
    
    // Whitelist allowed fields
    const allowedFields = ['email', 'name', 'slug', 'role', 'bio', 'phone', 'image', 'color', 'notification_email', 'notification_phone', 'is_active'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in rawUpdates) updates[key] = rawUpdates[key];
    }
    
    if (password) {
      const passwordHash = await hashPassword(password);
      await db.updateUserPassword(c.env.DB, id, passwordHash);
    }
    
    const user = await db.updateUser(c.env.DB, id, updates);
    if (!user) return c.json({ error: 'Uživatel nenalezen' }, 404);
    
    return c.json(user);
  } catch (error) {
    return c.json({ error: 'Chyba při aktualizaci uživatele' }, 500);
  }
});

apiRoutes.delete('/users/:id', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    if (!token) return c.json({ error: 'Nepřihlášen' }, 401);
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }
    
    const id = parseInt(c.req.param('id'));
    const deleted = await db.deleteUser(c.env.DB, id);
    
    if (!deleted) return c.json({ error: 'Uživatel nenalezen' }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při mazání uživatele' }, 500);
  }
});

apiRoutes.patch('/users/profile', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    if (!token) return c.json({ error: 'Nepřihlášen' }, 401);
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) return c.json({ error: 'Neplatný token' }, 401);
    
    const body = await c.req.json();
    const { currentPassword, newPassword, ...updates } = body;
    
    if (currentPassword && newPassword) {
      const user = await db.getUserById(c.env.DB, payload.userId);
      if (!user) return c.json({ error: 'Uživatel nenalezen' }, 404);
      
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) return c.json({ error: 'Nesprávné současné heslo' }, 400);
      
      const passwordHash = await hashPassword(newPassword);
      await db.updateUserPassword(c.env.DB, payload.userId, passwordHash);
    }
    
    const user = await db.updateUser(c.env.DB, payload.userId, updates);
    return c.json(user);
  } catch (error) {
    return c.json({ error: 'Chyba při aktualizaci profilu' }, 500);
  }
});

// ============ WORKING HOURS ============

apiRoutes.get('/working-hours/overrides', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const workerId = c.req.query('workerId');
    if (!workerId) return c.json({ error: 'Chybí ID pracovníka' }, 400);

    if (auth.role !== 'admin' && auth.role !== 'superadmin' && parseInt(workerId) !== auth.userId) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }

    const overrides = await db.getWorkingOverrides(c.env.DB, parseInt(workerId));
    return c.json({ overrides });
  } catch (error) {
    return c.json({ error: 'Chyba při načítání výjimek' }, 500);
  }
});

apiRoutes.post('/working-hours/overrides', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const body = await c.req.json();

    if (auth.role !== 'admin' && auth.role !== 'superadmin' && body?.user_id !== auth.userId) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }
    const override = await db.createWorkingOverride(c.env.DB, body);
    return c.json(override, 201);
  } catch (error) {
    return c.json({ error: 'Chyba při ukládání výjimky' }, 500);
  }
});

apiRoutes.delete('/working-hours/overrides/:id', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const id = parseInt(c.req.param('id'));
    await db.deleteWorkingOverride(c.env.DB, id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při mazání výjimky' }, 500);
  }
});

apiRoutes.post('/working-hours', async (c) => {
  try {
    const auth = await requireStaff(c as any);
    if (auth instanceof Response) return auth;
    
    const body = await c.req.json();

    if (auth.role !== 'admin' && auth.role !== 'superadmin' && body?.user_id !== auth.userId) {
      return c.json({ error: 'Nedostatečná oprávnění' }, 403);
    }
    console.log('Working hours save request:', JSON.stringify(body));
    await db.upsertWorkingHours(c.env.DB, body);
    return c.json({ success: true });
  } catch (error) {
    console.error('Working hours save error:', error);
    return c.json({ error: 'Chyba při ukládání pracovní doby' }, 500);
  }
});

// ============ SETTINGS SAVE ============

apiRoutes.post('/settings', async (c) => {
  try {
    const auth = await requireAdmin(c as any);
    if (auth instanceof Response) return auth;
    
    const body = await c.req.json();
    
    for (const [key, value] of Object.entries(body)) {
      await db.updateSetting(c.env.DB, key, String(value));
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Chyba při ukládání nastavení' }, 500);
  }
});

// ============ AVAILABILITY CHECK (month-level) ============

apiRoutes.get('/availability', async (c) => {
  try {
    const start = c.req.query('start');
    const end = c.req.query('end');
    const workerId = c.req.query('workerId');
    const totalDuration = c.req.query('totalDuration');

    if (!start || !end || !workerId || !totalDuration) {
      return c.json({ availableDates: [] });
    }

    const bookingWindow = await getBookingWindowDays(c.env.DB);
    const availableDates: string[] = [];

    // Iterate through date range and check if each day has available slots
    const startDate = parseLocalDate(start);
    const endDate = parseLocalDate(end);
    
    if (!startDate || !endDate) {
      return c.json({ availableDates: [] });
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      
      if (isWithinBookingWindow(dateStr, bookingWindow)) {
        const slots = await db.getAvailableSlots(
          c.env.DB,
          dateStr,
          parseInt(totalDuration),
          parseInt(workerId)
        );
        
        if (slots.length > 0) {
          availableDates.push(dateStr);
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    return c.json({ availableDates });
  } catch (error) {
    console.error('Availability check error:', error);
    return c.json({ availableDates: [] });
  }
});
