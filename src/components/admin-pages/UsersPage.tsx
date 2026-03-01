import type { FC } from 'hono/jsx';
import type { PublicUser } from '../../types';
import { fallbackPhoto } from './shared';

interface UsersPageProps {
  users: PublicUser[];
}

export const AdminUsersPage: FC<UsersPageProps> = ({ users }) => {
  // Create a map for easy access in JS
  const usersMap = users.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<number, PublicUser>);

  return (
    <div>
      {/* Modal Styles - Moved to Admin.tsx */}


      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Uživatelé</h1>
        <button onclick="openUserModal()" class="btn btn-primary">
          <i data-lucide="user-plus" class="w-4 h-4 mr-2"></i>
          Nový uživatel
        </button>
      </div>

      {/* Users Table */}
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-x-auto">
        <table class="w-full min-w-[640px]">
          <thead class="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Jméno</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Login</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">E-mail</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
            {users.map(u => {
              const displayEmail = u.notification_email || '–';
              return (
                <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center overflow-hidden">
                        {u.image ? (
                          <img src={u.image} alt={u.name} class="w-full h-full object-cover" loading="lazy" decoding="async" onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`} />
                        ) : (
                          <i data-lucide="image" class="w-5 h-5 text-primary-600 dark:text-primary-400"></i>
                        )}
                      </div>
                      <span class="font-medium text-neutral-900 dark:text-white">{u.name}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{u.email}</td>
                  <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{displayEmail}</td>
                  <td class="px-6 py-4">
                    <span class={`px-2 py-1 text-xs rounded-full ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      u.role === 'external' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'external' ? 'Externí' : u.role === 'superadmin' ? 'Superadmin' : 'Kadeřnice'}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span class={`px-2 py-1 text-xs rounded-full ${
                      u.is_active === 1 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200'
                    }`}>
                      {u.is_active === 1 ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onclick={`editUser(${u.id})`} 
                      class="text-primary-600 hover:text-primary-800 mr-3"
                    >
                      Upravit
                    </button>
                    <button onclick={`deleteUser(${u.id})`} class="text-red-600 hover:text-red-800">Smazat</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      <div id="user-modal" class="modal-overlay">
        <div class="modal-container">
          <h2 id="user-modal-title" class="text-xl font-bold mb-6 text-neutral-900 dark:text-white">Nový uživatel</h2>
          <form id="user-form" onsubmit="saveUser(event)" autocomplete="off">
            <input type="hidden" id="user-id" value="" />
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Jméno *</label>
                <input type="text" id="user-name" class="form-input" required autocomplete="off" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Login *</label>
                <input type="text" id="user-email" class="form-input" required autocomplete="off" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">E-mail</label>
                <input type="email" id="user-notification-email" class="form-input" autocomplete="off" placeholder="Pro notifikace" />
              </div>
              <div id="password-field">
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Heslo *</label>
                <input type="password" id="user-password" class="form-input" autocomplete="new-password" />
                <p id="password-hint" class="text-xs text-neutral-500 mt-1 hidden">Při úpravě ponechte prázdné pro zachování stávajícího</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Role</label>
                <select id="user-role" class="form-input" onchange="handleRoleChange()">
                  <option value="user">Kadeřnice</option>
                  <option value="external">Externí (jen Facebook)</option>
                  <option value="admin">Admin</option>
                </select>
                <p id="role-hint" class="text-xs text-neutral-500 mt-1 hidden"></p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Bio</label>
                <textarea id="user-bio" class="form-input" rows={2}></textarea>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="user-active" checked />
                <label for="user-active" class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Aktivní uživatel</label>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="closeUserModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Uložit</button>
            </div>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        window.usersMap = ${JSON.stringify(usersMap)};

        function handleRoleChange() {
          const role = document.getElementById('user-role').value;
          const pwField = document.getElementById('password-field');
          const hint = document.getElementById('role-hint');
          if (role === 'external') {
            pwField.classList.add('hidden');
            hint.textContent = 'Externí uživatel se zobrazuje na webu s odkazem na Facebook. Nemůže se přihlásit ani přijímat rezervace.';
            hint.classList.remove('hidden');
          } else {
            pwField.classList.remove('hidden');
            hint.classList.add('hidden');
          }
        }

        function openUserModal() {
          document.getElementById('user-modal-title').textContent = 'Nový uživatel';
          document.getElementById('user-id').value = '';
          document.getElementById('user-form').reset();
          document.getElementById('user-active').checked = true;
          document.getElementById('password-hint').classList.add('hidden');
          handleRoleChange();
          document.getElementById('user-modal').classList.add('open');
        }
        
        function closeUserModal() {
          document.getElementById('user-modal').classList.remove('open');
        }
        
        function editUser(id) {
          const user = window.usersMap[id];
          if (!user) return;
          
          document.getElementById('user-modal-title').textContent = 'Upravit uživatele';
          document.getElementById('user-id').value = user.id;
          document.getElementById('user-name').value = user.name;
          document.getElementById('user-email').value = user.email;
          document.getElementById('user-notification-email').value = user.notification_email || '';
          document.getElementById('user-password').value = '';
          document.getElementById('password-hint').classList.remove('hidden');
          document.getElementById('user-role').value = user.role === 'external' ? 'external' : (user.role || 'user');
          document.getElementById('user-bio').value = user.bio || '';
          document.getElementById('user-active').checked = user.is_active === 1;
          handleRoleChange();
          document.getElementById('user-modal').classList.add('open');
        }
        
        async function saveUser(e) {
          e.preventDefault();
          const id = document.getElementById('user-id').value;
          const data = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            notification_email: document.getElementById('user-notification-email').value || null,
            role: document.getElementById('user-role').value,
            bio: document.getElementById('user-bio').value,
            is_active: document.getElementById('user-active').checked ? 1 : 0
          };
          
          const password = document.getElementById('user-password').value;
          if (password) data.password = password;
          
          const url = id ? '/api/users/' + id : '/api/users';
          const method = id ? 'PUT' : 'POST';
          
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          if (res.ok) {
            window.location.reload();
          } else {
            const err = await res.json();
            window.showToast(err.error || 'Chyba při ukládání', 'error');
          }
        }
        
        async function deleteUser(id) {
          window.confirmAction('Opravdu chcete smazat tohoto uživatele?', async () => {
            const res = await fetch('/api/users/' + id, { method: 'DELETE' });
            if (res.ok) window.location.reload();
          });
        }
      `}} />
    </div>
  );
};
