import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

import type { Env } from './types';

// Import routes
import { apiRoutes } from './routes/api';
import { pageRoutes } from './routes/pages';

// ============ RATE LIMITER (Cache API) ============
async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const cache = (caches as any).default;
    const cacheKey = new Request(`https://rate-limit.internal/${key}`);
    const cached = await cache.match(cacheKey);
    
    let count = 0;
    if (cached) {
      count = parseInt(await cached.text(), 10) || 0;
    }
    
    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    count++;
    const response = new Response(String(count), {
      headers: { 'Cache-Control': `s-maxage=${windowSeconds}` }
    });
    await cache.put(cacheKey, response);
    
    return { allowed: true, remaining: maxRequests - count };
  } catch {
    // If cache fails, allow the request (fail open)
    return { allowed: true, remaining: maxRequests };
  }
}

function isLocalRequest(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// Create app with proper typing
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());

// AI agent API – povoleno z libovolné origin (bez cookies)
app.use('/api/agent/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Accept'],
}));

// Ostatní API – pouze povolené origins (se session cookies)
app.use('/api/*', cors({
  origin: (origin) => {
    // Allow same-origin requests and configured APP_URL
    if (!origin) return origin; // same-origin or server-to-server
    const allowed = [
      'https://studionatali-ricany.cz',
      'https://www.studionatali-ricany.cz',
      'https://studionatali-ricany.cz',
      'https://www.studionatali-ricany.cz',
      'http://localhost:8787',
      'http://127.0.0.1:8787',
    ];
    return allowed.includes(origin) ? origin : null;
  },
  credentials: true,
}));

// Rate limiting pro AI agent booking API
// POST /api/agent/book – bez IP rate limitu (ochrana je SMS OTP + limit čekajících rezervací na tel. číslo)

// POST /api/agent/verify – max 10 pokusů za 60 minut na IP (brute-force ochrana OTP)
app.use('/api/agent/verify', async (c, next) => {
  if (c.req.method === 'POST') {
    if (isLocalRequest(c.req.url)) {
      await next();
      return;
    }
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const { allowed, remaining } = await rateLimit(`agent-verify:${ip}`, 10, 3600);
    if (!allowed) {
      return c.json({ error: 'Příliš mnoho pokusů o ověření. Zkuste to za hodinu.' }, 429);
    }
    c.header('X-RateLimit-Remaining', String(remaining));
  }
  await next();
});

// Rate limiting on sensitive endpoints
app.use('/api/auth', async (c, next) => {
  if (c.req.method === 'POST') {
    if (isLocalRequest(c.req.url)) {
      await next();
      return;
    }
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const { allowed, remaining } = await rateLimit(`auth:${ip}`, 8, 600); // 8 per 10min
    if (!allowed) {
      return c.json({ error: 'Příliš mnoho pokusů o přihlášení. Zkuste to za pár minut.' }, 429);
    }
    c.header('X-RateLimit-Remaining', String(remaining));
  }
  await next();
});

app.use('/api/reservations', async (c, next) => {
  if (c.req.method === 'POST' && !c.req.path.includes('manage') && !c.req.path.includes('admin')) {
    if (isLocalRequest(c.req.url)) {
      await next();
      return;
    }
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const { allowed, remaining } = await rateLimit(`reservation:${ip}`, 10, 3600); // 10 per hour
    if (!allowed) {
      return c.json({ error: 'Příliš mnoho rezervací. Zkuste to později.' }, 429);
    }
    c.header('X-RateLimit-Remaining', String(remaining));
  }
  await next();
});

// Serve JS files with correct MIME type
app.get('/*.js', async (c, next) => {
  await next();
  if (c.res.status === 200) {
    c.res.headers.set('Content-Type', 'application/javascript; charset=utf-8');
  }
});

// Serve CSS files with correct MIME type  
app.get('/*.css', async (c, next) => {
  await next();
  if (c.res.status === 200) {
    c.res.headers.set('Content-Type', 'text/css; charset=utf-8');
  }
});

// API Routes
app.route('/api', apiRoutes);

// Page Routes (HTML with HTMX)
app.route('/', pageRoutes);

export default app;
