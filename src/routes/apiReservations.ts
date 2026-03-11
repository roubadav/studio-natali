import type { Hono } from 'hono';
import { parse } from 'date-fns';
import type { Env } from '../types';
import * as db from '../lib/db';
import { EmailService, generateConfirmationEmail, generateApprovalRequestEmail, generateApprovedEmail, generateRejectedEmail } from '../lib/email';
import { requireStaff, requireAuth } from '../lib/apiAuth';
import { parseLocalDate, isWithinBookingWindow } from '../lib/booking';
import { createSMSService, getBookingWindowDays, getRetentionDays } from './apiShared';
import { smsReservationConfirmed, smsReservationRejected, smsNewReservationForWorker } from '../lib/sms';

export function registerReservationRoutes(apiRoutes: Hono<{ Bindings: Env }>) {
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

      if (date && totalDuration && workerId) {
        // Admin users bypass the booking window restriction
        let isAdmin = false;
        if (c.req.query('admin') === 'true') {
          const auth = await requireAuth(c as any);
          console.log('[SLOTS] admin=true, auth result:', auth instanceof Response ? 'Response (auth failed)' : `role=${(auth as any).role}`);
          if (!(auth instanceof Response) && (auth.role === 'admin' || auth.role === 'superadmin')) {
            isAdmin = true;
          }
        }
        console.log('[SLOTS] isAdmin:', isAdmin, 'date:', date, 'workerId:', workerId, 'totalDuration:', totalDuration);
        if (!isAdmin) {
          const bookingWindow = await getBookingWindowDays(c.env.DB);
          const withinWindow = isWithinBookingWindow(date, bookingWindow);
          console.log('[SLOTS] bookingWindow:', bookingWindow, 'withinWindow:', withinWindow);
          if (!withinWindow) {
            return c.json({ slots: [] });
          }
        }

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
          const reservations = await db.getReservationsByDate(c.env.DB, date, parseInt(workerId));
          const lockedReservations = reservations.filter(r => r.status === 'locked');

          const slotStatuses: { time: string; status: 'available' | 'locked' | 'own-lock'; lockToken?: string }[] = slots.map(time => ({
            time,
            status: 'available',
          }));

          lockedReservations.forEach(r => {
            const isOwnLock = clientToken && r.lock_token === clientToken;
            if (!slots.includes(r.start_time)) {
              slotStatuses.push({
                time: r.start_time,
                status: isOwnLock ? 'own-lock' : 'locked',
                lockToken: isOwnLock ? r.lock_token! : undefined
              });
            } else if (isOwnLock) {
              const idx = slotStatuses.findIndex(s => s.time === r.start_time);
              if (idx >= 0) {
                slotStatuses[idx].status = 'own-lock';
                slotStatuses[idx].lockToken = r.lock_token!;
              }
            }
          });

          slotStatuses.sort((a, b) => a.time.localeCompare(b.time));

          return c.json({ slots: slotStatuses });
        }

        return c.json({ slots });
      }

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
        clientToken,
      } = body;

      if (honeypot) {
        return c.json({ message: 'Rezervace byla vytvořena' }, 201);
      }

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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return c.json({ error: 'Neplatný formát e-mailu' }, 400);
      }

      const phoneRegex = /^\+?\d[\d\s]{8,}$/;
      if (!phoneRegex.test(customerPhone)) {
        return c.json({ error: 'Neplatný formát telefonního čísla' }, 400);
      }

      let totalDuration = 0;
      for (const item of items) {
        const service = await db.getServiceById(c.env.DB, item.serviceId);
        if (!service) {
          return c.json({ error: `Služba ${item.serviceId} neexistuje` }, 404);
        }
        totalDuration += service.duration * item.quantity;
      }

      const normalizedClientToken = typeof clientToken === 'string' ? clientToken.trim() : '';
      const normalizedLockToken = typeof lockToken === 'string' ? lockToken.trim() : lockToken;

      if (typeof normalizedLockToken === 'string' && normalizedLockToken.length > 0) {
        await c.env.DB.prepare(`
        DELETE FROM reservations
        WHERE status = 'locked' AND lock_token = ?
      `).bind(normalizedLockToken).run();
      } else if (
        typeof normalizedLockToken === 'number' ||
        (typeof normalizedLockToken === 'string' && /^\d+$/.test(normalizedLockToken))
      ) {
        const lockReservationId = typeof normalizedLockToken === 'number'
          ? normalizedLockToken
          : parseInt(normalizedLockToken, 10);
        await c.env.DB.prepare(`
        DELETE FROM reservations
        WHERE id = ? AND status = 'locked' AND user_id = ? AND date = ? AND start_time = ?
      `).bind(lockReservationId, workerId, date, time).run();
      } else if (normalizedClientToken) {
        await c.env.DB.prepare(`
        DELETE FROM reservations
        WHERE status = 'locked' AND lock_token = ?
      `).bind(normalizedClientToken).run();
      }

      const availableSlots = await db.getAvailableSlots(c.env.DB, date, totalDuration, workerId);
      if (!availableSlots.includes(time)) {
        return c.json({ error: 'Vybraný termín již není k dispozici' }, 409);
      }

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

      const emailService = new EmailService(c.env);

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

      const cancelReason = reason || 'Bez udání důvodu';
      await db.updateReservation(c.env.DB, reservation.id, {
        status: 'cancelled',
        workflow_step: 'rejected',
        cancellation_reason: cancelReason,
      } as any);

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

  apiRoutes.post('/reservations/admin-create', async (c) => {
    try {
      const auth = await requireStaff(c as any);
      if (auth instanceof Response) return auth;

      const body = await c.req.json();
      const { workerId, date, time, customerName, customerEmail, customerPhone, note, items } = body;

      // Allow admin/superadmin or worker creating for themselves
      if (auth.role !== 'admin' && auth.role !== 'superadmin' && workerId !== auth.userId) {
        return c.json({ error: 'Nedostatečná oprávnění' }, 403);
      }

      if (!workerId || !date || !time || !customerName || !customerPhone) {
        return c.json({ error: 'Chybí povinné údaje (pracovník, datum, čas, jméno, telefon)' }, 400);
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return c.json({ error: 'Musíte vybrat alespoň jednu službu' }, 400);
      }

      if (customerEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
          return c.json({ error: 'Neplatný formát e-mailu' }, 400);
        }
      }

      let totalDuration = 0;
      for (const item of items) {
        const service = await db.getServiceById(c.env.DB, item.serviceId);
        if (!service) {
          return c.json({ error: `Služba ${item.serviceId} neexistuje` }, 404);
        }
        totalDuration += service.duration * (item.quantity || 1);
      }

      const availableSlots = await db.getAvailableSlots(c.env.DB, date, totalDuration, workerId);
      if (!availableSlots.includes(time)) {
        return c.json({ error: 'Vybraný termín není k dispozici' }, 409);
      }

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

      await db.updateReservation(c.env.DB, reservation.id, {
        status: 'confirmed',
        workflow_step: 'admin_created',
      } as any);

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

      const start = parse(startTime, 'HH:mm', parse(date, 'yyyy-MM-dd', new Date()));
      const end = parse(endTime, 'HH:mm', parse(date, 'yyyy-MM-dd', new Date()));
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      if (duration <= 0) {
        return c.json({ error: 'Neplatný časový úsek' }, 400);
      }

      if (auth.role !== 'admin' && auth.role !== 'superadmin' && workerId !== auth.userId) {
        return c.json({ error: 'Nedostatečná oprávnění' }, 403);
      }

      // Check for overlapping reservations
      await c.env.DB.prepare(`
        DELETE FROM reservations 
        WHERE status = 'locked' AND lock_expires_at < datetime('now')
      `).run();

      const existingReservations = await db.getReservationsByDate(c.env.DB, date, workerId);
      const activeConflicts = existingReservations.filter(r =>
        r.status !== 'cancelled' &&
        startTime < r.end_time && endTime > r.start_time
      );

      if (activeConflicts.length > 0) {
        const conflictTimes = activeConflicts.map(r => `${r.start_time}-${r.end_time} (${r.customer_name})`).join(', ');
        return c.json({ error: `V tomto čase již existuje rezervace: ${conflictTimes}` }, 409);
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
        endTime,
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

      const allowedFields = ['status', 'date', 'start_time', 'end_time', 'note', 'customer_name', 'customer_email', 'customer_phone'];
      const safeBody: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in body) safeBody[key] = body[key];
      }

      const existing = await db.getReservationById(c.env.DB, id);
      if (!existing) return c.json({ error: 'Rezervace nenalezena' }, 404);

      if (auth.role !== 'admin' && auth.role !== 'superadmin') {
        if (existing.user_id !== auth.userId) {
          return c.json({ error: 'Nedostatečná oprávnění' }, 403);
        }
      }

      // Check for time/date overlap when modifying schedule fields
      const newDate = (safeBody.date as string) || existing.date;
      const newStartTime = (safeBody.start_time as string) || existing.start_time;
      const newEndTime = (safeBody.end_time as string) || existing.end_time;
      const timeChanged = newDate !== existing.date || newStartTime !== existing.start_time || newEndTime !== existing.end_time;

      if (timeChanged && safeBody.status !== 'cancelled') {
        await c.env.DB.prepare(`
          DELETE FROM reservations 
          WHERE status = 'locked' AND lock_expires_at < datetime('now')
        `).run();

        const existingReservations = await db.getReservationsByDate(c.env.DB, newDate, existing.user_id);
        const activeConflicts = existingReservations.filter(r =>
          r.id !== id &&
          r.status !== 'cancelled' &&
          newStartTime < r.end_time && newEndTime > r.start_time
        );

        if (activeConflicts.length > 0) {
          const conflictTimes = activeConflicts.map(r => `${r.start_time}-${r.end_time}`).join(', ');
          return c.json({ error: `Nelze přesunout - překrývá se s: ${conflictTimes}` }, 409);
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

}
