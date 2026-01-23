import { Hono } from 'hono';
import type { Env } from '../types';
import { SiteLayout, BaseLayout } from '../components/Layout';
import { 
  HeroSection, 
  AboutSection, 
  ServicesSection, 
  TeamSection, 
  GallerySection, 
  CTASection, 
  ContactSection 
} from '../components/Sections';
import { ReservationWizard } from '../components/ReservationWizard';
import { ReservationActionPage } from '../components/ReservationActions';
import { AdminLayout, AdminLoginPage, AdminDashboard } from '../components/Admin';
import { 
  AdminServicesPage, 
  AdminGalleryPage, 
  AdminUsersPage, 
  AdminWorkingHoursPage, 
  AdminSettingsPage, 
  AdminReservationsPage 
} from '../components/AdminPages';
import { TestRunnerPage } from '../components/TestRunner';
import * as db from '../lib/db';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '../lib/auth';
import { getTranslations } from '../lib/i18n';

export const pageRoutes = new Hono<{ Bindings: Env }>();

const t = getTranslations();

// ============ PUBLIC PAGES ============

// Homepage
pageRoutes.get('/', async (c) => {
  const workers = await db.getWorkers(c.env.DB);
  const images = await db.getAllGalleryImages(c.env.DB);
  const showGalleryLink = images.length > 0;
  
  return c.html(
    <SiteLayout showGalleryLink={showGalleryLink}>
      <HeroSection />
      <AboutSection />
      <TeamSection workers={workers} />
      <ServicesSection />
      <GallerySection images={images} />
      <CTASection />
      <ContactSection />
    </SiteLayout>
  );
});

// Reservation page
pageRoutes.get('/rezervace', async (c) => {
  const workers = await db.getWorkers(c.env.DB);
  const services = await db.getAllServices(c.env.DB);
  const categories = await db.getAllCategories(c.env.DB);
  const workerIdParam = c.req.query('workerId');
  const preselectedWorkerId = workerIdParam ? parseInt(workerIdParam, 10) : undefined;
  
  // Get settings for booking window
  const settingsArray = await db.getAllSettings(c.env.DB);
  const settings = settingsArray.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);
  
  const bookingWindow = parseInt(settings.booking_window || '30');
  
  return c.html(
    <ReservationWizard 
      workers={workers} 
      services={services} 
      categories={categories}
      bookingWindow={bookingWindow}
      preselectedWorkerId={Number.isNaN(preselectedWorkerId) ? undefined : preselectedWorkerId}
    />
  );
});

// E2E Test Runner
pageRoutes.get('/test', async (c) => {
  // Disable in production
  if (c.env.APP_URL && !c.env.APP_URL.includes('localhost') && !c.env.APP_URL.includes('127.0.0.1')) {
     return c.notFound();
  }
  return c.html(<TestRunnerPage />);
});

// Terms page
pageRoutes.get('/obchodni-podminky', async (c) => {
  const images = await db.getAllGalleryImages(c.env.DB);
  const showGalleryLink = images.length > 0;
  const settingsArray = await db.getAllSettings(c.env.DB);
  const settings = settingsArray.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);
  const contactName = settings.salon_name || t.terms.contact_name;
  const contactAddress = settings.address || t.terms.contact_address;
  const contactPhone = settings.phone || t.terms.contact_phone;
  const contactEmail = settings.notification_email || t.terms.contact_email;
  const addressLines = contactAddress.split('\n').map(line => line.trim()).filter(Boolean);
  return c.html(
    <SiteLayout title={t.terms.page_title} showGalleryLink={showGalleryLink}>
      <div class="section">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="section-title mb-6">{t.terms.title}</h1>
          <div class="legal-card">
            <div class="legal-content">
              {t.terms.sections.map(section => (
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              ))}
              <div class="mt-6">
                <h2>{t.contact.title}</h2>
                <p>
                  {contactName}<br />
                  {addressLines.map((line, idx) => (
                    <span key={`${line}-${idx}`}>
                      {line}
                      {idx < addressLines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                  {addressLines.length === 0 ? <>{contactAddress}<br /></> : null}
                  {contactPhone}<br />
                  {contactEmail}
                </p>
              </div>
            </div>
          </div>
          <div class="mt-8">
            <a href="/" class="btn btn-outline">← {t.common.back_home}</a>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
});

// Privacy page
pageRoutes.get('/zpracovani-udaju', async (c) => {
  const images = await db.getAllGalleryImages(c.env.DB);
  const showGalleryLink = images.length > 0;
  const settingsArray = await db.getAllSettings(c.env.DB);
  const settings = settingsArray.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);
  const contactEmail = settings.notification_email || t.terms.contact_email;
  const contactName = settings.salon_name || t.terms.contact_name;
  return c.html(
    <SiteLayout title={t.privacy.page_title} showGalleryLink={showGalleryLink}>
      <div class="section">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="section-title mb-6">{t.privacy.title}</h1>
          <div class="legal-card">
            <div class="legal-content">
              {t.privacy.sections
                .filter(section => !/kontakt|contact/i.test(section.title))
                .map(section => (
                  <div>
                    <h2>{section.title}</h2>
                    {Array.isArray(section.body) ? (
                      <ul>
                        {section.body.map(item => (
                          <li>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{section.body}</p>
                    )}
                  </div>
                ))}
              <div class="mt-6">
                <h2>{t.privacy.sections.find(section => /kontakt|contact/i.test(section.title))?.title || 'Kontakt'}</h2>
                <p>{contactName}</p>
                <p>{contactEmail}</p>
              </div>
            </div>
          </div>
          <div class="mt-8">
            <a href="/" class="btn btn-outline">← {t.common.back_home}</a>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
});

// ============ RESERVATION ACTIONS ============

pageRoutes.get('/admin/rezervace/schvalit/:token', async (c) => {
  const token = c.req.param('token');
  const reservation = await db.getReservationByToken(c.env.DB, token);
  
  if (!reservation) {
    return c.html(<BaseLayout><div class="p-8 text-center text-red-600">{t.reservation.not_found}</div></BaseLayout>);
  }
  
  return c.html(<ReservationActionPage reservation={reservation} token={token} action="approve" />);
});

pageRoutes.get('/admin/rezervace/odmitnout/:token', async (c) => {
  const token = c.req.param('token');
  const reservation = await db.getReservationByToken(c.env.DB, token);
  
  if (!reservation) {
    return c.html(<BaseLayout><div class="p-8 text-center text-red-600">{t.reservation.not_found}</div></BaseLayout>);
  }
  
  return c.html(<ReservationActionPage reservation={reservation} token={token} action="reject" />);
});

pageRoutes.get('/rezervace/zrusit/:token', async (c) => {
  const token = c.req.param('token');
  const reservation = await db.getReservationByToken(c.env.DB, token);
  
  if (!reservation) {
    return c.html(<BaseLayout><div class="p-8 text-center text-red-600">{t.reservation.not_found}</div></BaseLayout>);
  }
  
  return c.html(<ReservationActionPage reservation={reservation} token={token} action="cancel" />);
});

// ============ ADMIN PAGES ============

// Admin login
pageRoutes.get('/admin/login', async (c) => {
  // Check if already logged in
  const token = getCookie(c, 'auth_token');
  if (token) {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      return c.redirect('/admin/dashboard');
    }
  }
  
  return c.html(
    <BaseLayout title={t.admin.login_title}>
      <AdminLoginPage />
    </BaseLayout>
  );
});

// Admin middleware
const requireAuth = async (c: any, next: () => Promise<void>) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.redirect('/admin/login');
  }
  
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.redirect('/admin/login');
  }
  
  c.set('user', payload);
  await next();
};

// Admin dashboard
pageRoutes.get('/admin', requireAuth, async (c) => {
  return c.redirect('/admin/dashboard');
});

pageRoutes.get('/admin/dashboard', requireAuth, async (c) => {
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = await db.getReservationsByDate(c.env.DB, today);
  const pendingReservations = await db.getPendingReservations(c.env.DB);
  const recentReservations = await db.getLatestReservations(c.env.DB, 5);
  
  return c.html(
    <AdminLayout title={t.admin.dashboard_title}>
      <AdminDashboard 
        todayReservations={todayReservations}
        pendingReservations={pendingReservations}
        recentReservations={recentReservations}
      />
    </AdminLayout>
  );
});

// Admin reservations
pageRoutes.get('/admin/rezervace', requireAuth, async (c) => {
  const reservations = await db.getReservationsByDateRange(c.env.DB, '2025-01-01', '2026-12-31');
  const workers = await db.getWorkers(c.env.DB);
  
  return c.html(
    <AdminLayout title="Rezervace | Admin | Studio Natali">
      <AdminReservationsPage reservations={reservations} workers={workers} />
    </AdminLayout>
  );
});

// Admin services
pageRoutes.get('/admin/sluzby', requireAuth, async (c) => {
  const services = await db.getAllServices(c.env.DB);
  const categories = await db.getAllCategories(c.env.DB);
  const workers = await db.getWorkers(c.env.DB);
  
  return c.html(
    <AdminLayout title={t.admin.services_title}>
      <AdminServicesPage services={services} categories={categories} workers={workers} />
    </AdminLayout>
  );
});

// Admin gallery
pageRoutes.get('/admin/galerie', requireAuth, async (c) => {
  const images = await db.getAllGalleryImages(c.env.DB);
  
  return c.html(
    <AdminLayout title={t.admin.gallery_title}>
      <AdminGalleryPage images={images} />
    </AdminLayout>
  );
});

// Admin users
pageRoutes.get('/admin/uzivatele', requireAuth, async (c) => {
  const users = await db.getAllUsers(c.env.DB);
  
  return c.html(
    <AdminLayout title={t.admin.users_title}>
      <AdminUsersPage users={users} />
    </AdminLayout>
  );
});

// Admin working hours
pageRoutes.get('/admin/pracovni-doba', requireAuth, async (c) => {
  const hours = await db.getAllWorkingHours(c.env.DB);
  const workers = await db.getWorkers(c.env.DB);
  const user = c.get('user') as { userId: number; role: string };
  
  return c.html(
    <AdminLayout title={t.admin.hours_title}>
      <AdminWorkingHoursPage 
        hours={hours} 
        workers={workers as any} // Casting to bypass Omit check for now
        currentUser={user} 
      />
    </AdminLayout>
  );
});

// Admin settings
pageRoutes.get('/admin/nastaveni', requireAuth, async (c) => {
  const settingsArray = await db.getAllSettings(c.env.DB);
  // Convert array to object
  const settings = settingsArray.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);
  
  const user = c.get('user');
  const currentUser = await db.getUserById(c.env.DB, user.userId);
  
  return c.html(
    <AdminLayout title={t.admin.settings_title}>
      <AdminSettingsPage settings={settings} currentUser={currentUser} />
    </AdminLayout>
  );
});

// HTMX Partials
pageRoutes.get('/partials/slots', async (c) => {
  const date = c.req.query('date');
  const workerId = c.req.query('workerId');
  const duration = c.req.query('duration');
  
  if (!date || !workerId || !duration) {
    return c.html(<div class="text-red-500">{t.common.missing_params}</div>);
  }
  
  const slots = await db.getAvailableSlots(c.env.DB, date, parseInt(duration), parseInt(workerId));
  
  if (slots.length === 0) {
    return c.html(
      <div class="text-center py-8 text-neutral-500">
        {t.reservation.no_slots_for_day}
      </div>
    );
  }
  
  return c.html(
    <div class="grid grid-cols-4 gap-2">
      {slots.map(time => (
        <button
          type="button"
          class="time-slot"
          onclick={`selectTime('${time}')`}
          data-time={time}
        >
          {time}
        </button>
      ))}
    </div>
  );
});
