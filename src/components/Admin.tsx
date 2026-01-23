import type { FC, PropsWithChildren } from 'hono/jsx';
import type { ReservationWithItems } from '../types';
import { BaseLayout } from './Layout';

// ============ ADMIN LAYOUT ============

export const AdminLayout: FC<PropsWithChildren<{ title?: string }>> = ({ children, title }) => {
  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'layout-dashboard' },
    { name: 'Rezervace', href: '/admin/rezervace', icon: 'calendar' },
    { name: 'Služby', href: '/admin/sluzby', icon: 'scissors' },
    { name: 'Galerie', href: '/admin/galerie', icon: 'image' },
    { name: 'Uživatelé', href: '/admin/uzivatele', icon: 'users' },
    { name: 'Pracovní doba', href: '/admin/pracovni-doba', icon: 'clock' },
    { name: 'Nastavení', href: '/admin/nastaveni', icon: 'settings' },
  ];
  
  return (
    <BaseLayout title={title}>
      <div class="min-h-screen bg-neutral-100 dark:bg-neutral-900">
        {/* Global Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Scrollbars */
          .modal-container::-webkit-scrollbar { width: 8px; }
          .modal-container::-webkit-scrollbar-track { background: transparent; }
          .modal-container::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 4px; }
          .modal-container::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }
          .admin-nav::-webkit-scrollbar { width: 8px; }
          .admin-nav::-webkit-scrollbar-track { background: transparent; }
          .admin-nav::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 4px; }
          .admin-nav::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }
          @media (prefers-color-scheme: dark) {
            .modal-container::-webkit-scrollbar-thumb { background-color: rgba(75, 85, 99, 0.5); }
            .modal-container::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.8); }
            .admin-nav::-webkit-scrollbar-thumb { background-color: rgba(75, 85, 99, 0.5); }
            .admin-nav::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.8); }
          }
          
          /* Modal Styles */
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .modal-overlay.open { opacity: 1; pointer-events: auto; }
          .modal-container { background: white; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; border-radius: 0.75rem; padding: 1.5rem; transform: scale(0.95); transition: transform 0.3s; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
          .modal-overlay.open .modal-container { transform: scale(1); }
          @media (prefers-color-scheme: dark) { .modal-container { background: #262626; color: white; } }

          /* Toast Styles */
          #toast-container { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 100; display: flex; flex-direction: column; gap: 0.5rem; }
          .toast { padding: 1rem 1.5rem; border-radius: 0.5rem; color: white; font-weight: 500; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); transform: translateY(20px); opacity: 0; transition: all 0.3s; }
          .toast.show { transform: translateY(0); opacity: 1; }
          .toast-success { background-color: #059669; }
          .toast-error { background-color: #dc2626; }
          .toast-info { background-color: #2563eb; }
        `}} />

        {/* Sidebar */}
        <aside class="fixed left-0 top-0 h-full w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 z-50 flex flex-col">
          {/* Logo */}
          <div class="h-20 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-700">
            <a href="/" class="flex items-center">
              <img src="/logo.svg" alt="Studio Natali" class="h-10 w-auto" />
            </a>
          </div>
          
          {/* Navigation */}
          <nav class="p-4 space-y-1 overflow-y-auto flex-1 admin-nav">
            {navItems.map(item => (
              <a 
                href={item.href} 
                class="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <i data-lucide={item.icon} class="w-5 h-5"></i>
                {item.name}
              </a>
            ))}
          </nav>
          
          {/* Logout */}
          <div class="p-4 border-t border-neutral-200 dark:border-neutral-700">
            <button 
              hx-delete="/api/auth"
              hx-swap="none"
              hx-on--after-request="window.location.href='/admin/login'"
              class="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <i data-lucide="log-out" class="w-5 h-5"></i>
              Odhlásit se
            </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main class="ml-64 p-8">
          {children}
        </main>
        
        {/* Toast Container */}
        <div id="toast-container"></div>
        
        {/* Confirmation Modal */}
        <div id="confirm-modal" class="modal-overlay">
          <div class="modal-container max-w-sm">
             <div class="text-center">
               <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                 <i data-lucide="alert-triangle" class="w-6 h-6 text-red-600 dark:text-red-400"></i>
               </div>
               <h3 class="text-lg font-bold text-neutral-900 dark:text-white mb-2">Opravdu provést akci?</h3>
               <p id="confirm-message" class="text-neutral-500 dark:text-neutral-400 mb-6">Tuto akci nelze vzít zpět.</p>
               <div class="flex gap-3 justify-center">
                 <button onclick="closeConfirmModal()" class="btn btn-outline">Zrušit</button>
                 <button id="confirm-yes-btn" class="btn bg-red-600 hover:bg-red-700 text-white">Smazat</button>
               </div>
             </div>
          </div>
        </div>

        {/* Global Admin Scripts */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Click outside to close modals
          document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
              e.target.classList.remove('open');
            }
          });

          // Toast function
          window.showToast = (message, type = 'success') => {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast toast-' + type;
            toast.textContent = message;
            
            container.appendChild(toast);
            
            // Trigger animation
            requestAnimationFrame(() => {
              toast.classList.add('show');
            });
            
            // Remove after 3s
            setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => toast.remove(), 300);
            }, 3000);
          };

          // Confirmation function
          let pendingConfirm = null;
          
          window.confirmAction = (message, onConfirm) => {
             document.getElementById('confirm-message').textContent = message;
             const modal = document.getElementById('confirm-modal');
             modal.classList.add('open');
             
             pendingConfirm = onConfirm;
          };
          
          window.closeConfirmModal = () => {
             document.getElementById('confirm-modal').classList.remove('open');
             pendingConfirm = null;
          };
          
          document.getElementById('confirm-yes-btn').addEventListener('click', () => {
             if (pendingConfirm) {
                pendingConfirm();
             }
             closeConfirmModal();
          });

          // Override global alert for cleaner look (optional, but requested to replace alerts)
          // We keep direct calls to window.showToast preferred, but this catches stragglers
          // window.alert = (msg) => window.showToast(msg, 'info'); 
        `}} />
      </div>
    </BaseLayout>
  );
};

// ============ ADMIN LOGIN PAGE ============

export const AdminLoginPage: FC = () => {
  return (
    <div class="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <img src="/logo.svg" alt="Studio Natali" class="h-12 mx-auto mb-4" />
          <h1 class="text-2xl font-semibold text-neutral-900 dark:text-white">Přihlášení do administrace</h1>
        </div>
        
        <div class="card p-8">
          <form id="login-form" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Uživatelské jméno</label>
              <input 
                type="text" 
                name="username" 
                class="form-input" 
                required 
                placeholder="uživatel"
                autocomplete="username"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Heslo</label>
              <input 
                type="password" 
                name="password" 
                class="form-input" 
                required 
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </div>
            
            <div id="login-error" class="hidden p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm"></div>
            
            <button type="submit" class="btn btn-primary w-full">
              Přihlásit se
            </button>
          </form>
          
          <div class="mt-6 text-center">
            <a href="/" class="text-sm text-neutral-500 hover:text-primary-600">← Zpět na web</a>
          </div>
        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('login-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const errorDiv = document.getElementById('login-error');
          errorDiv.classList.add('hidden');
          
          const formData = new FormData(e.target);
          
          try {
            const response = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: formData.get('username'),
                password: formData.get('password')
              })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.error || 'Přihlášení selhalo');
            }
            
            window.location.href = '/admin/dashboard';
          } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
          }
        });
      `}} />
    </div>
  );
};

// ============ ADMIN DASHBOARD ============

interface AdminDashboardProps {
  todayReservations: ReservationWithItems[];
  pendingReservations: ReservationWithItems[];
  recentReservations: ReservationWithItems[];
}

export const AdminDashboard: FC<AdminDashboardProps> = ({ 
  todayReservations, 
  pendingReservations, 
  recentReservations 
}) => {
  return (
    <div>
      {/* Header */}
      <div class="mb-8 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
        <a href="/" target="_blank" class="text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600">
          Zobrazit web →
        </a>
      </div>
      
      {/* Stats */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">Dnes</p>
              <p class="text-3xl font-bold text-neutral-900 dark:text-white">{todayReservations.length}</p>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">rezervací</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-neutral-700 flex items-center justify-center">
              <i data-lucide="calendar-days" class="w-6 h-6 text-primary-600 dark:text-primary-400"></i>
            </div>
          </div>
        </div>
        
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">Čeká na potvrzení</p>
              <p class="text-3xl font-bold text-orange-600 dark:text-orange-400">{pendingReservations.length}</p>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">rezervací</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-orange-100 dark:bg-neutral-700 flex items-center justify-center">
              <i data-lucide="alert-circle" class="w-6 h-6 text-orange-600 dark:text-orange-400"></i>
            </div>
          </div>
        </div>
        
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">Dnes tržby</p>
              <p class="text-3xl font-bold text-green-600 dark:text-green-400">
                {todayReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').reduce((sum, r) => sum + (r.total_price || 0), 0)} Kč
              </p>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">odhad</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-neutral-700 flex items-center justify-center">
              <i data-lucide="banknote" class="w-6 h-6 text-green-600 dark:text-green-400"></i>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Reservations */}
      <div class="card overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Nedávné rezervace</h2>
          <a href="/admin/rezervace" class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
            Zobrazit vše
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </a>
        </div>
        
        <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
          {recentReservations.length === 0 ? (
            <div class="p-6 text-center text-neutral-500 dark:text-neutral-400">
              Žádné nedávné rezervace.
            </div>
          ) : (
            recentReservations.map(reservation => (
              <div class="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                <div class="flex items-center gap-4">
                  <div class={`w-3 h-3 rounded-full flex-shrink-0 ${
                    reservation.status === 'confirmed' || reservation.status === 'completed' ? 'bg-green-500' :
                    reservation.status === 'pending' ? 'bg-orange-500' :
                    reservation.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-300'
                  }`}></div>
                  <div>
                    <p class="font-medium text-neutral-900 dark:text-white">{reservation.customer_name}</p>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400">
                      {reservation.items?.map(i => i.service_name).join(', ') || 'Služby'}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-medium text-neutral-900 dark:text-white">{reservation.date}</p>
                  <p class="text-sm text-neutral-500 dark:text-neutral-400">{reservation.start_time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
