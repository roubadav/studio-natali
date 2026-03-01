import { getCookie } from 'hono/cookie';
import type { Env, JWTPayload } from '../types';
import { verifyJWT } from './auth';

type AuthContext = {
  env: Env;
  json: (body: unknown, status?: number) => Response;
};

export async function requireAuth(c: AuthContext): Promise<JWTPayload | Response> {
  let token = getCookie(c as any, 'auth_token');

  // Fallback: Authorization Bearer header (for mobile apps)
  if (!token) {
    const authHeader = (c as any).req?.header?.('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return (c as any).json({ error: 'Nepřihlášen' }, 401);

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return (c as any).json({ error: 'Neplatný token' }, 401);

  return payload;
}

export async function requireAdmin(c: AuthContext): Promise<JWTPayload | Response> {
  const payload = await requireAuth(c);
  if (payload instanceof Response) return payload;

  if (payload.role !== 'admin' && payload.role !== 'superadmin') {
    return (c as any).json({ error: 'Nedostatečná oprávnění' }, 403);
  }

  return payload;
}

export async function requireStaff(c: AuthContext): Promise<JWTPayload | Response> {
  const payload = await requireAuth(c);
  if (payload instanceof Response) return payload;

  return payload;
}