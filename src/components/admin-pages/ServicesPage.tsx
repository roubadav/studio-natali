import type { FC } from 'hono/jsx';
import type { Service, PublicUser, ServiceCategory } from '../../types';

interface ServicesPageProps {
  services: Service[];
  categories: ServiceCategory[];
  workers: PublicUser[];
}

export const AdminServicesPage: FC<ServicesPageProps> = ({ services, categories, workers }) => {
  // Create maps for easy access in JS
  const servicesMap = services.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<number, Service>);
  const categoriesMap = categories.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<number, ServiceCategory>);

  return (
    <div>
      {/* Modal Styles - Moved to Admin.tsx */}


      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Služby</h1>
        <div class="flex gap-2">
          <button onclick="openCategoryModal()" class="btn btn-outline text-sm">
            <i data-lucide="folder-plus" class="w-4 h-4 mr-2"></i>
            Kategorie
          </button>
          <button onclick="openServiceModal()" class="btn btn-primary text-sm">
            <i data-lucide="plus" class="w-4 h-4 mr-2"></i>
            Služba
          </button>
        </div>
      </div>

      {/* Categories Management */}
      <div class="mb-6">
        {/* Filter Tabs */}
        <div class="flex flex-wrap gap-2 mb-4">
          <button onclick="filterCategory(null)" class="category-tab px-4 py-2 rounded-lg bg-primary-600 text-white" data-category="all">
            Vše ({services.length})
          </button>
          {categories.map(cat => (
            <button onclick={`filterCategory(${cat.id})`} class="category-tab px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700" data-category={cat.id}>
              {cat.name} ({services.filter(s => s.category_id === cat.id).length})
            </button>
          ))}
        </div>
        {/* Category List with edit/delete actions */}
        <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm dark:shadow-neutral-950/30 p-4 mb-4">
          <h3 class="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase mb-3">Správa kategorií</h3>
          <div class="space-y-2">
            {categories.map(cat => {
              const count = services.filter(s => s.category_id === cat.id).length;
              return (
                <div class="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700">
                  <div class="flex items-center gap-3">
                    <i data-lucide={cat.icon || 'scissors'} class="w-5 h-5 text-primary-600 dark:text-primary-400"></i>
                    <div>
                      <span class="font-medium text-neutral-900 dark:text-white">{cat.name}</span>
                      <span class="text-sm text-neutral-500 dark:text-neutral-400 ml-2">({count} {count === 1 ? 'služba' : count >= 2 && count <= 4 ? 'služby' : 'služeb'})</span>
                    </div>
                    {cat.image && (
                      <img src={cat.image} alt="" class="w-8 h-8 rounded object-cover" />
                    )}
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick={`editCategory(${cat.id})`} class="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                      Upravit
                    </button>
                    <button onclick={`deleteCategory(${cat.id})`} class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium">
                      Smazat
                    </button>
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && (
              <p class="text-sm text-neutral-500 dark:text-neutral-400 text-center py-2">Žádné kategorie. Vytvořte první.</p>
            )}
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm dark:shadow-neutral-950/30 overflow-x-auto">
        <table class="w-full min-w-[640px]">
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
                    <div class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">{s.description || '—'}</div>
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
                      class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                    >
                      Upravit
                    </button>
                    <button onclick={`deleteService(${s.id})`} class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Smazat</button>
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
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Podnadpis služby</label>
                <textarea id="service-description" class="form-input" rows={2} placeholder="Včetně: střih + styling + regenerace + mytí + foukaná"></textarea>
                <p class="text-xs text-neutral-500 mt-1">Zobrazuje se pod názvem služby na webu i v rezervacích.</p>
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
                  {workers.length === 1 ? (
                    <>
                      <input type="text" class="form-input bg-neutral-100 dark:bg-neutral-700" value={workers[0].name} disabled />
                      <input type="hidden" id="service-worker" value={String(workers[0].id)} />
                    </>
                  ) : (
                    <select id="service-worker" class="form-input" required>
                      {workers.map(w => <option value={w.id}>{w.name}</option>)}
                    </select>
                  )}
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
                <label class="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Obrázek kategorie</label>
                <div id="category-image-preview" class="mb-2 hidden">
                  <img id="category-image-preview-img" src="" alt="Náhled" class="w-32 h-32 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700" />
                </div>
                <input type="file" id="category-image-file" accept="image/*" onchange="handleCategoryImage(this)" class="form-input text-sm" />
                <input type="hidden" id="category-image-data" value="" />
                <p class="text-xs text-neutral-500 mt-1">Obrázek bude automaticky optimalizován pro web (max 800×800px).</p>
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
        window.categoriesMap = ${JSON.stringify(categoriesMap)};

        function filterCategory(catId) {
          document.querySelectorAll('.category-tab').forEach(el => {
            const isActive = catId === null ? el.dataset.category === 'all' : el.dataset.category == catId;
            el.classList.toggle('bg-primary-600', isActive);
            el.classList.toggle('text-white', isActive);
            el.classList.toggle('bg-neutral-100', !isActive);
            el.classList.toggle('dark:bg-neutral-800', !isActive);
            el.classList.toggle('text-neutral-700', !isActive);
            el.classList.toggle('dark:text-neutral-300', !isActive);
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
          const rawSubtitle = document.getElementById('service-description').value.trim();
          const normalizedSubtitle = rawSubtitle
            ? (/^včetně:/i.test(rawSubtitle) ? rawSubtitle : 'Včetně: ' + rawSubtitle)
            : '';
          const data = {
            name: document.getElementById('service-name').value,
            description: normalizedSubtitle,
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

        // ============ CATEGORY IMAGE COMPRESSION ============
        function compressCategoryImage(file) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
        }

        async function handleCategoryImage(input) {
          const file = input.files[0];
          if (!file) return;
          const base64 = await compressCategoryImage(file);
          document.getElementById('category-image-data').value = base64;
          document.getElementById('category-image-preview-img').src = base64;
          document.getElementById('category-image-preview').classList.remove('hidden');
        }
        
        // ============ CATEGORY CRUD ============
        function openCategoryModal() {
          document.getElementById('category-modal-title').textContent = 'Nová kategorie';
          document.getElementById('category-id').value = '';
          document.getElementById('category-form').reset();
          document.getElementById('category-image-data').value = '';
          document.getElementById('category-image-preview').classList.add('hidden');
          document.getElementById('category-modal').classList.add('open');
        }
        
        function closeCategoryModal() {
          document.getElementById('category-modal').classList.remove('open');
        }

        function editCategory(id) {
          const cat = window.categoriesMap[id];
          if (!cat) return;
          document.getElementById('category-modal-title').textContent = 'Upravit kategorii';
          document.getElementById('category-id').value = cat.id;
          document.getElementById('category-name').value = cat.name;
          document.getElementById('category-icon').value = cat.icon || 'scissors';
          document.getElementById('category-order').value = cat.sort_order || 0;
          document.getElementById('category-image-file').value = '';
          // Show existing image if any
          if (cat.image) {
            document.getElementById('category-image-data').value = cat.image;
            document.getElementById('category-image-preview-img').src = cat.image;
            document.getElementById('category-image-preview').classList.remove('hidden');
          } else {
            document.getElementById('category-image-data').value = '';
            document.getElementById('category-image-preview').classList.add('hidden');
          }
          document.getElementById('category-modal').classList.add('open');
        }
        
        async function saveCategory(e) {
          e.preventDefault();
          const id = document.getElementById('category-id').value;
          const data = {
            name: document.getElementById('category-name').value,
            icon: document.getElementById('category-icon').value,
            sort_order: parseInt(document.getElementById('category-order').value) || 0,
          };
          const imageData = document.getElementById('category-image-data').value;
          if (imageData) data.image = imageData;
          
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
            window.showToast ? window.showToast(err.error || 'Chyba při ukládání', 'error') : alert(err.error || 'Chyba při ukládání');
          }
        }

        async function deleteCategory(id) {
          window.confirmAction('Opravdu chcete smazat tuto kategorii? Služby v ní zůstanou bez kategorie.', async () => {
            const res = await fetch('/api/services/categories/' + id, { method: 'DELETE' });
            if (res.ok) window.location.reload();
            else {
              const err = await res.json();
              window.showToast ? window.showToast(err.error || 'Chyba při mazání', 'error') : alert(err.error || 'Chyba při mazání');
            }
          });
        }
      `}} />
    </div>
  );
};
