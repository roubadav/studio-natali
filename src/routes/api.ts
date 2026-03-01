import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../types';
import { signJWT, verifyJWT, verifyPassword } from '../lib/auth';
import * as db from '../lib/db';
import { EmailService } from '../lib/email';
import { registerReservationRoutes } from './apiReservations';
import { registerAdminRoutes } from './apiAdmin';
import { registerAgentRoutes } from './apiAgent';

export const apiRoutes = new Hono<{ Bindings: Env }>();

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
    return c.json({ user: userWithoutPassword, token });
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

registerReservationRoutes(apiRoutes);
registerAgentRoutes(apiRoutes);
registerAdminRoutes(apiRoutes);
