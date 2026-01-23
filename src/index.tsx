import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

import type { Env } from './types';

// Import routes
import { apiRoutes } from './routes/api';
import { pageRoutes } from './routes/pages';

// Create app with proper typing
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('/api/*', cors({
  origin: '*',
  credentials: true,
}));

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
