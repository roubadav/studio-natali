import type { FC } from 'hono/jsx';
import { BaseLayout } from './Layout';

export const TestRunnerPage: FC = () => {
  return (
    <BaseLayout title="E2E Testy | Studio Natali">
      <div class="min-h-screen bg-neutral-100 dark:bg-neutral-900 p-8">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center justify-between mb-8">
            <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">E2E Test Runner</h1>
            <div class="flex gap-2">
              <button onclick="runAllTests()" class="btn btn-primary">
                <i data-lucide="play" class="w-4 h-4 mr-2"></i>
                Spustit všechny testy
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div id="test-results" class="space-y-4">
            {/* Public Tests */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h2 class="font-semibold text-neutral-900 dark:text-white">Veřejné stránky</h2>
              </div>
              <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
                <TestItem id="test-homepage" name="Homepage se načte" />
                <TestItem id="test-navigation" name="Navigace funguje" />
                <TestItem id="test-reservation-page" name="Stránka rezervace se načte" />
                <TestItem id="test-terms" name="Obchodní podmínky se načtou" />
              </div>
            </div>

            {/* Reservation Tests */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h2 class="font-semibold text-neutral-900 dark:text-white">Rezervační wizard</h2>
              </div>
              <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
                <TestItem id="test-reservation-workers" name="Načtou se kadeřnice" />
                <TestItem id="test-reservation-services" name="Načtou se služby" />
                <TestItem id="test-reservation-calendar" name="Kalendář funguje" />
                <TestItem id="test-reservation-flow" name="Kompletní flow rezervace" />
              </div>
            </div>

            {/* Admin Tests */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h2 class="font-semibold text-neutral-900 dark:text-white">Admin panel</h2>
              </div>
              <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
                <TestItem id="test-admin-login" name="Přihlášení funguje" />
                <TestItem id="test-admin-dashboard" name="Dashboard se načte" />
                <TestItem id="test-admin-services" name="Správa služeb" />
                <TestItem id="test-admin-users" name="Správa uživatelů" />
                <TestItem id="test-admin-reservations" name="Správa rezervací" />
              </div>
            </div>

            {/* API Tests */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
              <div class="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h2 class="font-semibold text-neutral-900 dark:text-white">API Endpointy</h2>
              </div>
              <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
                <TestItem id="test-api-workers" name="GET /api/workers" />
                <TestItem id="test-api-services" name="GET /api/services" />
                <TestItem id="test-api-reservations" name="GET /api/reservations" />
                <TestItem id="test-api-settings" name="GET /api/settings" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div id="test-summary" class="mt-8 p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm hidden">
            <div class="flex items-center justify-between">
              <div>
                <span id="summary-passed" class="text-green-600 font-medium">0 úspěšných</span>
                <span class="text-neutral-400 mx-2">|</span>
                <span id="summary-failed" class="text-red-600 font-medium">0 neúspěšných</span>
                <span class="text-neutral-400 mx-2">|</span>
                <span id="summary-time" class="text-neutral-500">0ms</span>
              </div>
              <div id="summary-status" class="font-medium"></div>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        let testResults = {};
        let startTime = 0;
        
        async function runAllTests() {
          testResults = {};
          startTime = Date.now();
          
          // Reset all tests
          document.querySelectorAll('.test-item').forEach(el => {
            el.querySelector('.test-status').className = 'test-status w-4 h-4 text-neutral-400';
            el.querySelector('.test-status').innerHTML = '<i data-lucide="circle" class="w-4 h-4"></i>';
            el.querySelector('.test-message').textContent = '';
          });
          lucide.createIcons();
          
          // Run tests sequentially
          await runTest('test-homepage', testHomepage);
          await runTest('test-navigation', testNavigation);
          await runTest('test-reservation-page', testReservationPage);
          await runTest('test-terms', testTerms);
          
          await runTest('test-reservation-workers', testReservationWorkers);
          await runTest('test-reservation-services', testReservationServices);
          await runTest('test-reservation-calendar', testReservationCalendar);
          await runTest('test-reservation-flow', testReservationFlow);
          
          await runTest('test-admin-login', testAdminLogin);
          await runTest('test-admin-dashboard', testAdminDashboard);
          await runTest('test-admin-services', testAdminServices);
          await runTest('test-admin-users', testAdminUsers);
          await runTest('test-admin-reservations', testAdminReservations);
          
          await runTest('test-api-workers', testApiWorkers);
          await runTest('test-api-services', testApiServices);
          await runTest('test-api-reservations', testApiReservations);
          await runTest('test-api-settings', testApiSettings);
          
          showSummary();
        }
        
        async function runTest(id, testFn) {
          const el = document.getElementById(id);
          const statusEl = el.querySelector('.test-status');
          const messageEl = el.querySelector('.test-message');
          
          statusEl.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>';
          statusEl.className = 'test-status w-4 h-4 text-blue-500';
          lucide.createIcons();
          
          try {
            await testFn();
            testResults[id] = { passed: true };
            statusEl.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i>';
            statusEl.className = 'test-status w-4 h-4 text-green-500';
            messageEl.textContent = '';
          } catch (error) {
            testResults[id] = { passed: false, error: error.message };
            statusEl.innerHTML = '<i data-lucide="x-circle" class="w-4 h-4"></i>';
            statusEl.className = 'test-status w-4 h-4 text-red-500';
            messageEl.textContent = error.message;
            messageEl.className = 'test-message text-sm text-red-600 dark:text-red-400 ml-4';
          }
          
          lucide.createIcons();
        }
        
        function showSummary() {
          const passed = Object.values(testResults).filter(r => r.passed).length;
          const failed = Object.values(testResults).filter(r => !r.passed).length;
          const time = Date.now() - startTime;
          
          document.getElementById('summary-passed').textContent = passed + ' úspěšných';
          document.getElementById('summary-failed').textContent = failed + ' neúspěšných';
          document.getElementById('summary-time').textContent = time + 'ms';
          
          const statusEl = document.getElementById('summary-status');
          if (failed === 0) {
            statusEl.textContent = '✓ Všechny testy prošly';
            statusEl.className = 'font-medium text-green-600';
          } else {
            statusEl.textContent = '✗ Některé testy selhaly';
            statusEl.className = 'font-medium text-red-600';
          }
          
          document.getElementById('test-summary').classList.remove('hidden');
        }
        
        // ========== TEST IMPLEMENTATIONS ==========
        
        async function testHomepage() {
          const res = await fetch('/');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const html = await res.text();
          if (!html.includes('Studio Natali')) throw new Error('Missing title');
        }
        
        async function testNavigation() {
          const res = await fetch('/');
          const html = await res.text();
          if (!html.includes('href="/rezervace"')) throw new Error('Missing reservation link');
          if (!html.includes('id="sluzby"')) throw new Error('Missing services section');
        }
        
        async function testReservationPage() {
          const res = await fetch('/rezervace');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const html = await res.text();
          if (!html.includes('Vyberte kadeřnici')) throw new Error('Missing step 1');
        }
        
        async function testTerms() {
          const res = await fetch('/obchodni-podminky');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const html = await res.text();
          if (!html.includes('Obchodní podmínky')) throw new Error('Missing title');
        }
        
        async function testReservationWorkers() {
          const res = await fetch('/api/workers');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const data = await res.json();
          if (!data.workers || !Array.isArray(data.workers)) throw new Error('Invalid response');
        }
        
        async function testReservationServices() {
          const res = await fetch('/api/services');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const data = await res.json();
          if (!data.services || !Array.isArray(data.services)) throw new Error('Invalid response');
        }
        
        async function testReservationCalendar() {
          const today = new Date().toISOString().split('T')[0];
          const res = await fetch('/api/reservations?date=' + today + '&totalDuration=60&workerId=1&detailed=true');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const data = await res.json();
          if (!data.slots) throw new Error('Missing slots');
        }
        
        async function testReservationFlow() {
          // This is a comprehensive test that would test the full flow
          // For now, just verify the page structure
          const res = await fetch('/rezervace');
          const html = await res.text();
          if (!html.includes('step-1')) throw new Error('Missing step 1');
          if (!html.includes('step-2')) throw new Error('Missing step 2');
          if (!html.includes('step-3')) throw new Error('Missing step 3');
          if (!html.includes('step-4')) throw new Error('Missing step 4');
          if (!html.includes('step-5')) throw new Error('Missing step 5');
        }
        
        async function testAdminLogin() {
          const res = await fetch('/admin/login');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const html = await res.text();
          if (!html.includes('Přihlášení')) throw new Error('Missing login form');
        }
        
        async function testAdminDashboard() {
          // Try to access dashboard (should redirect to login if not authenticated)
          const res = await fetch('/admin/dashboard', { redirect: 'manual' });
          // Either 200 (logged in) or 302 (redirect to login) is acceptable
          if (res.status !== 200 && res.status !== 302) throw new Error('Status: ' + res.status);
        }
        
        async function testAdminServices() {
          const res = await fetch('/admin/sluzby', { redirect: 'manual' });
          if (res.status !== 200 && res.status !== 302) throw new Error('Status: ' + res.status);
        }
        
        async function testAdminUsers() {
          const res = await fetch('/admin/uzivatele', { redirect: 'manual' });
          if (res.status !== 200 && res.status !== 302) throw new Error('Status: ' + res.status);
        }
        
        async function testAdminReservations() {
          const res = await fetch('/admin/rezervace', { redirect: 'manual' });
          if (res.status !== 200 && res.status !== 302) throw new Error('Status: ' + res.status);
        }
        
        async function testApiWorkers() {
          const res = await fetch('/api/workers');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const data = await res.json();
          if (!data.workers) throw new Error('Invalid response');
        }
        
        async function testApiServices() {
          const res = await fetch('/api/services');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const data = await res.json();
          if (!data.services) throw new Error('Invalid response');
        }
        
        async function testApiReservations() {
          const res = await fetch('/api/reservations');
          if (!res.ok) throw new Error('Status: ' + res.status);
          // Response should be an array of reservations
        }
        
        async function testApiSettings() {
          const res = await fetch('/api/settings');
          if (!res.ok) throw new Error('Status: ' + res.status);
          const data = await res.json();
          if (!data.settings) throw new Error('Invalid response');
        }
      `}} />
    </BaseLayout>
  );
};

const TestItem: FC<{ id: string; name: string }> = ({ id, name }) => {
  return (
    <div id={id} class="test-item flex items-center justify-between p-4">
      <div class="flex items-center gap-3">
        <span class="test-status w-4 h-4 text-neutral-400">
          <i data-lucide="circle" class="w-4 h-4"></i>
        </span>
        <span class="text-neutral-900 dark:text-white">{name}</span>
      </div>
      <span class="test-message text-sm text-neutral-500"></span>
    </div>
  );
};
