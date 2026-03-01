import type { FC } from 'hono/jsx';
import { getTranslations } from '../lib/i18n';
import type { User, GalleryImage, ServiceCategory } from '../types';

const t = getTranslations();

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

// BlobImage component
const BlobImage: FC<{ src: string; alt: string; variant?: 1 | 2 | 3; className?: string }> = ({ src, alt, variant = 1, className = '' }) => {
  return (
    <div class={`blob-frame blob-mask-${variant} ${className}`}>
      <img 
        src={src} 
        alt={alt} 
        class="w-full h-full object-cover" 
        loading="lazy" 
        decoding="async"
        onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`}
      />
    </div>
  );
};

// ============ HERO SECTION ============

export const HeroSection: FC = () => {
  return (
    <section class="relative min-h-[calc(100vh-5rem)] flex items-center overflow-hidden pt-6 pb-12 sm:pb-6 bg-accent-cream dark:bg-neutral-900 animate-on-scroll" id="home">
      {/* Background decoration */}
      <div class="absolute bottom-0 left-0 right-0 h-48 opacity-10">
        <svg viewBox="0 0 1440 200" class="w-full h-full" preserveAspectRatio="none">
          <path 
            d="M0 200V100C100 80 200 60 300 70C400 80 500 120 600 110C700 100 800 40 900 30C1000 20 1100 60 1200 70C1300 80 1400 60 1440 50V200H0Z" 
            fill="currentColor" 
            class="text-primary-900 dark:text-primary-950"
          />
        </svg>
      </div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-8 lg:py-12">
        <div class="grid min-[880px]:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div class="max-w-xl animate-fade-in">
            <h1 class="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 leading-tight text-neutral-900 dark:text-white font-display">
              <span class="font-medium">{t.hero.title_prefix}</span> <span class="font-light text-primary-600 dark:text-primary-400">{t.hero.title_brand}</span>
            </h1>
            <p class="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 mb-8 leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <a href="/rezervace" class="btn btn-primary btn-cta btn-lg inline-flex items-center justify-center gap-2 px-8 py-4 text-lg">
                <i data-lucide="calendar" class="w-5 h-5"></i>
                {t.hero.cta_primary}
              </a>
              <a href="/#sluzby" class="btn btn-outline btn-lg flex items-center justify-center gap-2 px-8 py-4 text-lg">
                {t.hero.cta_secondary}
                <i data-lucide="arrow-right" class="w-5 h-5"></i>
              </a>
            </div>
          </div>
          
          {/* Hero Image - visible only when 2 columns fit (880px+) */}
          <div class="relative hidden min-[880px]:block animate-slide-up">
            <div class="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/hero.png"
                alt={t.hero.image_alt}
                class="w-full h-full object-cover"
                width="600"
                height="750"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`}
              />
            </div>
            <div class="absolute -top-4 -right-4 w-full h-full border-2 border-primary-300 rounded-2xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============ ABOUT SECTION ============

export const AboutSection: FC = () => {
  return (
    <section class="section bg-white dark:bg-neutral-800 animate-on-scroll" id="o-nas">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Images with Blob Masks */}
          <div class="relative flex flex-col items-center lg:items-start justify-center py-8">
            <div class="w-[70%] lg:w-[65%] aspect-[4/3] lg:ml-12 relative z-10">
              <BlobImage 
                src="/images/about_outdoor.png" 
                alt={t.about.image_outdoor_alt} 
                variant={1}
                className="w-full h-full"
              />
            </div>
            <div class="w-[70%] lg:w-[65%] aspect-[4/3] -mt-16 lg:-mt-24 lg:mr-12 relative z-0">
              <BlobImage 
                src="/images/about_indoor.png" 
                alt={t.about.image_indoor_alt} 
                variant={2}
                className="w-full h-full"
              />
            </div>
          </div>
          
          {/* Content */}
          <div>
            <h2 class="section-title">{t.about.title}</h2>
            <div class="space-y-4 text-neutral-600 dark:text-neutral-300 mb-8 leading-relaxed">
              <p>{t.about.paragraph1}</p>
              <p>{t.about.paragraph2}</p>
              <p>{t.about.paragraph3}</p>
            </div>
            <a href="/#kontakt" class="btn btn-outline flex items-center gap-2 w-fit">
              {t.about.cta}
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============ SERVICES SECTION ============

export const ServicesSection: FC<{ categories: ServiceCategory[] }> = ({ categories }) => {
  // Determine grid columns based on number of categories
  const gridCols = categories.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' 
    : categories.length === 3 ? 'grid-cols-2 lg:grid-cols-3' 
    : 'grid-cols-2 lg:grid-cols-4';

  return (
    <section class="section bg-accent-cream dark:bg-neutral-900 animate-on-scroll" id="sluzby">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div class="text-center mb-12">
          <h2 class="section-title">{t.services_section.title}</h2>
          <p class="section-subtitle mx-auto">{t.services_section.subtitle}</p>
        </div>
        
        {/* Services Grid */}
        <div class={`grid ${gridCols} gap-6`}>
          {categories.map(cat => (
            <a href="/rezervace" class="card p-6 text-center group">
              <div class="relative w-full aspect-square mb-4 rounded-xl overflow-hidden">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    class="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`}
                  />
                ) : (
                  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800">
                    <i data-lucide={cat.icon || 'scissors'} class="w-16 h-16 text-primary-600 dark:text-primary-300"></i>
                  </div>
                )}
              </div>
              <h3 class="text-xl font-medium mb-2 text-neutral-900 dark:text-white font-display">{cat.name}</h3>
              {cat.description && (
                <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{cat.description}</p>
              )}
              <span class="text-primary-600 dark:text-primary-400 font-medium text-sm inline-flex items-center justify-center gap-1 transition-transform duration-200 group-hover:translate-x-1">
                {t.common.view}
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </span>
            </a>
          ))}
        </div>
        
        {/* CTA */}
        <div class="text-center mt-12">
          <a href="/rezervace" class="btn btn-primary btn-cta btn-lg px-8 py-4 text-lg">
            {t.services_section.explore}
          </a>
        </div>
      </div>
    </section>
  );
};

// ============ TEAM SECTION ============

export const TeamSection: FC<{ workers: Omit<User, 'password_hash'>[] }> = ({ workers }) => {
  return (
    <section class="section bg-white dark:bg-neutral-800 animate-on-scroll" id="tym">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="section-title">{t.team.title}</h2>
          <p class="section-subtitle mx-auto">{t.team.subtitle}</p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {workers.map((member, index) => (
            <div class="bg-accent-cream dark:bg-neutral-700 rounded-2xl overflow-hidden card">
              {/* Photo with Blob Mask */}
              <div class="pt-6 px-6">
                <div class="aspect-[3/4] max-h-56 mx-auto">
                  {member.image ? (
                    <BlobImage 
                      src={member.image} 
                      alt={member.name} 
                      variant={(index % 3 + 1) as 1 | 2 | 3}
                      className="w-full h-full no-overlay"
                    />
                  ) : (
                    <div class={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 blob-mask-${index % 3 + 1}`}>
                      <div class="text-center p-6">
                        <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-white/70 dark:bg-neutral-800/70 flex items-center justify-center">
                          <i data-lucide="image" class="w-10 h-10 text-primary-600 dark:text-primary-400"></i>
                        </div>
                        <p class="text-primary-800 dark:text-primary-200 font-medium text-sm">{member.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div class="p-6">
                <h3 class="text-2xl font-medium text-neutral-900 dark:text-white mb-1">{member.name}</h3>
                <p class="text-primary-600 dark:text-primary-400 font-medium mb-4">{t.team.role_label}</p>
                <p class="text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-3">{member.bio}</p>
                
                {member.role === 'external' ? (
                  <a href="https://www.facebook.com/StudioNatali" target="_blank" rel="noopener noreferrer" class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors" style="background-color: #1877F2;" onmouseover="this.style.backgroundColor='#1565C0'" onmouseout="this.style.backgroundColor='#1877F2'">
                    <i data-lucide="facebook" class="w-5 h-5"></i>
                    Rezervovat přes Facebook
                  </a>
                ) : (
                  <a href={`/rezervace?workerId=${member.id}`} class="btn btn-primary w-full inline-flex items-center justify-center gap-2">
                    <i data-lucide="calendar" class="w-4 h-4"></i>
                    {t.team.book_appointment}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============ GALLERY SECTION ============

export const GallerySection: FC<{ images: GalleryImage[] }> = ({ images }) => {
  const hasImages = images && images.length > 0;

  return (
    <section class="section bg-white dark:bg-neutral-800 animate-on-scroll" id="galerie">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="section-title">{t.gallery.title}</h2>
          <p class="section-subtitle mx-auto">{t.gallery.subtitle}</p>
        </div>

        <div id="gallery-empty" class={`text-center py-12 text-neutral-500 dark:text-neutral-400 ${hasImages ? 'hidden' : ''}`}>
          <i data-lucide="image" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
          <p>{t.gallery.empty}</p>
        </div>

        <div id="gallery-grid" class={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${hasImages ? '' : 'hidden'}`}>
          {images.slice(0, 8).map((image, index) => (
            <div
              class="relative overflow-hidden rounded-lg aspect-square cursor-pointer animate-on-scroll"
              style={`transition-delay: ${index * 100}ms`}
              onclick={`openLightbox('${image.url}')`}
              data-gallery-item
            >
              <img 
                src={image.url} 
                alt={image.alt_text || `${t.gallery.image_alt_prefix} ${index + 1}`} 
                class="w-full h-full object-cover" 
                loading="lazy"
                decoding="async"
                onerror="handleGalleryImageError(this);"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <div id="lightbox-modal" class="fixed inset-0 z-50 bg-black/90 hidden flex items-center justify-center p-4 opacity-0 transition-opacity duration-300" onclick="closeLightbox()">
        <button class="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-50">
          <i data-lucide="x" class="w-8 h-8"></i>
        </button>
        <img id="lightbox-image" src="" alt={t.gallery.detail_alt} class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onclick="event.stopPropagation()" />
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        function updateGalleryEmptyState() {
          const grid = document.getElementById('gallery-grid');
          const empty = document.getElementById('gallery-empty');
          if (!grid || !empty) return;
          const visibleItems = grid.querySelectorAll('[data-gallery-item]:not(.hidden)');
          if (visibleItems.length === 0) {
            grid.classList.add('hidden');
            empty.classList.remove('hidden');
          }
        }

        function handleGalleryImageError(img) {
          const item = img.closest('[data-gallery-item]');
          if (item) {
            item.classList.add('hidden');
          }
          updateGalleryEmptyState();
        }

        function openLightbox(src) {
          const modal = document.getElementById('lightbox-modal');
          const img = document.getElementById('lightbox-image');
          img.src = src;
          modal.classList.remove('hidden');
          // Trigger reflow for transition
          void modal.offsetWidth;
          modal.classList.remove('opacity-0');
          document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
          const modal = document.getElementById('lightbox-modal');
          const img = document.getElementById('lightbox-image');
          modal.classList.add('opacity-0');
          setTimeout(() => {
            modal.classList.add('hidden');
            img.src = '';
            document.body.style.overflow = '';
          }, 300);
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') closeLightbox();
        });

        document.addEventListener('DOMContentLoaded', updateGalleryEmptyState);
      `}} />
    </section>
  );
};

// ============ CTA SECTION ============

export const CTASection: FC = () => {
  return (
    <section class="section bg-neutral-100 dark:bg-neutral-900 animate-on-scroll">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto">
          <h2 class="text-3xl md:text-4xl mb-6 font-display text-neutral-900 dark:text-white">
            {t.cta.title}
          </h2>
          <p class="text-lg text-neutral-600 dark:text-neutral-300 mb-8 font-light leading-relaxed">
            {t.cta.description}
          </p>
          <a href="/rezervace" class="btn btn-primary btn-cta btn-lg inline-flex items-center gap-2 w-fit mx-auto px-10 shadow-lg">
            <i data-lucide="calendar" class="w-5 h-5"></i>
            {t.cta.button}
          </a>
        </div>
      </div>
    </section>
  );
};

// ============ CONTACT SECTION ============

export const ContactSection: FC = () => {
  return (
    <section class="section bg-accent-cream dark:bg-neutral-900 animate-on-scroll" id="kontakt">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 class="section-title">{t.contact.title}</h2>
            <p class="section-subtitle mb-8">{t.contact.subtitle}</p>
            
            <div class="space-y-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="map-pin" class="w-6 h-6 text-primary-600 dark:text-primary-400"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white mb-1">{t.contact.address}</h3>
                  <p class="text-neutral-600 dark:text-neutral-400">{t.contact.address_line1}<br />{t.contact.address_line2}</p>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="phone" class="w-6 h-6 text-primary-600 dark:text-primary-400"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white mb-1">{t.contact.phone}</h3>
                  <a href="tel:+420774889606" class="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">+420 774 889 606</a>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="mail" class="w-6 h-6 text-primary-600 dark:text-primary-400"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white mb-1">{t.contact.email}</h3>
                  <a href="mailto:info@studionatali-ricany.cz" class="text-neutral-600 dark:text-neutral-400 hover:text-primary-600">info@studionatali-ricany.cz</a>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="clock" class="w-6 h-6 text-primary-600 dark:text-primary-400"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white mb-1">{t.contact.hours}</h3>
                  <div class="text-neutral-600 dark:text-neutral-400 space-y-1">
                    <p>{t.contact.hours_weekdays}</p>
                    <p>{t.contact.hours_weekend}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Map */}
          <div class="relative">
            <div class="aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-lg">
              <iframe
                data-src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1467.6264461174426!2d14.664769626095348!3d49.99999662639322!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470b8d318ea7458b%3A0x31a72cd05a567cf2!2sStudio%20Natali!5e0!3m2!1scs!2scz!4v1766830850542!5m2!1scs!2scz"
                width="100%"
                height="100%"
                style="border:0"
                allowfullscreen
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                title={t.contact.map_title}
                id="google-map-iframe"
              ></iframe>
              <script dangerouslySetInnerHTML={{ __html: `
                // Lazy-load Google Maps only when section is visible
                const mapObserver = new IntersectionObserver((entries) => {
                  entries.forEach(entry => {
                    if (entry.isIntersecting) {
                      const iframe = document.getElementById('google-map-iframe');
                      if (iframe && iframe.dataset.src) {
                        iframe.src = iframe.dataset.src;
                        delete iframe.dataset.src;
                      }
                      mapObserver.unobserve(entry.target);
                    }
                  });
                }, { rootMargin: '200px' });
                const mapContainer = document.getElementById('google-map-iframe');
                if (mapContainer) mapObserver.observe(mapContainer.parentElement);
              ` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
