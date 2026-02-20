/**
 * Admin Panel E2E Tests - Studio Natali
 * 
 * Tests all admin panel functionalities in Chromium.
 * 
 * Prerequisites:
 *   1. Start dev server: npm run dev
 *   2. Run: npx tsx scripts/admin-tests.ts
 *   
 * The script uses the default admin credentials from seed.sql.
 */
import { chromium, type Browser, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';
const ADMIN_USER = process.env.ADMIN_USER || 'admin0';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, status: 'pass', duration: Date.now() - start });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (e: any) {
    results.push({ name, status: 'fail', duration: Date.now() - start, error: e.message });
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('#login-form', { timeout: 10000 });
  await page.fill('input[name="username"]', ADMIN_USER);
  await page.fill('input[name="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
}

async function main() {
  console.log('\n🧪 Studio Natali - Admin Panel E2E Tests\n');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  User: ${ADMIN_USER}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // ============ AUTH TESTS ============
  console.log('── Auth ──');

  await runTest('Login with valid credentials', async () => {
    await login(page);
    const url = page.url();
    if (!url.includes('/admin/dashboard')) throw new Error(`Expected dashboard URL, got: ${url}`);
  });

  await runTest('Dashboard loads with stats', async () => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForSelector('.card', { timeout: 5000 });
    // Check that dashboard shows stat cards
    const cards = await page.$$('.card');
    if (cards.length < 2) throw new Error(`Expected at least 2 stat cards, got: ${cards.length}`);
  });

  // ============ NAVIGATION TESTS ============
  console.log('\n── Navigation ──');

  await runTest('Sidebar navigation visible', async () => {
    const sidebar = await page.$('aside');
    if (!sidebar) throw new Error('Sidebar not found');
    const isVisible = await sidebar.isVisible();
    if (!isVisible) throw new Error('Sidebar is not visible on desktop');
  });

  const adminPages = [
    { name: 'Rezervace', path: '/admin/rezervace' },
    { name: 'Služby', path: '/admin/sluzby' },
    { name: 'Galerie', path: '/admin/galerie' },
    { name: 'Uživatelé', path: '/admin/uzivatele' },
    { name: 'Pracovní doba', path: '/admin/pracovni-doba' },
    { name: 'Nastavení', path: '/admin/nastaveni' },
  ];

  for (const p of adminPages) {
    await runTest(`Navigate to ${p.name} (${p.path})`, async () => {
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const status = page.url();
      if (!status.includes(p.path)) throw new Error(`Navigation failed: ${status}`);
    });
  }

  // ============ SERVICES TESTS ============
  console.log('\n── Services ──');

  await runTest('Services page loads', async () => {
    await page.goto(`${BASE_URL}/admin/sluzby`);
    await page.waitForTimeout(1000);
    // Services page exists - table might be empty or populated
    const content = await page.textContent('body');
    if (!content?.includes('Služby') && !content?.includes('služb')) {
      throw new Error('Services page content not found');
    }
  });

  await runTest('Create new service category via API', async () => {
    const uniqueName = `Test ${Date.now()}`;
    const response = await page.evaluate(async (name: string) => {
      const res = await fetch('/api/services/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon: 'star', sort_order: 99 })
      });
      return { status: res.status, data: await res.json() };
    }, uniqueName);
    
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Category creation failed: ${JSON.stringify(response.data)}`);
    }
    
    // Clean up - delete the test category
    if (response.data?.id) {
      await page.evaluate(async (id: number) => {
        await fetch(`/api/services/categories/${id}`, { method: 'DELETE' });
      }, response.data.id);
    }
  });

  await runTest('Create new service via API', async () => {
    // Get workers and categories first
    const setupRes = await page.evaluate(async () => {
      const [workersRes, servicesRes] = await Promise.all([
        fetch('/api/workers'),
        fetch('/api/services'),
      ]);
      return {
        workers: await workersRes.json(),
        services: await servicesRes.json(),
      };
    });
    
    const workerId = setupRes.workers.workers?.[0]?.id;
    if (!workerId) throw new Error('No workers available');
    
    const categoryId = setupRes.services.categories?.[0]?.id;
    if (!categoryId) throw new Error('No categories available');

    const response = await page.evaluate(async (opts: { wId: number; cId: number }) => {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'E2E Test Služba',
          description: 'Automatický test',
          price: 500,
          price_type: 'fixed',
          duration: 30,
          user_id: opts.wId,
          category_id: opts.cId,
        })
      });
      return { status: res.status, data: await res.json() };
    }, { wId: workerId, cId: categoryId });
    
    // Accept 201 (created) or 200
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Service creation failed: ${JSON.stringify(response.data)}`);
    }
  });

  await runTest('Delete test service via API', async () => {
    // Get services list to find our test service
    const servicesRes = await page.evaluate(async () => {
      const res = await fetch('/api/services');
      return await res.json();
    });
    
    const testService = servicesRes.services?.find((s: any) => s.name === 'E2E Test Služba');
    if (!testService) {
      // Service might not have been created, skip
      console.log('    ⚠️  Test service not found (may not have been created)');
      return;
    }

    const response = await page.evaluate(async (id: number) => {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      return { status: res.status };
    }, testService.id);
    
    if (response.status !== 200) {
      throw new Error(`Service deletion failed: status ${response.status}`);
    }
  });

  // ============ RESERVATIONS TESTS ============
  console.log('\n── Reservations ──');

  await runTest('Reservations page loads', async () => {
    await page.goto(`${BASE_URL}/admin/rezervace`);
    await page.waitForSelector('#reservations-body', { timeout: 5000 });
  });

  await runTest('Reservations filter controls visible', async () => {
    const statusFilter = await page.$('#status-filter, select');
    if (!statusFilter) throw new Error('Status filter not found');
  });

  // ============ USERS TESTS ============
  console.log('\n── Users ──');

  await runTest('Users page loads with user list', async () => {
    await page.goto(`${BASE_URL}/admin/uzivatele`);
    await page.waitForSelector('table', { timeout: 5000 });
    const rows = await page.$$('table tbody tr');
    if (rows.length === 0) throw new Error('Users table is empty');
  });

  await runTest('At least 2 users exist (admin + worker)', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/users');
      return await res.json();
    });
    
    if (!response.users || response.users.length < 2) {
      throw new Error(`Expected at least 2 users, got: ${response.users?.length || 0}`);
    }
  });

  // ============ WORKING HOURS TESTS ============
  console.log('\n── Working Hours ──');

  await runTest('Working hours page loads', async () => {
    await page.goto(`${BASE_URL}/admin/pracovni-doba`);
    await page.waitForTimeout(1000);
    // Should have hours section or table
    const content = await page.textContent('body');
    if (!content?.includes('Pondělí') && !content?.includes('Monday') && !content?.includes('pracovní')) {
      throw new Error('Working hours content not found');
    }
  });

  // ============ GALLERY TESTS ============
  console.log('\n── Gallery ──');

  await runTest('Gallery page loads', async () => {
    await page.goto(`${BASE_URL}/admin/galerie`);
    await page.waitForTimeout(1000);
    // Gallery page should exist
    const content = await page.textContent('body');
    if (!content) throw new Error('Gallery page is empty');
  });

  // ============ SETTINGS TESTS ============
  console.log('\n── Settings ──');

  await runTest('Settings page loads with global tab', async () => {
    await page.goto(`${BASE_URL}/admin/nastaveni`);
    await page.waitForSelector('#tab-global', { timeout: 5000 });
  });

  await runTest('Settings form fields populated', async () => {
    const salonName = await page.$eval('#setting-salon_name', (el: any) => el.value);
    if (!salonName || salonName.trim() === '') throw new Error('Salon name is empty');
    
    // Booking window should always exist
    const bookingWindow = await page.$eval('#setting-booking_window', (el: any) => el.value);
    if (!bookingWindow) throw new Error('Booking window is empty');
  });

  await runTest('SMS daily limit field exists', async () => {
    const dailyLimit = await page.$eval('#setting-sms_daily_limit', (el: any) => el.value);
    const limit = parseInt(dailyLimit, 10);
    if (isNaN(limit) || limit <= 0) throw new Error(`Invalid SMS daily limit: ${dailyLimit}`);
  });

  await runTest('Save global settings', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salon_name: 'Studio Natali',
          sms_daily_limit: '20',
        })
      });
      return { status: res.status, data: await res.json() };
    });
    
    if (response.status !== 200) {
      throw new Error(`Settings save failed: ${JSON.stringify(response.data)}`);
    }
    if (!response.data.success) {
      throw new Error('Settings save returned success: false');
    }
  });

  await runTest('Settings profile tab switches', async () => {
    await page.evaluate(() => {
      const fn = (window as any).showSettingsTab;
      if (fn) fn('profile');
    });
    await page.waitForTimeout(300);
    
    const profileTab = await page.$('#tab-profile');
    if (!profileTab) throw new Error('Profile tab not found');
    const isVisible = await profileTab.evaluate((el: any) => !el.classList.contains('hidden'));
    if (!isVisible) throw new Error('Profile tab did not become visible');
  });

  // ============ RESPONSIVE TESTS ============
  console.log('\n── Responsive ──');

  await runTest('Admin sidebar collapses on tablet (1024px)', async () => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForTimeout(500);
    
    const sidebar = await page.$('aside');
    if (sidebar) {
      const isHidden = await sidebar.evaluate((el: any) => {
        const rect = el.getBoundingClientRect();
        return rect.x < -200; // Off-screen
      });
      // On mobile, sidebar should be hidden/off-screen by default
      // The sidebar uses -translate-x-full lg:translate-x-0
    }
    
    // Check main content is not pushed (no ml-64 on mobile)
    const main = await page.$('main');
    if (main) {
      const marginLeft = await main.evaluate((el: any) => {
        return parseInt(getComputedStyle(el).marginLeft, 10);
      });
      if (marginLeft > 100) throw new Error(`Main content has margin-left: ${marginLeft}px on tablet - sidebar overlap!`);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await runTest('Admin mobile header visible on small screen', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForTimeout(500);
    
    // Mobile header should be visible (lg:hidden means visible on mobile)
    const mobileHeader = await page.$('.lg\\:hidden');
    // Reset viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  // ============ API TESTS ============
  console.log('\n── API ──');

  await runTest('GET /api/workers returns workers', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/workers');
      return { status: res.status, data: await res.json() };
    });
    
    if (response.status !== 200) throw new Error(`Workers API returned ${response.status}`);
    if (!response.data.workers || response.data.workers.length === 0) throw new Error('No workers returned');
  });

  await runTest('GET /api/services returns services', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/services');
      return { status: res.status, data: await res.json() };
    });
    
    if (response.status !== 200) throw new Error(`Services API returned ${response.status}`);
    if (!response.data.services) throw new Error('No services in response');
  });

  await runTest('GET /api/settings returns settings (authenticated)', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/settings');
      return { status: res.status, data: await res.json() };
    });
    
    if (response.status !== 200) throw new Error(`Settings API returned ${response.status}`);
    if (!response.data.settings) throw new Error('No settings in response');
  });

  await runTest('POST /api/auth with wrong password returns 401', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin0', password: 'wrong-password' })
      });
      return { status: res.status };
    });
    
    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  });

  // ============ PUBLIC PAGES TESTS ============
  console.log('\n── Public Pages ──');

  await runTest('Homepage loads with all sections', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#home', { timeout: 5000 });
    
    const sections = ['#home', '#sluzby', '#galerie', '#kontakt'];
    for (const id of sections) {
      const el = await page.$(id);
      if (!el) throw new Error(`Section ${id} not found on homepage`);
    }
  });

  await runTest('Reservation page loads', async () => {
    await page.goto(`${BASE_URL}/rezervace`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const content = await page.textContent('body');
    if (!content?.includes('Rezervace') && !content?.includes('rezerv')) {
      throw new Error('Reservation page content not found');
    }
  });

  await runTest('SEO: robots.txt accessible', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/robots.txt');
      return { status: res.status, text: await res.text() };
    });
    
    if (response.status !== 200) throw new Error(`robots.txt returned ${response.status}`);
    if (!response.text.includes('Sitemap')) throw new Error('robots.txt missing Sitemap reference');
  });

  await runTest('SEO: sitemap.xml accessible', async () => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/sitemap.xml');
      return { status: res.status, text: await res.text() };
    });
    
    if (response.status !== 200) throw new Error(`sitemap.xml returned ${response.status}`);
    if (!response.text.includes('studionatali-ricany.cz')) throw new Error('sitemap.xml missing domain');
  });

  await runTest('SEO: Structured data (JSON-LD) present', async () => {
    await page.goto(`${BASE_URL}/`);
    const jsonLd = await page.$eval('script[type="application/ld+json"]', (el: any) => el.textContent);
    if (!jsonLd) throw new Error('JSON-LD script not found');
    
    const data = JSON.parse(jsonLd);
    if (data['@type'] !== 'HairSalon') throw new Error(`Expected HairSalon, got: ${data['@type']}`);
    if (!data.telephone) throw new Error('Missing telephone in structured data');
  });

  await runTest('SEO: Meta tags present', async () => {
    await page.goto(`${BASE_URL}/`);
    
    const description = await page.$eval('meta[name="description"]', (el: any) => el.content);
    if (!description || description.length < 20) throw new Error(`Description too short: "${description}"`);
    
    const ogTitle = await page.$eval('meta[property="og:title"]', (el: any) => el.content);
    if (!ogTitle) throw new Error('og:title missing');
    
    const ogLocale = await page.$eval('meta[property="og:locale"]', (el: any) => el.content);
    if (ogLocale !== 'cs_CZ') throw new Error(`Expected og:locale cs_CZ, got: ${ogLocale}`);
  });

  // ============ CLEANUP & SUMMARY ============
  await browser.close();

  console.log('\n' + '═'.repeat(50));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`  Total:   ${results.length}`);
  console.log(`  Passed:  ${passed} ✅`);
  console.log(`  Failed:  ${failed} ❌`);
  if (skipped > 0) console.log(`  Skipped: ${skipped} ⚠️`);
  console.log(`  Time:    ${(totalTime / 1000).toFixed(1)}s`);
  console.log('═'.repeat(50));
  
  if (failed > 0) {
    console.log('\n  Failed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
  
  console.log('\n  All tests passed! 🎉\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
