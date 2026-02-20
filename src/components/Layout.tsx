import type { FC, PropsWithChildren } from 'hono/jsx';
import { html, raw } from 'hono/html';
import { getTranslations } from '../lib/i18n';

const t = getTranslations();

// ============ BASE LAYOUT ============

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  structuredData?: object;
}

export const BaseLayout: FC<PropsWithChildren<SEOProps>> = ({ children, title, description, canonical, ogImage, ogType, noindex, structuredData }) => {
  const pageTitle = title || t.common.site_title;
  const pageDescription = description || t.common.site_description;
  const pageOgImage = ogImage || '/images/hero.png';
  
  // Local Business structured data (default for all pages)
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "name": "Studio Natali",
    "description": pageDescription,
    "url": "https://studionatali-ricany.cz",
    "telephone": "+420774889606",
    "email": "info@studionatali-ricany.cz",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Černokostelecká 80/42",
      "addressLocality": "Říčany",
      "postalCode": "251 01",
      "addressRegion": "Středočeský kraj",
      "addressCountry": "CZ"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 49.99999,
      "longitude": 14.66476
    },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "08:30", "closes": "18:00" }
    ],
    "image": "https://studionatali-ricany.cz/images/hero.png",
    "priceRange": "$$",
    "sameAs": [
      "https://www.facebook.com/StudioNatali",
      "https://instagram.com/studionatali"
    ],
    "areaServed": {
      "@type": "City",
      "name": "Říčany"
    }
  };

  return (
    <html lang="cs">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
        {canonical && <link rel="canonical" href={canonical} />}
        
        {/* OpenGraph / SEO */}
        <meta property="og:type" content={ogType || "website"} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageOgImage} />
        <meta property="og:url" content={canonical || "https://studionatali-ricany.cz"} />
        <meta property="og:locale" content="cs_CZ" />
        <meta property="og:site_name" content="Studio Natali" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageOgImage} />
        
        {/* Additional SEO meta tags */}
        <meta name="author" content="Studio Natali" />
        <meta name="geo.region" content="CZ-20" />
        <meta name="geo.placename" content="Říčany" />
        <meta name="geo.position" content="49.99999;14.66476" />
        <meta name="ICBM" content="49.99999, 14.66476" />
        <meta name="theme-color" content="#b8936a" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)" />
        
        {/* Structured Data (JSON-LD) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData || localBusinessSchema) }} />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        
        {/* HTMX - loaded async for perf */}
        <script src="https://unpkg.com/htmx.org@2.0.0" defer></script>
        
        {/* Tailwind CSS (compiled) */}
        <link rel="stylesheet" href="/styles.css" />
        
        {/* Custom Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-primary: #b8936a;
            --color-primary-dark: #8a654b;
            --color-text: #262626;
            --color-text-light: #404040;
            --color-text-muted: #525252;
            --color-bg-base: #f8f4ef;
            --color-bg-card: #fdf9f4;
            --color-bg-secondary: #f5efe7;
            --color-border: #e8dfd4;
          }
          
          @media (prefers-color-scheme: dark) {
            :root {
              --color-primary: #dcc9ad;
              --color-primary-dark: #b8936a;
              --color-text: #f5f5f5;
              --color-text-light: #d4d4d4;
              --color-text-muted: #b5b5b5;
              --color-bg-base: #171717;
              --color-bg-card: #262626;
              --color-bg-secondary: #0a0a0a;
              --color-border: #404040;
            }
          }
          
          html { 
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
          body { 
            font-family: 'Nunito Sans', system-ui, sans-serif;
            color: var(--color-text);
            background-color: var(--color-bg-base);
            overflow-x: hidden;
            text-rendering: optimizeSpeed;
          }
          
          /* GPU-accelerated scrolling for sections */
          .section {
            content-visibility: auto;
            contain-intrinsic-size: auto 600px;
          }
          h1, h2, h3, h4, h5, h6 { 
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-weight: 500;
          }
          
          .btn { 
            display: inline-flex; align-items: center; justify-content: center;
            padding: 0.75rem 1.5rem; font-weight: 500; border-radius: 0.5rem;
            transition: all 0.2s; cursor: pointer;
          }
          .btn-primary { 
            background: #171717; color: white; 
          }
          .btn-primary:hover { background: #262626; }
          @media (prefers-color-scheme: dark) {
            .btn-primary { background: #b8936a; color: #171717; font-weight: 700; }
            .btn-primary:hover { background: #c9ac86; }
          }
          .btn-outline {
            background: transparent; color: #171717; border: 1px solid #171717;
          }
          .btn-outline:hover { background: #171717; color: white; }
          @media (prefers-color-scheme: dark) {
            .btn-outline { color: #dcc9ad; border-color: #dcc9ad; }
            .btn-outline:hover { background: #dcc9ad; color: #171717; }
          }
          
          .btn-cta {
            position: relative;
            animation: btnGlow 2s ease-in-out infinite;
          }
          .btn-cta:disabled {
            animation: none;
          }
          @keyframes btnGlow {
            0%, 100% { box-shadow: 0 0 4px rgba(184,147,106,0.3), 0 0 8px rgba(184,147,106,0.15); }
            50% { box-shadow: 0 0 8px rgba(184,147,106,0.6), 0 0 20px rgba(184,147,106,0.3), 0 0 30px rgba(184,147,106,0.1); }
          }
          
          .section { padding: 4rem 0; background-color: var(--color-bg-base); }
          .section:nth-child(even) { background-color: var(--color-bg-secondary); }
          .section-title { 
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 2rem; line-height: 2.5rem; margin-bottom: 1rem;
            color: var(--color-text);
          }
          @media (min-width: 768px) {
            .section-title { font-size: 2.5rem; line-height: 3rem; }
          }
          .section-subtitle { 
            font-size: 1.125rem; max-width: 42rem; color: var(--color-text-light);
          }
          
          .card {
            border-radius: 1rem; background: var(--color-bg-card);
            border: 1px solid rgba(184, 147, 106, 0.12);
            box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease-out;
            transform: translateZ(0);
          }
          .card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06);
          }
          
          .form-input {
            width: 100%; padding: 0.625rem 1rem;
            border: 1px solid var(--color-border); border-radius: 0.5rem;
            background: var(--color-bg-card); color: var(--color-text);
            transition: all 0.2s;
          }
          .form-input:focus {
            outline: none; border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(184, 147, 106, 0.2);
          }
          input[type="time"].form-input {
            padding: 0.5rem 0.5rem 0.5rem 0.75rem;
            letter-spacing: 0.5px;
          }
          input[type="time"]::-webkit-calendar-picker-indicator {
            width: 14px;
            height: 14px;
            margin-left: 8px;
            opacity: 0.6;
            cursor: pointer;
          }
          /* Custom checkbox styles */
          .custom-checkbox {
            appearance: none;
            -webkit-appearance: none;
            width: 1.25rem;
            height: 1.25rem;
            border: 2px solid var(--color-border);
            border-radius: 0.375rem;
            background: var(--color-bg-card);
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
          }
          .custom-checkbox:checked {
            background: var(--color-primary);
            border-color: var(--color-primary);
          }
          .custom-checkbox:checked::after {
            content: '';
            position: absolute;
            left: 5px;
            top: 2px;
            width: 5px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }
          .custom-checkbox:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .time-slot {
            width: 100%; height: 3rem; padding: 0.5rem;
            border: 1px solid var(--color-border); border-radius: 0.5rem;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.875rem; font-weight: 500; cursor: pointer;
            background: var(--color-bg-card); color: var(--color-text);
            transition: all 0.2s;
          }
          .time-slot:hover { border-color: var(--color-primary); background: #f5f0e8; }
          .time-slot.selected { 
            background: #a67d5a; color: white; border-color: #a67d5a;
          }
          @media (prefers-color-scheme: dark) {
            .time-slot:hover { background: #33241c; }
            .time-slot.selected { background: #b8936a; border-color: #b8936a; }
          }
          
          .calendar-day {
            width: 2.5rem; height: 2.5rem;
            display: flex; align-items: center; justify-content: center;
            border-radius: 9999px; font-size: 0.875rem;
            cursor: pointer; transition: all 0.2s;
          }
          .calendar-day:hover { background: #f5f0e8; }
          .calendar-day.selected { background: #a67d5a; color: white; }
          .calendar-day.disabled { color: #a3a3a3; cursor: not-allowed; }
          .calendar-day.today { border: 2px solid #b8936a; }
          .calendar-day.available { border: 1px solid rgba(184,147,106,0.5); background: rgba(184,147,106,0.12); color: #5f4639; }
          .calendar-day.available:hover { background: rgba(184,147,106,0.2); }
          
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
          
          .opacity-0 { opacity: 0; }
          .opacity-100 { opacity: 1; }
          
          .animate-on-scroll {
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.6s ease-out, transform 0.6s ease-out;
          }
          .animate-on-scroll.will-animate {
            will-change: opacity, transform;
          }
          .animate-on-scroll.is-visible {
            opacity: 1;
            transform: translateY(0);
            will-change: auto;
          }
          
          /* Reduce motion for users who prefer it */
          @media (prefers-reduced-motion: reduce) {
            html { scroll-behavior: auto; }
            .animate-on-scroll { transition: none; opacity: 1; transform: none; }
            .animate-fade-in { animation: none; opacity: 1; }
            .btn-cta { animation: none; }
          }
          
          /* Optimize fixed header backdrop for scroll perf */
          .header-blur {
            -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          .htmx-request .htmx-indicator { display: inline-block !important; }
          .htmx-indicator { display: none; }

          /* Blob Masks */
          .blob-mask-1 { clip-path: polygon(8% 5%, 20% 2%, 35% 0%, 50% 3%, 65% 1%, 80% 4%, 92% 8%, 97% 20%, 100% 35%, 98% 50%, 100% 65%, 96% 80%, 90% 92%, 80% 97%, 65% 100%, 50% 98%, 35% 100%, 20% 96%, 8% 90%, 3% 78%, 0% 65%, 2% 50%, 0% 35%, 4% 20%); }
          .blob-mask-2 { clip-path: polygon(10% 0%, 25% 3%, 40% 0%, 55% 4%, 70% 0%, 85% 5%, 95% 12%, 100% 28%, 97% 45%, 100% 60%, 95% 75%, 100% 90%, 90% 100%, 75% 97%, 60% 100%, 45% 96%, 30% 100%, 15% 95%, 5% 88%, 0% 72%, 5% 55%, 0% 40%, 5% 25%, 0% 12%); }
          .blob-mask-3 { clip-path: polygon(5% 8%, 18% 0%, 32% 5%, 48% 0%, 62% 6%, 78% 0%, 92% 10%, 100% 25%, 95% 42%, 100% 58%, 94% 75%, 100% 90%, 88% 100%, 72% 95%, 55% 100%, 40% 94%, 25% 100%, 10% 92%, 0% 78%, 6% 60%, 0% 45%, 8% 28%); }
          
          .blob-frame { position: relative; }
          .blob-frame::before {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(135deg, rgba(184, 147, 106, 0.2) 0%, transparent 50%);
            pointer-events: none; z-index: 1;
          }
          .blob-frame::after {
            content: ''; position: absolute; inset: 0;
            box-shadow: inset 0 0 30px rgba(0,0,0,0.15);
            pointer-events: none; z-index: 2;
          }
          .blob-frame.no-overlay::before,
          .blob-frame.no-overlay::after {
            content: none;
            display: none;
          }

          .legal-content {
            font-size: 1.05rem;
            line-height: 1.75;
          }
          .legal-content h2 {
            font-size: 1.35rem;
            line-height: 1.6;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            color: var(--color-text);
          }
          .legal-content p { margin: 0.5rem 0; }
          .legal-content ul { margin: 0.5rem 0 0.5rem 1.25rem; list-style: disc; }
          .legal-card {
            border-radius: 1rem;
            background: var(--color-bg-card);
            border: 1px solid var(--color-border);
            padding: 2rem;
            box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          }
        `}} />
        
        {/* Lucide Icons - self-hosted subset (49 icons, ~9KB) */}
        <script src="/lucide-icons.js" defer></script>
      </head>
      <body class="antialiased">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          // Wait for lucide to load (deferred)
          function initLucide() {
            if (typeof lucide !== 'undefined') {
              lucide.createIcons();
            } else {
              requestAnimationFrame(initLucide);
            }
          }
          
          document.addEventListener('DOMContentLoaded', () => {
            initLucide();
            
            // Intersection Observer for scroll animations
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  // Add will-change just before animation, remove after
                  entry.target.classList.add('will-animate');
                  requestAnimationFrame(() => {
                    entry.target.classList.add('is-visible');
                    // Clean up will-change after transition
                    entry.target.addEventListener('transitionend', () => {
                      entry.target.classList.remove('will-animate');
                    }, { once: true });
                  });
                  observer.unobserve(entry.target);
                }
              });
            }, {
              threshold: 0.1,
              rootMargin: '0px 0px -50px 0px'
            });
            
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
              observer.observe(el);
            });
            
            // Optimize header on scroll - throttle with rAF
            let ticking = false;
            const header = document.querySelector('header.fixed');
            if (header) {
              window.addEventListener('scroll', () => {
                if (!ticking) {
                  requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    if (scrollY > 10) {
                      header.classList.add('shadow-sm');
                    } else {
                      header.classList.remove('shadow-sm');
                    }
                    ticking = false;
                  });
                  ticking = true;
                }
              }, { passive: true });
            }
          });
        ` }} />
      </body>
    </html>
  );
};

// ============ HEADER ============

export const Header: FC<{ showGalleryLink?: boolean }> = ({ showGalleryLink = true }) => {
  const navItems = [
    { name: t.common.home, href: '/#home' },
    { name: t.common.services, href: '/#sluzby' },
    ...(showGalleryLink ? [{ name: t.common.gallery, href: '/#galerie' }] : []),
    { name: t.common.contact, href: '/#kontakt' },
  ];
  
  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 header-blur shadow-sm" role="banner">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Hlavní navigace">
        <div class="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" class="flex items-center" aria-label="Studio Natali – domovská stránka">
            <img src="/logo.svg" alt={t.common.site_name} class="h-14 w-auto" width="56" height="56" />
          </a>
          
          {/* Desktop Nav */}
          <div class="hidden md:flex items-center space-x-8">
            {navItems.map(item => (
              <a href={item.href} class="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium transition-colors">
                {item.name}
              </a>
            ))}
          </div>
          
          {/* CTA */}
          <div class="hidden md:flex items-center gap-4">
            <a href="/rezervace" class="btn btn-primary flex items-center gap-2">
              <i data-lucide="calendar" class="w-4 h-4"></i>
              {t.common.book_now}
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            type="button" 
            class="md:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Otevřít menu"
            aria-expanded="false"
            aria-controls="mobile-menu"
            onclick="const m=document.getElementById('mobile-menu');const open=!m.classList.contains('hidden');m.classList.toggle('hidden');this.setAttribute('aria-expanded',!open);this.querySelector('i').setAttribute('data-lucide',open?'menu':'x');lucide.createIcons()"
          >
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      <div id="mobile-menu" class="hidden md:hidden bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700" role="navigation" aria-label="Mobilní navigace">
        <div class="px-4 py-4 space-y-1">
          {navItems.map(item => (
            <a href={item.href} class="block px-3 py-2.5 rounded-lg text-lg text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" onclick="document.getElementById('mobile-menu').classList.add('hidden')">
              {item.name}
            </a>
          ))}
          <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700 mt-2">
            <a href="/rezervace" class="btn btn-primary w-full justify-center">
              {t.common.book_now}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

// ============ FOOTER ============

export const Footer: FC<{ showGalleryLink?: boolean }> = ({ showGalleryLink = true }) => {
  const year = new Date().getFullYear();
  
  return (
    <footer class="bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <a href="/" class="inline-block mb-6">
              <img src="/logo.svg" alt={t.common.site_name} class="h-12 w-auto dark:hidden" />
              <img src="/logo-white.svg" alt={t.common.site_name} class="h-12 w-auto hidden dark:block" />
            </a>
            <p class="text-neutral-600 dark:text-neutral-300 mb-6">
              {t.footer.description}
            </p>
            <div class="flex space-x-4">
              <a href="https://www.facebook.com/StudioNatali" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors" aria-label="Facebook Studio Natali">
                <i data-lucide="facebook" class="w-5 h-5"></i>
              </a>
              <a href="https://instagram.com/studionatali" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-colors" aria-label="Instagram Studio Natali">
                <i data-lucide="instagram" class="w-5 h-5"></i>
              </a>
            </div>
          </div>
          
          {/* Navigation */}
          <div>
            <h3 class="text-lg font-semibold mb-6 text-neutral-900 dark:text-white">{t.footer.navigation}</h3>
            <ul class="space-y-3">
              <li><a href="/" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">{t.common.home}</a></li>
              <li><a href="/#sluzby" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">{t.common.services}</a></li>
              {showGalleryLink && (
                <li><a href="/#galerie" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">{t.common.gallery}</a></li>
              )}
              <li><a href="/#kontakt" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">{t.common.contact}</a></li>
              <li><a href="/rezervace" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">{t.common.reservation}</a></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 class="text-lg font-semibold mb-6 text-neutral-900 dark:text-white">{t.footer.contact}</h3>
            <ul class="space-y-4">
              <li class="flex items-start gap-3">
                <i data-lucide="map-pin" class="w-5 h-5 text-primary-500 mt-0.5"></i>
                <span class="text-neutral-600 dark:text-neutral-300">{t.contact.address_line1}<br />{t.contact.address_line2}</span>
              </li>
              <li class="flex items-center gap-3">
                <i data-lucide="phone" class="w-5 h-5 text-primary-500"></i>
                <a href="tel:+420774889606" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">+420 774 889 606</a>
              </li>
              <li class="flex items-center gap-3">
                <i data-lucide="mail" class="w-5 h-5 text-primary-500"></i>
                <a href="mailto:info@studionatali-ricany.cz" class="text-neutral-600 dark:text-neutral-300 hover:text-primary-600">info@studionatali-ricany.cz</a>
              </li>
            </ul>
          </div>
          
          {/* Hours */}
          <div>
            <h3 class="text-lg font-semibold mb-6 text-neutral-900 dark:text-white">{t.footer.hours}</h3>
            <div class="flex items-start gap-3">
              <i data-lucide="clock" class="w-5 h-5 text-primary-500 mt-0.5"></i>
              <div class="text-neutral-600 dark:text-neutral-300">
                <p>{t.contact.hours_weekdays}</p>
                <p>{t.contact.hours_weekend}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom */}
      <div class="border-t border-neutral-200 dark:border-neutral-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex flex-col md:flex-row items-center justify-between gap-4">
            <p class="text-neutral-500 text-sm">© {year} Studio Natali. {t.footer.rights}</p>
            <div class="flex items-center gap-6 text-sm">
              <a href="/zpracovani-udaju" class="text-neutral-500 hover:text-primary-600">{t.footer.privacy}</a>
              <a href="/obchodni-podminky" class="text-neutral-500 hover:text-primary-600">{t.footer.terms}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============ SITE LAYOUT ============

export const SiteLayout: FC<PropsWithChildren<SEOProps & { showGalleryLink?: boolean }>> = ({ children, showGalleryLink = true, ...seoProps }) => {
  return (
    <BaseLayout {...seoProps}>
      <Header showGalleryLink={showGalleryLink} />
      <main class="min-h-screen pt-20">
        {children}
      </main>
      <Footer showGalleryLink={showGalleryLink} />
    </BaseLayout>
  );
};
