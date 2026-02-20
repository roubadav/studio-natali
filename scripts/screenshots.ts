/**
 * Screenshot all pages in light & dark mode using Playwright
 * 
 * Usage:
 *   1. Start dev server: npm run dev
 *   2. Run: npx playwright test scripts/screenshots.ts
 *   
 * Or directly: npx tsx scripts/screenshots.ts
 */
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';

const PAGES = [
  { name: 'homepage', path: '/', waitFor: '#home' },
  { name: 'rezervace', path: '/rezervace', waitFor: '.reservation-wizard, main' },
  { name: 'obchodni-podminky', path: '/obchodni-podminky', waitFor: '.legal-card' },
  { name: 'zpracovani-udaju', path: '/zpracovani-udaju', waitFor: '.legal-card' },
  { name: 'admin-login', path: '/admin/login', waitFor: '#login-form' },
];

const ADMIN_PAGES = [
  { name: 'admin-dashboard', path: '/admin/dashboard', waitFor: '.card' },
  { name: 'admin-rezervace', path: '/admin/rezervace', waitFor: '#reservations-body' },
  { name: 'admin-sluzby', path: '/admin/sluzby', waitFor: '#services-table' },
  { name: 'admin-galerie', path: '/admin/galerie', waitFor: '#gallery-grid' },
  { name: 'admin-uzivatele', path: '/admin/uzivatele', waitFor: 'table' },
  { name: 'admin-pracovni-doba', path: '/admin/pracovni-doba', waitFor: '.hours-section' },
  { name: 'admin-nastaveni', path: '/admin/nastaveni', waitFor: '#tab-global' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

async function login(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[name="username"]', process.env.ADMIN_USER || 'admin0');
  await page.fill('input[name="password"]', process.env.ADMIN_PASS || 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  await page.close();
}

async function captureScreenshots() {
  const outDir = join(process.cwd(), 'screenshots');
  
  const browser = await chromium.launch({ headless: true });
  
  console.log('📸 Starting screenshot capture...\n');

  for (const viewport of VIEWPORTS) {
    for (const mode of ['light', 'dark'] as const) {
      const dir = join(outDir, viewport.name, mode);
      mkdirSync(dir, { recursive: true });

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: mode,
      });

      // Public pages
      for (const pageInfo of PAGES) {
        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 15000 });
          if (pageInfo.waitFor) {
            await page.waitForSelector(pageInfo.waitFor, { timeout: 5000 }).catch(() => {});
          }
          // Wait for fonts and animations
          await page.waitForTimeout(1500);
          
          const filePath = join(dir, `${pageInfo.name}.png`);
          await page.screenshot({ path: filePath, fullPage: true });
          console.log(`  ✅ ${viewport.name}/${mode}/${pageInfo.name}.png`);
        } catch (e) {
          console.log(`  ❌ ${viewport.name}/${mode}/${pageInfo.name} - ${(e as Error).message}`);
        }
        await page.close();
      }

      // Admin pages (need auth)
      try {
        await login(context);
        
        for (const pageInfo of ADMIN_PAGES) {
          const page = await context.newPage();
          try {
            await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 15000 });
            if (pageInfo.waitFor) {
              await page.waitForSelector(pageInfo.waitFor, { timeout: 5000 }).catch(() => {});
            }
            await page.waitForTimeout(1000);
            
            const filePath = join(dir, `${pageInfo.name}.png`);
            await page.screenshot({ path: filePath, fullPage: true });
            console.log(`  ✅ ${viewport.name}/${mode}/${pageInfo.name}.png`);
          } catch (e) {
            console.log(`  ❌ ${viewport.name}/${mode}/${pageInfo.name} - ${(e as Error).message}`);
          }
          await page.close();
        }
      } catch (e) {
        console.log(`  ⚠️  Admin login failed for ${viewport.name}/${mode}: ${(e as Error).message}`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log(`\n🎉 Screenshots saved to ${outDir}`);
}

captureScreenshots().catch(console.error);
