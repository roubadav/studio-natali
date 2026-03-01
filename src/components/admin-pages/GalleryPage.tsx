import type { FC } from 'hono/jsx';
import type { GalleryImage } from '../../types';
import { fallbackPhoto } from './shared';

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
