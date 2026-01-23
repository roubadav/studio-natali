import type { FC } from 'hono/jsx';
import type { Service, User, ServiceCategory, ReservationWithItems, GalleryImage, WorkingHoursTemplate, Setting } from '../types';

const fallbackPhoto = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f5f0e8" />
        <stop offset="100%" stop-color="#dcc9ad" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#g)" />
    <rect x="45" y="60" width="110" height="80" rx="12" fill="none" stroke="#8a654b" stroke-width="8" />
    <circle cx="80" cy="90" r="10" fill="#8a654b" />
    <path d="M60 130l25-25 20 20 15-15 30 30" fill="none" stroke="#8a654b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`
)}`;

// ============ SERVICES PAGE ============
interface ServicesPageProps {
  services: Service[];
  categories: ServiceCategory[];
  workers: User[];
}

export const AdminServicesPage: FC<ServicesPageProps> = ({ services, categories, workers }) => {
  // Create a map for easy access in JS
  const servicesMap = services.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<number, Service>);

  return (
    <div>
      {/* Modal Styles - Moved to Admin.tsx */}


      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Služby</h1>
        <div class="flex gap-2">
          <button onclick="openCategoryModal()" class="btn btn-outline">
            <i data-lucide="folder-plus" class="w-4 h-4 mr-2"></i>
            Nová kategorie
          </button>
          <button onclick="openServiceModal()" class="btn btn-primary">
            <i data-lucide="plus" class="w-4 h-4 mr-2"></i>
            Nová služba
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div class="flex flex-wrap gap-2 mb-6">
        <button onclick="filterCategory(null)" class="category-tab px-4 py-2 rounded-lg bg-primary-600 text-white" data-category="all">
          Vše ({services.length})
        </button>
        {categories.map(cat => (
          <button onclick={`filterCategory(${cat.id})`} class="category-tab px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700" data-category={cat.id}>
            {cat.name} ({services.filter(s => s.category_id === cat.id).length})
          </button>
        ))}
      </div>

      {/* Services Table */}
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <table class="w-full">
          <thead class="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Název</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Kategorie</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Kadeřnice</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Trvání</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Cena</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody id="services-table" class="divide-y divide-neutral-200 dark:divide-neutral-700">
            {services.map(s => {
              const category = categories.find(c => c.id === s.category_id);
              const worker = workers.find(w => w.id === s.user_id);
              return (
                <tr class="service-row hover:bg-neutral-50 dark:hover:bg-neutral-700" data-category={s.category_id}>
                  <td class="px-6 py-4">
                    <div class="font-medium text-neutral-900 dark:text-white">{s.name}</div>
                    <div class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">{s.description}</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{category?.name || '-'}</td>
                  <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{worker?.name || '-'}</td>
                  <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{s.duration} min</td>
                  <td class="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                    {s.price_type === 'starts_at' ? 'od ' : ''}{s.price} Kč
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onclick={`editService(${s.id})`} 
                      class="text-primary-600 hover:text-primary-800 mr-3"
                    >
                      Upravit
                    </button>
                    <button onclick={`deleteService(${s.id})`} class="text-red-600 hover:text-red-800">Smazat</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Service Modal */}
      <div id="service-modal" class="modal-overlay">
        <div class="modal-container">
          <h2 id="service-modal-title" class="text-xl font-bold mb-6 text-neutral-900 dark:text-white">Nová služba</h2>
          <form id="service-form" onsubmit="saveService(event)">
            <input type="hidden" id="service-id" value="" />
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Název *</label>
                <input type="text" id="service-name" class="form-input" required />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Popis</label>
                <textarea id="service-description" class="form-input" rows={2}></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Kategorie *</label>
                  <select id="service-category" class="form-input" required>
                    {categories.map(c => <option value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Kadeřnice *</label>
                  <select id="service-worker" class="form-input" required>
                    {workers.map(w => <option value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Cena (Kč) *</label>
                  <input type="number" id="service-price" class="form-input" required min="0" />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Typ ceny</label>
                  <select id="service-price-type" class="form-input">
                    <option value="fixed">Pevná</option>
                    <option value="starts_at">Od</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Trvání (min) *</label>
                  <input type="number" id="service-duration" class="form-input" required min="5" step="5" />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="closeServiceModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Uložit</button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Modal */}
      <div id="category-modal" class="modal-overlay">
        <div class="modal-container">
          <h2 id="category-modal-title" class="text-xl font-bold mb-6 text-neutral-900 dark:text-white">Nová kategorie</h2>
          <form id="category-form" onsubmit="saveCategory(event)">
            <input type="hidden" id="category-id" value="" />
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Název *</label>
                <input type="text" id="category-name" class="form-input" required />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Ikona</label>
                <select id="category-icon" class="form-input">
                  <option value="scissors">Nůžky</option>
                  <option value="palette">Paleta</option>
                  <option value="sparkles">Třpytky</option>
                  <option value="heart">Srdce</option>
                  <option value="star">Hvězda</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Pořadí</label>
                <input type="number" id="category-order" class="form-input" min="0" value="0" />
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="closeCategoryModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Uložit</button>
            </div>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        window.servicesMap = ${JSON.stringify(servicesMap)};

        function filterCategory(catId) {
          document.querySelectorAll('.category-tab').forEach(el => {
            el.classList.toggle('bg-primary-600', catId === null ? el.dataset.category === 'all' : el.dataset.category == catId);
            el.classList.toggle('text-white', catId === null ? el.dataset.category === 'all' : el.dataset.category == catId);
            el.classList.toggle('bg-neutral-100', !(catId === null ? el.dataset.category === 'all' : el.dataset.category == catId));
            el.classList.toggle('dark:bg-neutral-800', !(catId === null ? el.dataset.category === 'all' : el.dataset.category == catId));
          });
          document.querySelectorAll('.service-row').forEach(el => {
            el.style.display = catId === null || el.dataset.category == catId ? '' : 'none';
          });
        }
        
        function openServiceModal() {
          document.getElementById('service-modal-title').textContent = 'Nová služba';
          document.getElementById('service-id').value = '';
          document.getElementById('service-form').reset();
          document.getElementById('service-modal').classList.add('open');
        }
        
        function closeServiceModal() {
          document.getElementById('service-modal').classList.remove('open');
        }
        
        function editService(id) {
          const service = window.servicesMap[id];
          if (!service) return;
          
          document.getElementById('service-modal-title').textContent = 'Upravit službu';
          document.getElementById('service-id').value = service.id;
          document.getElementById('service-name').value = service.name;
          document.getElementById('service-description').value = service.description || '';
          document.getElementById('service-category').value = service.category_id;
          document.getElementById('service-worker').value = service.user_id;
          document.getElementById('service-price').value = service.price;
          document.getElementById('service-price-type').value = service.price_type || 'fixed';
          document.getElementById('service-duration').value = service.duration;
          document.getElementById('service-modal').classList.add('open');
        }
        
        async function saveService(e) {
          e.preventDefault();
          const id = document.getElementById('service-id').value;
          const data = {
            name: document.getElementById('service-name').value,
            description: document.getElementById('service-description').value,
            category_id: parseInt(document.getElementById('service-category').value),
            user_id: parseInt(document.getElementById('service-worker').value),
            price: parseInt(document.getElementById('service-price').value),
            price_type: document.getElementById('service-price-type').value,
            duration: parseInt(document.getElementById('service-duration').value)
          };
          
          const url = id ? '/api/services/' + id : '/api/services';
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
        
        async function deleteService(id) {
          window.confirmAction('Opravdu chcete smazat tuto službu?', async () => {
            const res = await fetch('/api/services/' + id, { method: 'DELETE' });
            if (res.ok) window.location.reload();
          });
        }
        
        function openCategoryModal() {
          document.getElementById('category-modal-title').textContent = 'Nová kategorie';
          document.getElementById('category-id').value = '';
          document.getElementById('category-form').reset();
          document.getElementById('category-modal').classList.add('open');
        }
        
        function closeCategoryModal() {
          document.getElementById('category-modal').classList.remove('open');
        }
        
        async function saveCategory(e) {
          e.preventDefault();
          const id = document.getElementById('category-id').value;
          const data = {
            name: document.getElementById('category-name').value,
            icon: document.getElementById('category-icon').value,
            order: parseInt(document.getElementById('category-order').value) || 0
          };
          
          const url = id ? '/api/services/categories/' + id : '/api/services/categories';
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
            alert(err.error || 'Chyba při ukládání');
          }
        }
      `}} />
    </div>
  );
};

// ============ GALLERY PAGE ============
interface GalleryPageProps {
  images: GalleryImage[];
}

export const AdminGalleryPage: FC<GalleryPageProps> = ({ images }) => {
  return (
    <div>
      {/* Modal Styles if not already loaded - Moved to Admin.tsx */}


      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Galerie</h1>
        <button onclick="document.getElementById('upload-input').click()" class="btn btn-primary">
          <i data-lucide="upload" class="w-4 h-4 mr-2"></i>
          Nahrát obrázky
        </button>
        <input type="file" id="upload-input" class="hidden" accept="image/*" multiple onchange="uploadImages(event)" />
      </div>

      {/* Images Grid */}
      <div id="gallery-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img, idx) => (
          <div class="gallery-item relative group" data-id={img.id} data-order={idx}>
            <img src={img.url} alt={img.alt_text || ''} class="w-full aspect-square object-cover rounded-lg" loading="lazy" decoding="async" onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`} />
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <button onclick={`editImage(${img.id}, '${img.alt_text || ''}')`} class="p-2 bg-white rounded-full hover:bg-neutral-100">
                <i data-lucide="pencil" class="w-4 h-4 text-neutral-700"></i>
              </button>
              <button onclick={`deleteImage(${img.id})`} class="p-2 bg-white rounded-full hover:bg-red-100">
                <i data-lucide="trash-2" class="w-4 h-4 text-red-600"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div class="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <i data-lucide="image" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
          <p>Zatím žádné obrázky</p>
        </div>
      )}

      {/* Edit Modal */}
      <div id="edit-modal" class="modal-overlay">
        <div class="modal-container max-w-md">
          <h2 class="text-xl font-bold mb-6 text-neutral-900 dark:text-white">Upravit popis</h2>
          <form onsubmit="saveImageAlt(event)">
            <input type="hidden" id="edit-image-id" />
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Alt text</label>
              <input type="text" id="edit-image-alt" class="form-input" placeholder="Popis obrázku" />
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" onclick="closeEditModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Uložit</button>
            </div>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        async function compressImage(file) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max size for gallery
                const MAX_WIDTH = 1600;
                const MAX_HEIGHT = 1600;
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

        async function uploadImages(e) {
          const files = e.target.files;
          if (!files.length) return;
          
          for (const file of files) {
            // Compress
            const base64 = await compressImage(file);
            
            // Upload as JSON
            await fetch('/api/gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64 })
            });
          }
          
          window.location.reload();
        }
        
        function editImage(id, alt) {
          document.getElementById('edit-image-id').value = id;
          document.getElementById('edit-image-alt').value = alt;
          document.getElementById('edit-modal').classList.add('open');
        }
        
        function closeEditModal() {
          document.getElementById('edit-modal').classList.remove('open');
        }
        
        async function saveImageAlt(e) {
          e.preventDefault();
          const id = document.getElementById('edit-image-id').value;
          const alt = document.getElementById('edit-image-alt').value;
          
          await fetch('/api/gallery/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alt })
          });
          
          window.location.reload();
        }
        
        async function deleteImage(id) {
          window.confirmAction('Opravdu smazat tento obrázek?', async () => {
            await fetch('/api/gallery/' + id, { method: 'DELETE' });
            window.location.reload();
          });
        }
      `}} />
    </div>
  );
};

// ============ USERS PAGE ============
interface UsersPageProps {
  users: User[];
}

export const AdminUsersPage: FC<UsersPageProps> = ({ users }) => {
  // Create a map for easy access in JS
  const usersMap = users.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<number, User>);

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
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <table class="w-full">
          <thead class="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Jméno</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">E-mail</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
            {users.map(u => {
              const displayEmail = u.email && u.email.includes('@') && u.email !== u.slug && u.email !== 'admin0' ? u.email : '–';
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
                  <td class="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{displayEmail}</td>
                  <td class="px-6 py-4">
                    <span class={`px-2 py-1 text-xs rounded-full ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Kadeřnice'}
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
          <form id="user-form" onsubmit="saveUser(event)">
            <input type="hidden" id="user-id" value="" />
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Jméno *</label>
                <input type="text" id="user-name" class="form-input" required />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">E-mail / Login *</label>
                <input type="text" id="user-email" class="form-input" required />
              </div>
              <div id="password-field">
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Heslo *</label>
                <input type="password" id="user-password" class="form-input" />
                <p class="text-xs text-neutral-500 mt-1">Při úpravě ponechte prázdné pro zachování stávajícího</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Role</label>
                <select id="user-role" class="form-input">
                  <option value="worker">Kadeřnice</option>
                  <option value="admin">Admin</option>
                </select>
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

        function openUserModal() {
          document.getElementById('user-modal-title').textContent = 'Nový uživatel';
          document.getElementById('user-id').value = '';
          document.getElementById('user-form').reset();
          document.getElementById('user-active').checked = true;
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
          document.getElementById('user-password').value = '';
          document.getElementById('user-role').value = user.role || 'worker';
          document.getElementById('user-bio').value = user.bio || '';
          document.getElementById('user-active').checked = user.is_active === 1;
          document.getElementById('user-modal').classList.add('open');
        }
        
        async function saveUser(e) {
          e.preventDefault();
          const id = document.getElementById('user-id').value;
          const data = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
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

// ============ WORKING HOURS PAGE ============
interface WorkingHoursPageProps {
  hours: WorkingHoursTemplate[];
  workers: User[];
  currentUser: { userId: number; role: string };
}

export const AdminWorkingHoursPage: FC<WorkingHoursPageProps> = ({ hours, workers, currentUser }) => {
  // JS day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
  // We display Monday first, so we use a mapping
  const daysConfig = [
    { name: 'Pondělí', dbIndex: 1 },
    { name: 'Úterý', dbIndex: 2 },
    { name: 'Středa', dbIndex: 3 },
    { name: 'Čtvrtek', dbIndex: 4 },
    { name: 'Pátek', dbIndex: 5 },
    { name: 'Sobota', dbIndex: 6 },
    { name: 'Neděle', dbIndex: 0 },
  ];
  
  return (
    <div>
      {/* Modal Styles - Moved to Admin.tsx */}


      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Pracovní doba</h1>
      </div>

      {/* Worker tabs */}
      <div class="flex flex-wrap gap-2 mb-6">
        {workers.map((w, idx) => (
          <button 
            onclick={`showWorkerHours(${w.id})`} 
            class={`worker-tab px-4 py-2 rounded-lg ${
              (currentUser.role === 'admin' || currentUser.role === 'superadmin' ? idx === 0 : w.id === currentUser.userId)
                ? 'bg-primary-600 text-white' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`} 
            data-worker={w.id}
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* Hours content for each worker */}
      {workers.map((worker, wIdx) => {
        const workerHours = hours.filter(h => h.user_id === worker.id);
        const canEdit = currentUser.role === 'superadmin' || currentUser.userId === worker.id;
        const initialHidden = currentUser.role === 'admin' || currentUser.role === 'superadmin' ? wIdx > 0 : worker.id !== currentUser.userId;
        
        return (
          <div id={`hours-${worker.id}`} class={`hours-section ${initialHidden ? 'hidden' : ''}`}>
            
            {/* Sub-tabs: Exceptions vs Standard */}
            <div class="flex gap-2 mb-4 border-b border-neutral-200 dark:border-neutral-700">
               <button onclick={`switchSubTab(${worker.id}, 'exceptions')`} class={`sub-tab-${worker.id} px-4 py-2 border-b-2 font-medium text-sm transition-colors border-primary-600 text-primary-600`} data-tab="exceptions">
                 Výjimky / Nepřítomnost
               </button>
               <button onclick={`switchSubTab(${worker.id}, 'standard')`} class={`sub-tab-${worker.id} px-4 py-2 border-b-2 font-medium text-sm transition-colors border-transparent text-neutral-500 hover:text-neutral-700`} data-tab="standard">
                 Běžná pracovní doba
               </button>
            </div>

            {/* TAB 1: EXCEPTIONS & BLOCKS */}
            <div id={`tab-exceptions-${worker.id}`} class="sub-content">
              {/* Overrides / Shifts */}
              <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6 mb-6">
                <h3 class="font-semibold text-lg mb-4">Mimořádné směny a celodenní volno</h3>
                {canEdit ? (
                  <form onsubmit={`addOverride(event, ${worker.id})`} class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
                    <div>
                      <label class="block text-sm font-medium mb-1">Datum</label>
                      <input type="date" name="date" class="form-input" required />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-1">Typ</label>
                      <select name="type" class="form-input" onchange={`toggleTimeInputs(this, ${worker.id})`}>
                        <option value="off">Celodenní volno</option>
                        <option value="work">Mimořádná směna</option>
                      </select>
                    </div>
                    <div class="time-inputs hidden gap-2 col-span-2">
                       <div>
                         <label class="block text-sm font-medium mb-1">Od - Do</label>
                         <div class="flex gap-1">
                           <input type="time" name="start_time" class="form-input" />
                           <input type="time" name="end_time" class="form-input" />
                         </div>
                       </div>
                    </div>
                    <div class="col-span-2">
                      <label class="block text-sm font-medium mb-1">Poznámka</label>
                      <input type="text" name="note" class="form-input" placeholder="Např. Dovolená" />
                    </div>
                    <div>
                      <button type="submit" class="btn btn-primary w-full">Přidat</button>
                    </div>
                  </form>
                ) : (
                   <p class="text-neutral-500 italic">Nemáte oprávnění upravovat výjimky.</p>
                )}
                
                <div class="mt-6 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <table class="w-full">
                    <thead class="bg-neutral-50 dark:bg-neutral-700">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Datum</th>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Typ</th>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Čas</th>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Poznámka</th>
                        <th class="px-4 py-2 text-right text-xs font-medium uppercase">Akce</th>
                      </tr>
                    </thead>
                    <tbody id={`overrides-list-${worker.id}`} class="divide-y divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
                       <tr><td colspan="5" class="px-4 py-3 text-center text-sm text-neutral-500">Načítám...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Short Absences (Blocking) */}
              <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6">
                <h3 class="font-semibold text-lg mb-4">Krátkodobá nepřítomnost (Lékař, vyřizování...)</h3>
                <p class="text-sm text-neutral-500 mb-4">Vytvoří blokovanou rezervaci, aby v tento čas nikdo nemohl rezervovat termín.</p>
                
                {canEdit && (
                  <button onclick={`openBlockModal(${worker.id})`} class="btn btn-outline">
                    <i data-lucide="clock" class="w-4 h-4 mr-2"></i>
                    Přidat blokaci času
                  </button>
                )}
              </div>
            </div>

            {/* TAB 2: STANDARD HOURS */}
            <div id={`tab-standard-${worker.id}`} class="sub-content hidden">
              {canEdit && (
                <div class="flex justify-end mb-4">
                  <button onclick={`saveAllHours(${worker.id})`} class="btn btn-primary">
                    <i data-lucide="save" class="w-4 h-4 mr-2"></i>
                    Uložit změny
                  </button>
                </div>
              )}
              <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
                <table class="w-full">
                  <thead class="bg-neutral-50 dark:bg-neutral-700">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Den</th>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Pracovní doba</th>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Pauza</th>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {daysConfig.map((dayConfig) => {
                      const dayHours = workerHours.find(h => h.day_of_week === dayConfig.dbIndex);
                      const breakEnabled = !!(dayHours?.break_start || dayHours?.break_end);
                      return (
                        <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <td class="px-6 py-4 font-medium text-neutral-900 dark:text-white">{dayConfig.name}</td>
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                              <input type="time" class="form-input py-1 w-28" id={`start-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.start_time || '09:00'} disabled={!canEdit} />
                              <span>-</span>
                              <input type="time" class="form-input py-1 w-28" id={`end-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.end_time || '17:00'} disabled={!canEdit} />
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <div class="flex flex-col gap-2">
                              <label class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
                                <input type="checkbox" class="custom-checkbox" id={`break-enabled-${worker.id}-${dayConfig.dbIndex}`} checked={breakEnabled} disabled={!canEdit} onchange={`toggleBreakStatus(${worker.id}, ${dayConfig.dbIndex})`} />
                                Pauza
                              </label>
                              <div class="flex items-center gap-2">
                                <input type="time" class="form-input py-1 w-28" id={`break-start-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.break_start || '12:00'} disabled={!canEdit || !breakEnabled} />
                                <span>-</span>
                                <input type="time" class="form-input py-1 w-28" id={`break-end-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.break_end || '12:30'} disabled={!canEdit || !breakEnabled} />
                              </div>
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" class="custom-checkbox" id={`active-${worker.id}-${dayConfig.dbIndex}`} checked={!dayHours?.is_day_off} disabled={!canEdit} onchange={`toggleWorkingStatus(${worker.id}, ${dayConfig.dbIndex})`} />
                              <span class="text-sm" id={`status-text-${worker.id}-${dayConfig.dbIndex}`}>{!dayHours?.is_day_off ? 'Pracuje' : 'Volno'}</span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Block Time Modal */}
      <div id="block-modal" class="modal-overlay">
        <div class="modal-container">
          <h2 class="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Blokovat čas</h2>
          <form id="block-form" onsubmit="saveBlock(event)">
            <input type="hidden" id="block-worker-id" />
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Datum *</label>
                <input type="date" id="block-date" class="form-input" required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Od *</label>
                  <input type="time" id="block-start" class="form-input" required />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Do *</label>
                  <input type="time" id="block-end" class="form-input" required />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Důvod *</label>
                <input type="text" id="block-reason" class="form-input" placeholder="Lékař, Osobní..." required />
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="closeBlockModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Blokovat</button>
            </div>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        function showWorkerHours(workerId) {
          document.querySelectorAll('.worker-tab').forEach(el => {
            const isActive = el.dataset.worker == workerId;
            el.classList.toggle('bg-primary-600', isActive);
            el.classList.toggle('text-white', isActive);
            el.classList.toggle('bg-neutral-100', !isActive);
            el.classList.toggle('dark:bg-neutral-800', !isActive);
            el.classList.toggle('text-neutral-700', !isActive);
            el.classList.toggle('dark:text-neutral-300', !isActive);
          });
          document.querySelectorAll('.hours-section').forEach(el => {
            el.classList.toggle('hidden', !el.id.endsWith(workerId));
          });
          
          loadOverrides(workerId);
        }
        
        function switchSubTab(workerId, tab) {
           document.querySelectorAll('.sub-tab-' + workerId).forEach(el => {
              const isActive = el.dataset.tab === tab;
              el.classList.toggle('border-primary-600', isActive);
              el.classList.toggle('text-primary-600', isActive);
              el.classList.toggle('border-transparent', !isActive);
              el.classList.toggle('text-neutral-500', !isActive);
           });
           
           document.getElementById('tab-exceptions-' + workerId).classList.toggle('hidden', tab !== 'exceptions');
           document.getElementById('tab-standard-' + workerId).classList.toggle('hidden', tab !== 'standard');
        }

        function toggleTimeInputs(select, workerId) {
           const form = select.closest('form');
           const timeInputs = form.querySelector('.time-inputs');
           if (select.value === 'work') {
              timeInputs.classList.remove('hidden');
              timeInputs.classList.add('grid');
           } else {
              timeInputs.classList.add('hidden');
              timeInputs.classList.remove('grid');
           }
        }
        
        async function loadOverrides(workerId) {
           const tbody = document.getElementById('overrides-list-' + workerId);
           try {
             const res = await fetch('/api/working-hours/overrides?workerId=' + workerId);
             const data = await res.json();
             
             if (data.overrides.length === 0) {
               tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-neutral-500">Žádné výjimky</td></tr>';
               return;
             }
             
             tbody.innerHTML = data.overrides.map(o => \`
               <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                 <td class="px-4 py-3 text-sm">\${new Date(o.date).toLocaleDateString('cs-CZ')}</td>
                 <td class="px-4 py-3">
                   <span class="px-2 py-1 rounded-full text-xs \${o.is_day_off ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'}">
                     \${o.is_day_off ? 'Volno' : 'Směna'}
                   </span>
                 </td>
                 <td class="px-4 py-3 text-sm">
                   \${!o.is_day_off ? (o.start_time + ' - ' + o.end_time) : '-'}
                 </td>
                 <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">\${o.note || '-'}</td>
                 <td class="px-4 py-3 text-right">
                   <button onclick="deleteOverride(\${o.id}, \${workerId})" class="text-red-600 hover:text-red-800 text-sm">Smazat</button>
                 </td>
               </tr>
             \`).join('');
           } catch (e) {
             tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center text-red-500">Chyba načítání</td></tr>';
           }
        }
        
        async function addOverride(e, workerId) {
           e.preventDefault();
           const form = e.target;
           const formData = new FormData(form);
           const type = formData.get('type');
           
           const data = {
             user_id: workerId,
             date: formData.get('date'),
             is_day_off: type === 'off',
             note: formData.get('note')
           };
           
           if (type === 'work') {
             data.start_time = formData.get('start_time');
             data.end_time = formData.get('end_time');
           }
           
           const res = await fetch('/api/working-hours/overrides', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(data)
           });
           
           if (res.ok) {
             form.reset();
             loadOverrides(workerId);
           } else {
             window.showToast('Chyba při ukládání', 'error');
           }
        }
        
        async function deleteOverride(id, workerId) {
           window.confirmAction('Smazat výjimku?', async () => {
             await fetch('/api/working-hours/overrides/' + id, { method: 'DELETE' });
             loadOverrides(workerId);
           });
        }
        
        function toggleWorkingStatus(workerId, dayOfWeek) {
          const checkbox = document.getElementById('active-' + workerId + '-' + dayOfWeek);
          const statusText = document.getElementById('status-text-' + workerId + '-' + dayOfWeek);
          if (statusText) {
            statusText.textContent = checkbox.checked ? 'Pracuje' : 'Volno';
          }
        }

        function toggleBreakStatus(workerId, dayOfWeek) {
          const checkbox = document.getElementById('break-enabled-' + workerId + '-' + dayOfWeek);
          const start = document.getElementById('break-start-' + workerId + '-' + dayOfWeek);
          const end = document.getElementById('break-end-' + workerId + '-' + dayOfWeek);
          const enabled = checkbox.checked;
          start.disabled = !enabled;
          end.disabled = !enabled;
          if (!enabled) {
            start.value = '';
            end.value = '';
          }
        }

        // Day indices: 0=Sunday, 1=Monday, ..., 6=Saturday
        const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday in display order

        async function saveAllHours(workerId) {
          let hasError = false;
          for (const dayOfWeek of dayIndices) {
            const startEl = document.getElementById('start-' + workerId + '-' + dayOfWeek);
            if (!startEl) continue; // Skip if element doesn't exist
            
            const result = await saveHoursForDay(workerId, dayOfWeek);
            if (!result) hasError = true;
          }
          if (!hasError) {
            window.showToast('Vše uloženo!', 'success');
          }
        }

        async function saveHoursForDay(workerId, dayOfWeek) {
          const breakEnabled = document.getElementById('break-enabled-' + workerId + '-' + dayOfWeek).checked;
          const data = {
            user_id: workerId,
            day_of_week: dayOfWeek,
            start_time: document.getElementById('start-' + workerId + '-' + dayOfWeek).value || '09:00',
            end_time: document.getElementById('end-' + workerId + '-' + dayOfWeek).value || '17:00',
            break_start: breakEnabled ? (document.getElementById('break-start-' + workerId + '-' + dayOfWeek).value || '') : '',
            break_end: breakEnabled ? (document.getElementById('break-end-' + workerId + '-' + dayOfWeek).value || '') : '',
            is_working: document.getElementById('active-' + workerId + '-' + dayOfWeek).checked
          };

          try {
            const res = await fetch('/api/working-hours', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              console.error('Save error for day', dayOfWeek, err);
              window.showToast(err.error || 'Chyba při ukládání', 'error');
              return false;
            }
            return true;
          } catch (e) {
            console.error('Network error:', e);
            window.showToast('Chyba sítě', 'error');
            return false;
          }
        }

        async function saveHours(workerId, dayOfWeek) {
          const result = await saveHoursForDay(workerId, dayOfWeek);
          if (result) {
            window.showToast('Uloženo!', 'success');
          }
        }

        // --- Block Time Logic ---
        function openBlockModal(workerId) {
          document.getElementById('block-worker-id').value = workerId;
          document.getElementById('block-form').reset();
          document.getElementById('block-modal').classList.add('open');
        }

        function closeBlockModal() {
          document.getElementById('block-modal').classList.remove('open');
        }

        async function saveBlock(e) {
          e.preventDefault();
          const workerId = document.getElementById('block-worker-id').value;
          
          const data = {
            workerId: parseInt(workerId),
            date: document.getElementById('block-date').value,
            startTime: document.getElementById('block-start').value,
            endTime: document.getElementById('block-end').value,
            reason: document.getElementById('block-reason').value
          };

          const res = await fetch('/api/reservations/admin-block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (res.ok) {
            window.showToast('Čas zablokován.', 'success');
            closeBlockModal();
          } else {
            window.showToast('Chyba při blokaci.', 'error');
          }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
           const visibleSection = document.querySelector('.hours-section:not(.hidden)');
           if (visibleSection) {
              const workerId = visibleSection.id.replace('hours-', '');
              loadOverrides(workerId);
           }
        });
      `}} />
    </div>
  );
};

// ============ SETTINGS PAGE ============
interface SettingsPageProps {
  settings: Record<string, string>;
  currentUser: User;
}

export const AdminSettingsPage: FC<SettingsPageProps> = ({ settings, currentUser }) => {
  return (
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white mb-8">Nastavení</h1>

      {/* Tabs */}
      <div class="flex gap-2 mb-6">
        <button onclick="showSettingsTab('global')" class="settings-tab px-4 py-2 rounded-lg bg-primary-600 text-white" data-tab="global">
          Globální nastavení
        </button>
        <button onclick="showSettingsTab('profile')" class="settings-tab px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300" data-tab="profile">
          Můj profil
        </button>
      </div>

      {/* Global Settings */}
      <div id="tab-global" class="settings-content">
        <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6 space-y-6 max-w-2xl">
          <h2 class="text-lg font-semibold border-b border-neutral-200 dark:border-neutral-700 pb-2">Základní informace</h2>
          <div>
            <label class="block text-sm font-medium mb-2">Název salonu</label>
            <input type="text" id="setting-salon_name" class="form-input" value={settings.salon_name || 'Studio Natali'} />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">E-mail pro notifikace</label>
            <input type="email" id="setting-notification_email" class="form-input" value={settings.notification_email || ''} />
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
            <p class="text-xs text-neutral-500 mb-4">Vyžaduje integraci SMS brány.</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">API Key (SMS Gateway)</label>
            <input type="password" id="setting-sms_api_key" class="form-input" value={settings.sms_api_key || ''} placeholder="Vložte API klíč" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Sender ID (Odesílatel)</label>
            <input type="text" id="setting-sms_sender" class="form-input" value={settings.sms_sender || 'StudioNatali'} placeholder="max 11 znaků" />
          </div>

          <div class="pt-4">
            <button onclick="saveGlobalSettings()" class="btn btn-primary">Uložit nastavení</button>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div id="tab-profile" class="settings-content hidden">
        <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6 space-y-6 max-w-2xl">
          <div class="flex items-center gap-6 mb-6">
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
            <label class="block text-sm font-medium mb-2">E-mail</label>
            <input type="email" id="profile-email" class="form-input" value={currentUser.email} />
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
            notification_email: document.getElementById('setting-notification_email').value,
            phone: document.getElementById('setting-phone').value,
            address: document.getElementById('setting-address').value,
            cancellation_hours: document.getElementById('setting-cancellation_hours').value,
            booking_window: document.getElementById('setting-booking_window').value,
            data_retention_days: document.getElementById('setting-data_retention_days').value,
            sms_enabled: document.getElementById('setting-sms_enabled').checked ? 'true' : 'false',
            sms_api_key: document.getElementById('setting-sms_api_key').value,
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
            email: document.getElementById('profile-email').value,
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

// ============ RESERVATIONS PAGE (CALENDAR VIEW) ============
interface ReservationsPageProps {
  reservations: ReservationWithItems[];
  workers: User[];
}

export const AdminReservationsPage: FC<ReservationsPageProps> = ({ reservations, workers }) => {
  // Sort reservations: Pending first (by date), then Confirmed/Blocked (by date), then others
  const sortedReservations = [...reservations].sort((a, b) => {
    const score = (s: string) => s === 'pending' ? 0 : (s === 'confirmed' || s === 'blocked' || s.startsWith('block')) ? 1 : 2;
    if (score(a.status) !== score(b.status)) return score(a.status) - score(b.status);
    return new Date(a.date + 'T' + a.start_time).getTime() - new Date(b.date + 'T' + b.start_time).getTime();
  });

  return (
    <div>
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Rezervace</h1>
        <div class="flex gap-2">
          <div class="relative">
            <select id="filter-worker" onchange="filterReservations()" class="form-input py-2 pl-4 pr-10 appearance-none cursor-pointer w-48">
              <option value="">Všechny kadeřnice</option>
              {workers.map(w => <option value={w.id}>{w.name}</option>)}
            </select>
            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"></i>
          </div>
          <div class="relative">
            <select id="filter-status" onchange="filterReservations()" class="form-input py-2 pl-4 pr-10 appearance-none cursor-pointer w-48">
              <option value="active" selected>Aktivní (Výchozí)</option>
              <option value="all">Všechny</option>
              <option value="pending">Čeká na potvrzení</option>
              <option value="confirmed">Potvrzeno</option>
              <option value="cancelled">Zrušeno</option>
              <option value="completed">Dokončeno</option>
            </select>
            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div class="flex items-center justify-between mb-6">
        <button onclick="prevWeek()" class="btn btn-outline">
          <i data-lucide="chevron-left" class="w-4 h-4 mr-1"></i> Předchozí
        </button>
        <h2 id="week-title" class="text-lg font-semibold text-neutral-900 dark:text-white">Týden</h2>
        <button onclick="nextWeek()" class="btn btn-outline">
          Další <i data-lucide="chevron-right" class="w-4 h-4 ml-1"></i>
        </button>
      </div>

      {/* Reservations Table */}
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <table class="w-full">
          <thead class="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Datum</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Čas</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Zákazník</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Kadeřnice</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Služby</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Cena</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Stav</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody id="reservations-body" class="divide-y divide-neutral-200 dark:divide-neutral-700">
            {sortedReservations.map(r => {
              const worker = workers.find(w => w.id === r.user_id);
              const totalPrice = r.items?.reduce((sum: number, i: any) => sum + (i.price_at_time || 0) * (i.quantity || 1), 0) || 0;
              const isBlocked = r.status === 'blocked' || r.workflow_step === 'admin_block';
              
              return (
                <tr class="reservation-row hover:bg-neutral-50 dark:hover:bg-neutral-700" data-worker={r.user_id} data-status={isBlocked ? 'blocked' : r.status}>
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-white">{r.date}</td>
                  <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{r.start_time} - {r.end_time}</td>
                  <td class="px-4 py-3">
                    <div class="text-sm font-medium text-neutral-900 dark:text-white">{r.customer_name}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{r.customer_email}</div>
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{worker?.name || '-'}</td>
                  <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                    {isBlocked ? 'BLOKACE' : (r.items?.map((i: any) => i.service_name).join(', ') || '-')}
                  </td>
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-white">{isBlocked ? '-' : totalPrice + ' Kč'}</td>
                  <td class="px-4 py-3">
                    <span class={`px-2 py-1 text-xs rounded-full ${
                      isBlocked ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                      r.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      r.status === 'pending' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      r.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      r.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {isBlocked ? 'Blokováno' : r.status === 'pending' ? 'Čeká' : r.status === 'confirmed' ? 'Potvrzeno' : r.status === 'cancelled' ? 'Zrušeno' : r.status === 'completed' ? 'Dokončeno' : r.status}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <div class="flex gap-1">
                      {isBlocked ? (
                         <button onclick={`updateStatus(${r.id}, 'cancelled')`} class="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Odblokovat">
                           <i data-lucide="trash-2" class="w-4 h-4"></i>
                         </button>
                      ) : (
                        <>
                          {r.status === 'pending' && (
                            <button onclick={`updateStatus(${r.id}, 'confirmed')`} class="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="Potvrdit">
                              <i data-lucide="check" class="w-4 h-4"></i>
                            </button>
                          )}
                          {r.status === 'confirmed' && (
                            <button onclick={`updateStatus(${r.id}, 'completed')`} class="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Dokončit">
                              <i data-lucide="check-check" class="w-4 h-4"></i>
                            </button>
                          )}
                          {r.status !== 'cancelled' && r.status !== 'completed' && (
                            <button onclick={`updateStatus(${r.id}, 'cancelled')`} class="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Zrušit">
                              <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                          )}
                          <button onclick={`showDetail(${r.id})`} class="p-1.5 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded" title="Detail">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedReservations.length === 0 && (
        <div class="text-center py-12 text-neutral-500">Žádné rezervace</div>
      )}

      <script dangerouslySetInnerHTML={{ __html: `
        function filterReservations() {
          const workerId = document.getElementById('filter-worker').value;
          const status = document.getElementById('filter-status').value;
          
          document.querySelectorAll('.reservation-row').forEach(row => {
            const rowStatus = row.dataset.status;
            const matchWorker = !workerId || row.dataset.worker == workerId;
            
            let matchStatus = true;
            if (status === 'active') {
               // Show Pending, Confirmed, Blocked. Hide Cancelled, Completed.
               matchStatus = rowStatus !== 'cancelled' && rowStatus !== 'completed';
            } else if (status === 'all') {
               matchStatus = true;
            } else {
               // Exact match (including blocked if filter supports it, but here we mapped blocked to 'blocked' status)
               matchStatus = rowStatus === status;
            }
            
            row.style.display = matchWorker && matchStatus ? '' : 'none';
          });
        }
        
        async function updateStatus(id, status) {
          const res = await fetch('/api/reservations/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          
          if (res.ok) {
            window.location.reload();
          } else {
            const err = await res.json();
            window.showToast(err.error || 'Chyba', 'error');
          }
        }
        
        function showDetail(id) {
          // Placeholder for detail modal
          window.showToast('Detail rezervace #' + id, 'info');
        }
        
        let currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
        
        function updateWeekTitle() {
          const end = new Date(currentWeekStart);
          end.setDate(end.getDate() + 6);
          document.getElementById('week-title').textContent = 
            currentWeekStart.toLocaleDateString('cs-CZ') + ' - ' + end.toLocaleDateString('cs-CZ');
        }
        
        function prevWeek() {
          currentWeekStart.setDate(currentWeekStart.getDate() - 7);
          updateWeekTitle();
          // Reload with new date range
          const startStr = currentWeekStart.toISOString().split('T')[0];
          const end = new Date(currentWeekStart);
          end.setDate(end.getDate() + 6);
          const endStr = end.toISOString().split('T')[0];
          
          window.location.href = window.location.pathname + '?start=' + startStr + '&end=' + endStr;
        }
        
        function nextWeek() {
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
          updateWeekTitle();
          // Reload with new date range
          const startStr = currentWeekStart.toISOString().split('T')[0];
          const end = new Date(currentWeekStart);
          end.setDate(end.getDate() + 6);
          const endStr = end.toISOString().split('T')[0];
          
          window.location.href = window.location.pathname + '?start=' + startStr + '&end=' + endStr;
        }
        
        // Initial filter application
        document.addEventListener('DOMContentLoaded', () => {
           filterReservations();
           updateWeekTitle();
        });
      `}} />
    </div>
  );
};
