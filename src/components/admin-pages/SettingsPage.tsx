import type { FC } from 'hono/jsx';
import type { User } from '../../types';
import { fallbackPhoto } from './shared';

interface SettingsPageProps {
  settings: Record<string, string>;
  currentUser: User;
}

export const AdminSettingsPage: FC<SettingsPageProps> = ({ settings, currentUser }) => {
  return (
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white mb-8">Nastavení</h1>

      {/* Tabs */}
      <div class="flex flex-wrap gap-2 mb-6">
        <button onclick="showSettingsTab('global')" class="settings-tab px-4 py-2 rounded-lg text-sm sm:text-base bg-primary-600 text-white" data-tab="global">
          Globální nastavení
        </button>
        <button onclick="showSettingsTab('profile')" class="settings-tab px-4 py-2 rounded-lg text-sm sm:text-base bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300" data-tab="profile">
          Můj profil
        </button>
      </div>

      {/* Global Settings */}
      <div id="tab-global" class="settings-content">
        <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-4 sm:p-6 space-y-6 max-w-2xl">
          <h2 class="text-lg font-semibold border-b border-neutral-200 dark:border-neutral-700 pb-2">Základní informace</h2>
          <div>
            <label class="block text-sm font-medium mb-2">Název salonu</label>
            <input type="text" id="setting-salon_name" class="form-input" value={settings.salon_name || 'Studio Natali'} />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Telefon</label>
            <input type="tel" id="setting-phone" class="form-input" value={settings.phone || ''} />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Adresa</label>
            <textarea id="setting-address" class="form-input" rows={2}>{settings.address || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Minimální čas pro zrušení (hodiny)</label>
            <input type="number" id="setting-cancellation_hours" class="form-input w-32" value={settings.cancellation_hours || '24'} min="1" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Maximální doba rezervace dopředu (dny)</label>
            <input type="number" id="setting-booking_window" class="form-input w-32" value={settings.booking_window || '30'} min="1" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Doba uchování rezervací (dny)</label>
            <input type="number" id="setting-data_retention_days" class="form-input w-32" value={settings.data_retention_days || '1095'} min="1" />
            <p class="text-xs text-neutral-500 mt-1">Doporučení: uchovávat jen nezbytně dlouho.</p>
          </div>

          <h2 class="text-lg font-semibold border-b border-neutral-200 dark:border-neutral-700 pb-2 pt-4">SMS Notifikace</h2>
          <div>
            <label class="flex items-center gap-2 mb-2">
              <input type="checkbox" id="setting-sms_enabled" checked={settings.sms_enabled === 'true'} />
              <span class="font-medium">Povolit odesílání SMS</span>
            </label>
            <p class="text-xs text-neutral-500 mb-4">Vyžaduje účet na SmsManager.cz. API klíč se nastavuje jako proměnná prostředí (SMS_API_LOGIN).</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Denní limit SMS</label>
            <input type="number" id="setting-sms_daily_limit" class="form-input w-32" value={settings.sms_daily_limit || '20'} min="1" max="200" />
            <p class="text-xs text-neutral-500 mt-1">Maximální počet SMS odeslaných za jeden den (bezpečnostní ochrana).</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Sender ID (Odesílatel)</label>
            <input type="text" id="setting-sms_sender" class="form-input" value={settings.sms_sender || 'StNatali'} placeholder="max 11 znaků" maxlength={11} />
          </div>

          <div class="pt-4">
            <button onclick="saveGlobalSettings()" class="btn btn-primary">Uložit nastavení</button>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div id="tab-profile" class="settings-content hidden">
        <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-4 sm:p-6 space-y-6 max-w-2xl">
          <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
            <div class="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 group">
              {currentUser.image ? (
                <img id="profile-preview" src={currentUser.image} alt={currentUser.name} class="w-full h-full object-cover" onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`} />
              ) : (
                <div id="profile-preview-placeholder" class="w-full h-full flex items-center justify-center text-primary-600 dark:text-primary-300">
                  <i data-lucide="image" class="w-12 h-12"></i>
                </div>
              )}
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onclick="document.getElementById('profile-upload').click()">
                <i data-lucide="camera" class="w-6 h-6 text-white"></i>
              </div>
            </div>
            <div>
              <button onclick="document.getElementById('profile-upload').click()" class="btn btn-outline btn-sm mb-2">Změnit fotku</button>
              <input type="file" id="profile-upload" class="hidden" accept="image/*" onchange="handleProfileUpload(event)" />
              <p class="text-xs text-neutral-500">Doporučeno: Čtvercový formát, max 2MB.</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Jméno</label>
            <input type="text" id="profile-name" class="form-input" value={currentUser.name} />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Login</label>
            <input type="text" class="form-input bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed" value={currentUser.email} disabled />
            <p class="text-xs text-neutral-500 mt-1">Login může změnit pouze admin v sekci Uživatelé.</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">E-mail</label>
            <input type="email" id="profile-email" class="form-input" value={currentUser.notification_email || ''} placeholder="Pro notifikace" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Bio</label>
            <textarea id="profile-bio" class="form-input" rows={3}>{currentUser.bio || ''}</textarea>
          </div>
          <div class="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h3 class="font-medium mb-4">Změna hesla</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Současné heslo</label>
                <input type="password" id="profile-current-password" class="form-input" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Nové heslo</label>
                <input type="password" id="profile-new-password" class="form-input" />
              </div>
            </div>
          </div>
          <div class="pt-4">
            <button onclick="saveProfile()" class="btn btn-primary">Uložit profil</button>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        // Image compression helper
        async function compressImage(file) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max size for profile
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.9));
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
        }

        let newProfileImageBase64 = null;

        async function handleProfileUpload(e) {
          const file = e.target.files[0];
          if (!file) return;
          
          newProfileImageBase64 = await compressImage(file);
          
          // Preview
          const preview = document.getElementById('profile-preview');
          if (preview) {
            preview.src = newProfileImageBase64;
          } else {
            // Replace placeholder
            const placeholder = document.getElementById('profile-preview-placeholder');
            if (placeholder) {
               const img = document.createElement('img');
               img.id = 'profile-preview';
               img.src = newProfileImageBase64;
               img.className = 'w-full h-full object-cover';
               placeholder.parentNode.replaceChild(img, placeholder);
            }
          }
        }

        function showSettingsTab(tab) {
          document.querySelectorAll('.settings-tab').forEach(el => {
            el.classList.toggle('bg-primary-600', el.dataset.tab === tab);
            el.classList.toggle('text-white', el.dataset.tab === tab);
            el.classList.toggle('bg-neutral-100', el.dataset.tab !== tab);
            el.classList.toggle('dark:bg-neutral-800', el.dataset.tab !== tab);
          });
          document.querySelectorAll('.settings-content').forEach(el => {
            el.classList.toggle('hidden', !el.id.endsWith(tab));
          });
        }
        
        async function saveGlobalSettings() {
          const settings = {
            salon_name: document.getElementById('setting-salon_name').value,
            phone: document.getElementById('setting-phone').value,
            address: document.getElementById('setting-address').value,
            cancellation_hours: document.getElementById('setting-cancellation_hours').value,
            booking_window: document.getElementById('setting-booking_window').value,
            data_retention_days: document.getElementById('setting-data_retention_days').value,
            sms_enabled: document.getElementById('setting-sms_enabled').checked ? 'true' : 'false',
            sms_daily_limit: document.getElementById('setting-sms_daily_limit').value,
            sms_sender: document.getElementById('setting-sms_sender').value
          };
          
          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });
          
          if (res.ok) {
            window.showToast('Nastavení uloženo!', 'success');
          } else {
            window.showToast('Chyba při ukládání', 'error');
          }
        }
        
        async function saveProfile() {
          const data = {
            name: document.getElementById('profile-name').value,
            notification_email: document.getElementById('profile-email').value || null,
            bio: document.getElementById('profile-bio').value
          };
          
          if (newProfileImageBase64) {
            data.image = newProfileImageBase64;
          }
          
          const currentPassword = document.getElementById('profile-current-password').value;
          const newPassword = document.getElementById('profile-new-password').value;
          if (currentPassword && newPassword) {
            data.currentPassword = currentPassword;
            data.newPassword = newPassword;
          }
          
          const res = await fetch('/api/users/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          if (res.ok) {
            window.showToast('Profil uložen!', 'success');
            window.location.reload();
          } else {
            const err = await res.json();
            window.showToast(err.error || 'Chyba při ukládání', 'error');
          }
        }
      `}} />
    </div>
  );
};
