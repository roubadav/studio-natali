import type { Hono } from 'hono';
import type { Env } from '../types';
import * as db from '../lib/db';
import { verifyPassword, hashPassword } from '../lib/auth';
import { requireAuth, requireAdmin, requireStaff } from '../lib/apiAuth';
import { parseInteger, pickFields } from '../lib/apiUtils';
import { createSMSService } from './apiShared';

function parseIdOrResponse(c: any): number | Response {
  const parsedId = parseInteger(c.req.param('id'));
  if (parsedId === null) {
    return c.json({ error: 'Neplatné ID' }, 400);
  }
  return parsedId;
}

export function registerAdminRoutes(apiRoutes: Hono<{ Bindings: Env }>) {
  apiRoutes.get('/users', async (c) => {
    try {
      const auth = await requireAdmin(c as any);
      if (auth instanceof Response) return auth;

      const users = await db.getAllUsers(c.env.DB);
      return c.json({ users });
    } catch (error) {
      return c.json({ error: 'Chyba při načítání uživatelů' }, 500);
    }
  });

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

      const body = await c.req.json();
      const { image, alt } = body;

      if (!image) return c.json({ error: 'Chybí obrázek' }, 400);

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

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
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

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      await db.deleteGalleryImage(c.env.DB, id);

      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Chyba při mazání obrázku' }, 500);
    }
  });

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

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      const body = await c.req.json();

      const allowedFields = ['name', 'description', 'category_id', 'user_id', 'price', 'price_type', 'duration', 'is_active'];
      const safeBody = pickFields(body as Record<string, unknown>, allowedFields);

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

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      const deleted = await db.deleteService(c.env.DB, id);

      if (!deleted) return c.json({ error: 'Služba nenalezena' }, 404);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Chyba při mazání služby' }, 500);
    }
  });

  apiRoutes.post('/services/categories', async (c) => {
    try {
      const auth = await requireStaff(c as any);
      if (auth instanceof Response) return auth;

      const body = await c.req.json();
      const data: any = { name: body.name, icon: body.icon };
      if (body.sort_order !== undefined) data.sort_order = body.sort_order;
      if (body.image) data.image = body.image;
      const category = await db.createCategory(c.env.DB, data);
      return c.json(category, 201);
    } catch (error) {
      return c.json({ error: 'Chyba při vytváření kategorie' }, 500);
    }
  });

  apiRoutes.put('/services/categories/:id', async (c) => {
    try {
      const auth = await requireStaff(c as any);
      if (auth instanceof Response) return auth;

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      const body = await c.req.json();
      const data: any = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.icon !== undefined) data.icon = body.icon;
      if (body.sort_order !== undefined) data.sort_order = body.sort_order;
      if (body.image !== undefined) data.image = body.image;
      const category = await db.updateCategory(c.env.DB, id, data);

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

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      const deleted = await db.deleteCategory(c.env.DB, id);

      if (!deleted) return c.json({ error: 'Kategorie nenalezena' }, 404);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Chyba při mazání kategorie' }, 500);
    }
  });

  apiRoutes.post('/users', async (c) => {
    try {
      const auth = await requireAdmin(c as any);
      if (auth instanceof Response) return auth;

      const body = await c.req.json();
      const { password, ...userData } = body;
      const role = userData.role || 'user';

      // External users don't need a password (they can't log in)
      let passwordHash: string;
      if (role === 'external') {
        // Use a random unusable hash — external users never authenticate
        passwordHash = '!external_' + crypto.randomUUID();
      } else {
        if (!password) {
          return c.json({ error: 'Chybí heslo' }, 400);
        }
        passwordHash = await hashPassword(password);
      }

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
      const auth = await requireAdmin(c as any);
      if (auth instanceof Response) return auth;

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      const body = await c.req.json();
      const { password, ...rawUpdates } = body;

      const allowedFields = ['email', 'name', 'slug', 'role', 'bio', 'phone', 'image', 'color', 'notification_email', 'notification_phone', 'is_active'];
      const updates = pickFields(rawUpdates as Record<string, unknown>, allowedFields);

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
      const auth = await requireAdmin(c as any);
      if (auth instanceof Response) return auth;

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      const deleted = await db.deleteUser(c.env.DB, id);

      if (!deleted) return c.json({ error: 'Uživatel nenalezen' }, 404);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Chyba při mazání uživatele' }, 500);
    }
  });

  apiRoutes.patch('/users/profile', async (c) => {
    try {
      const auth = await requireAuth(c as any);
      if (auth instanceof Response) return auth;

      const body = await c.req.json();
      const { currentPassword, newPassword, ...updates } = body;

      if (currentPassword && newPassword) {
        const user = await db.getUserById(c.env.DB, auth.userId);
        if (!user) return c.json({ error: 'Uživatel nenalezen' }, 404);

        const isValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isValid) return c.json({ error: 'Nesprávné současné heslo' }, 400);

        const passwordHash = await hashPassword(newPassword);
        await db.updateUserPassword(c.env.DB, auth.userId, passwordHash);
      }

      const user = await db.updateUser(c.env.DB, auth.userId, updates);
      return c.json(user);
    } catch (error) {
      return c.json({ error: 'Chyba při aktualizaci profilu' }, 500);
    }
  });

  apiRoutes.get('/working-hours/overrides', async (c) => {
    try {
      const auth = await requireStaff(c as any);
      if (auth instanceof Response) return auth;

      const workerId = c.req.query('workerId');
      if (!workerId) return c.json({ error: 'Chybí ID pracovníka' }, 400);

      const parsedWorkerId = parseInteger(workerId);
      if (parsedWorkerId === null) return c.json({ error: 'Neplatné ID pracovníka' }, 400);

      if (auth.role !== 'admin' && auth.role !== 'superadmin' && parsedWorkerId !== auth.userId) {
        return c.json({ error: 'Nedostatečná oprávnění' }, 403);
      }

      const overrides = await db.getWorkingOverrides(c.env.DB, parsedWorkerId);
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

      const id = parseIdOrResponse(c);
      if (id instanceof Response) return id;
      await db.deleteWorkingOverride(c.env.DB, id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Chyba při mazání výjimky' }, 500);
    }
  });

  apiRoutes.get('/working-hours', async (c) => {
    try {
      const auth = await requireStaff(c as any);
      if (auth instanceof Response) return auth;

      const workerId = c.req.query('workerId');
      const parsedWorkerId = workerId ? parseInteger(workerId) : null;

      if (auth.role !== 'admin' && auth.role !== 'superadmin') {
        const allHours = await db.getAllWorkingHours(c.env.DB);
        const filtered = allHours.filter(h => h.user_id === auth.userId);
        return c.json({ hours: filtered });
      }

      const allHours = await db.getAllWorkingHours(c.env.DB);
      const hours = parsedWorkerId
        ? allHours.filter(h => h.user_id === parsedWorkerId)
        : allHours;
      return c.json({ hours });
    } catch (error) {
      return c.json({ error: 'Chyba při načítání pracovní doby' }, 500);
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
}