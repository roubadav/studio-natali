import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { SiteLayout, BaseLayout } from '../components/Layout';
import { 
  HeroSection, 
  AboutSection, 
  ServicesSection, 
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
import { mapSettings } from '../lib/settings';

export const pageRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

const t = getTranslations();

// ============ PUBLIC PAGES ============

// Homepage
pageRoutes.get('/', async (c) => {
  const images = await db.getAllGalleryImages(c.env.DB);
  const categories = await db.getAllCategories(c.env.DB);
  const services = await db.getAllServices(c.env.DB);
  const showGalleryLink = images.length > 0;

  // Filter: only categories that have at least one active service
  const activeCategories = categories.filter(cat =>
    services.some(s => s.category_id === cat.id)
  );

  // Rozšířená strukturovaná data pro AEO/GEO – doporučování AI agenty
  const richStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://studionatali-ricany.cz/#website",
        "url": "https://studionatali-ricany.cz",
        "name": "Studio Natali",
        "description": "Kadeřnice ve Studio Natali v Říčanech u Prahy",
        "publisher": { "@id": "https://studionatali-ricany.cz/#business" },
        "inLanguage": "cs-CZ"
      },
      {
        "@type": "WebPage",
        "@id": "https://studionatali-ricany.cz/#webpage",
        "url": "https://studionatali-ricany.cz",
        "name": "Vilma Strakatá – kadeřnice Říčany",
        "isPartOf": { "@id": "https://studionatali-ricany.cz/#website" },
        "about": { "@id": "https://studionatali-ricany.cz/#business" },
        "description": "Kadeřnice Vilma Strakatá v Říčanech u Prahy. Dámské, pánské a dětské služby. Objednávky online.",
        "inLanguage": "cs-CZ"
      },
      {
        "@type": "HairSalon",
        "@id": "https://studionatali-ricany.cz/#business",
        "name": "Studio Natali",
        "alternateName": "Kadeřnice Vilma Strakatá – Studio Natali Říčany",
        "description": "Kadeřnice Vilma Strakatá v Říčanech. Přirozené střihy, barvení a melír v klidném prostředí s individuálním přístupem.",
        "url": "https://studionatali-ricany.cz",
        "telephone": "+420728814712",
        "email": "vilmastrakata@gmail.com",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+420-728-814-712",
          "contactType": "reservations",
          "areaServed": "CZ",
          "availableLanguage": ["Czech"]
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Černokostelecká 80/42",
          "addressLocality": "Říčany",
          "postalCode": "251 01",
          "addressRegion": "Středočeský kraj",
          "addressCountry": "CZ"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 49.99148,
          "longitude": 14.65752
        },
        "hasMap": "https://maps.google.com/?cid=studio+natali+ricany",
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "09:00",
            "closes": "17:00"
          }
        ],
        "image": [
          "https://studionatali-ricany.cz/images/hero.png",
          "https://studionatali-ricany.cz/images/team/vilma.jpg",
          "https://studionatali-ricany.cz/logo.svg"
        ],
        "logo": "https://studionatali-ricany.cz/logo.svg",
        "priceRange": "220 Kč – 2 400 Kč",
        "currenciesAccepted": "CZK",
        "paymentAccepted": "Hotovost, Platební karta",
        "sameAs": [
          "https://www.facebook.com/StudioNatali",
          "https://instagram.com/studionatali"
        ],
        "areaServed": [
          { "@type": "City", "name": "Říčany" },
          { "@type": "City", "name": "Praha-východ" },
          { "@type": "City", "name": "Praha" }
        ],
        "employee": [{ "@id": "https://studionatali-ricany.cz/#vilma-strakata" }],
        "founder": { "@id": "https://studionatali-ricany.cz/#vilma-strakata" },
        "potentialAction": {
          "@type": "ReserveAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://studionatali-ricany.cz/rezervace",
            "actionPlatform": [
              "http://schema.org/DesktopWebPlatform",
              "http://schema.org/MobileWebPlatform"
            ]
          },
          "result": {
            "@type": "Reservation",
            "name": "Rezervace termínu u kadeřnice"
          }
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Kadeřnické služby",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Styling, regenerace, mytí a foukaná" },
              "priceSpecification": { "@type": "PriceSpecification", "minPrice": "350", "maxPrice": "400", "priceCurrency": "CZK" }
            },
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Střih" },
              "priceSpecification": { "@type": "PriceSpecification", "minPrice": "560", "maxPrice": "700", "priceCurrency": "CZK" }
            },
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Barva" },
              "priceSpecification": { "@type": "PriceSpecification", "minPrice": "1200", "maxPrice": "1800", "priceCurrency": "CZK" }
            },
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Melír" },
              "priceSpecification": { "@type": "PriceSpecification", "minPrice": "1300", "maxPrice": "2400", "priceCurrency": "CZK" }
            },
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Pánský střih" },
              "priceSpecification": { "@type": "PriceSpecification", "minPrice": "290", "maxPrice": "350", "priceCurrency": "CZK" }
            },
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Pánský střih + styling" },
              "priceSpecification": { "@type": "PriceSpecification", "minPrice": "390", "maxPrice": "530", "priceCurrency": "CZK" }
            },
            {
              "@type": "Offer",
              "itemOffered": { "@type": "Service", "name": "Střih strojkem" },
              "price": "220",
              "priceCurrency": "CZK"
            }
          ]
        },
        "makesOffer": {
          "@type": "Offer",
          "name": "Online rezervace termínu",
          "url": "https://studionatali-ricany.cz/rezervace",
          "description": "Rezervujte termín online – výběr kadeřnice, služby, data a času. Potvrzení e-mailem."
        }
      },
      {
        "@type": "Person",
        "@id": "https://studionatali-ricany.cz/#vilma-strakata",
        "name": "Vilma Strakatá",
        "jobTitle": "Kadeřnice",
        "worksFor": { "@id": "https://studionatali-ricany.cz/#business" },
        "image": "https://studionatali-ricany.cz/images/team/vilma.jpg",
        "telephone": "+420728814712",
        "email": "vilmastrakata@gmail.com",
        "knowsAbout": ["Střih", "Styling", "Regenerace vlasů", "Barvení vlasů", "Melír"]
      },
      {
        "@type": "FAQPage",
        "@id": "https://studionatali-ricany.cz/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Jak si rezervovat termín v Studio Natali?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Termín lze rezervovat online na studionatali-ricany.cz/rezervace nebo telefonicky na +420 728 814 712."
            }
          },
          {
            "@type": "Question",
            "name": "Kde se Studio Natali nachází?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Studio Natali sídlí na adrese Černokostelecká 80/42, 251 01 Říčany u Prahy – přibližně 10 minut pěšky od vlakového nádraží Říčany (vlak z Prahy cca 30 minut)."
            }
          },
          {
            "@type": "Question",
            "name": "Jaká je pracovní doba kadeřnice?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Vilma Strakatá přijímá zákazníky pondělí až pátek 9:00–17:00 (přestávka 12:00–12:30). O víkendu je salon zavřený."
            }
          },
          {
            "@type": "Question",
            "name": "Kolik stojí dámský střih v Říčanech v Studio Natali?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Střih, mytí, regenerace, styling a foukaná stojí podle náročnosti 560–700 Kč. Samotné mytí, regenerace, styling a foukaná stojí 350–400 Kč."
            }
          },
          {
            "@type": "Question",
            "name": "Kolik stojí barvení vlasů?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Barva včetně mytí, regenerace, střihu, stylingu a foukané stojí 1200–1800 Kč. Melír včetně kompletní péče stojí 1300–2400 Kč."
            }
          },
          {
            "@type": "Question",
            "name": "Mohu rezervaci zrušit?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ano, rezervaci lze zrušit nejpozději 24 hodin před termínem pomocí odkazu v potvrzovacím e-mailu nebo telefonicky."
            }
          },
          {
            "@type": "Question",
            "name": "Přijímá salon platbu kartou?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Salon přijímá hotovost i platební kartu."
            }
          }
        ]
      }
    ]
  };

  return c.html(
    <SiteLayout showGalleryLink={showGalleryLink} canonical="https://studionatali-ricany.cz/" description={t.common.site_description} structuredData={richStructuredData}>
      <HeroSection />
      <AboutSection />
      <ServicesSection categories={activeCategories} services={services} />
      <GallerySection images={images} />
      <CTASection />
      <ContactSection />
    </SiteLayout>
  );
});

// Reservation page
pageRoutes.get('/rezervace', async (c) => {
  const allWorkers = await db.getWorkers(c.env.DB);
  const workers = allWorkers.filter(w => w.role !== 'superadmin' && w.slug !== 'natalie');
  const services = await db.getAllServices(c.env.DB);
  const categories = await db.getAllCategories(c.env.DB);
  const workerIdParam = c.req.query('workerId');
  const preselectedWorkerId = workerIdParam ? parseInt(workerIdParam, 10) : undefined;
  
  // Get settings for booking window
  const settingsArray = await db.getAllSettings(c.env.DB);
  const settings = mapSettings(settingsArray);
  
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
  const settings = mapSettings(settingsArray);
  const contactName = settings.salon_name || t.terms.contact_name;
  const contactAddress = settings.address || t.terms.contact_address;
  const contactPhone = settings.phone || t.terms.contact_phone;
  const contactEmail = settings.contact_email || t.terms.contact_email;
  const addressLines = contactAddress.split('\n').map(line => line.trim()).filter(Boolean);
  return c.html(
    <SiteLayout title={t.terms.page_title} showGalleryLink={showGalleryLink} canonical="https://studionatali-ricany.cz/obchodni-podminky" noindex={true}>
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
                <div class="space-y-1">
                  <p class="font-semibold">{contactName}</p>
                  {addressLines.map((line, idx) => (
                    <p key={`${line}-${idx}`}>{line}</p>
                  ))}
                  {addressLines.length === 0 ? <p>{contactAddress}</p> : null}
                  <p>{contactPhone}</p>
                  <p>{contactEmail}</p>
                </div>
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
  const settings = mapSettings(settingsArray);
  const contactEmail = settings.contact_email || t.terms.contact_email;
  const contactName = settings.salon_name || t.terms.contact_name;
  const contactPhone = settings.phone || t.terms.contact_phone;
  const contactAddress = settings.address || t.terms.contact_address;
  return c.html(
    <SiteLayout title={t.privacy.page_title} showGalleryLink={showGalleryLink} canonical="https://studionatali-ricany.cz/zpracovani-udaju" noindex={true}>
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
                <div class="space-y-1">
                  <p class="font-semibold">{contactName}</p>
                  <p>{contactAddress}</p>
                  <p>{contactPhone}</p>
                  <p>{contactEmail}</p>
                </div>
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
    return c.html(<BaseLayout noindex={true}><div class="p-8 text-center text-red-600">{t.reservation.not_found}</div></BaseLayout>);
  }
  
  return c.html(<ReservationActionPage reservation={reservation} token={token} action="approve" />);
});

pageRoutes.get('/admin/rezervace/odmitnout/:token', async (c) => {
  const token = c.req.param('token');
  const reservation = await db.getReservationByToken(c.env.DB, token);
  
  if (!reservation) {
    return c.html(<BaseLayout noindex={true}><div class="p-8 text-center text-red-600">{t.reservation.not_found}</div></BaseLayout>);
  }
  
  return c.html(<ReservationActionPage reservation={reservation} token={token} action="reject" />);
});

pageRoutes.get('/rezervace/zrusit/:token', async (c) => {
  const token = c.req.param('token');
  const reservation = await db.getReservationByToken(c.env.DB, token);
  
  if (!reservation) {
    return c.html(<BaseLayout noindex={true}><div class="p-8 text-center text-red-600">{t.reservation.not_found}</div></BaseLayout>);
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
    <BaseLayout title={t.admin.login_title} noindex={true}>
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
  const user = c.get('user') as { userId: number; role: string };
  
  return c.html(
    <AdminLayout title={t.admin.dashboard_title} userRole={user.role}>
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
  const allWorkers = await db.getWorkers(c.env.DB);
  const workers = allWorkers.filter(w => w.role !== 'external');
  const user = c.get('user') as { userId: number; role: string };
  
  return c.html(
    <AdminLayout title="Rezervace | Admin | Studio Natali" userRole={user.role}>
      <AdminReservationsPage reservations={reservations} workers={workers} />
    </AdminLayout>
  );
});

// Admin services
pageRoutes.get('/admin/sluzby', requireAuth, async (c) => {
  const services = await db.getAllServices(c.env.DB);
  const categories = await db.getAllCategories(c.env.DB);
  const workers = await db.getWorkers(c.env.DB);
  const user = c.get('user') as { userId: number; role: string };
  
  return c.html(
    <AdminLayout title={t.admin.services_title} userRole={user.role}>
      <AdminServicesPage services={services} categories={categories} workers={workers} />
    </AdminLayout>
  );
});

// Admin gallery
pageRoutes.get('/admin/galerie', requireAuth, async (c) => {
  const images = await db.getAllGalleryImages(c.env.DB);
  const user = c.get('user') as { userId: number; role: string };
  
  return c.html(
    <AdminLayout title={t.admin.gallery_title} userRole={user.role}>
      <AdminGalleryPage images={images} />
    </AdminLayout>
  );
});

// Admin users (admin only)
pageRoutes.get('/admin/uzivatele', requireAuth, async (c) => {
  const user = c.get('user') as { userId: number; role: string };
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return c.redirect('/admin/dashboard');
  }
  const users = await db.getAllUsers(c.env.DB);
  
  return c.html(
    <AdminLayout title={t.admin.users_title} userRole={user.role}>
      <AdminUsersPage users={users} />
    </AdminLayout>
  );
});

// Admin working hours
pageRoutes.get('/admin/pracovni-doba', requireAuth, async (c) => {
  const hours = await db.getAllWorkingHours(c.env.DB);
  const allWorkers = await db.getWorkers(c.env.DB);
  // External users don't have working hours
  const workers = allWorkers.filter(w => w.role !== 'external');
  const user = c.get('user') as { userId: number; role: string };
  
  return c.html(
    <AdminLayout title={t.admin.hours_title} userRole={user.role}>
      <AdminWorkingHoursPage 
        hours={hours} 
        workers={workers}
        currentUser={user} 
      />
    </AdminLayout>
  );
});

// Admin settings
pageRoutes.get('/admin/nastaveni', requireAuth, async (c) => {
  const settingsArray = await db.getAllSettings(c.env.DB);
  const settings = mapSettings(settingsArray);
  
  const user = c.get('user');
  const currentUser = await db.getUserById(c.env.DB, user.userId);
  if (!currentUser) {
    return c.redirect('/admin/login');
  }
  
  return c.html(
    <AdminLayout title={t.admin.settings_title} userRole={user.role}>
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
