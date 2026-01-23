# Placeholder Assety - Studio Natali

Tento soubor obsahuje popis placeholder assetů, které je třeba nahradit skutečnými obrázky.

## 📁 Struktura složek

```
public/
├── images/
│   ├── logo.svg           # Logo salonu (SVG)
│   ├── logo-white.svg     # Bílá verze loga
│   ├── hero.jpg           # Hlavní hero obrázek
│   ├── about.jpg          # Obrázek pro sekci O nás
│   ├── og-image.jpg       # Open Graph obrázek (1200x630px)
│   ├── favicon.ico        # Favicon
│   ├── services/          # Obrázky pro služby
│   │   ├── strih.jpg
│   │   ├── barva.jpg
│   │   ├── pece.jpg
│   │   └── styling.jpg
│   └── gallery/           # Galerie fotek
│       ├── 1.jpg
│       ├── 2.jpg
│       └── ...
```

## 🖼️ Specifikace jednotlivých assetů

### Logo (`logo.svg`, `logo-white.svg`)
- **Formát**: SVG (vektorový)
- **Rozměry**: flexibilní, doporučeno max 200x60px
- **Styl**: Minimalistický, elegantní font
- **Text**: "STUDIO Natali" nebo samotné logo

### Hero Image (`hero.jpg`)
- **Rozměry**: min. 1920x1080px
- **Poměr stran**: 16:9 nebo 4:5
- **Obsah**: Profesionální fotka kadeřnice při práci, nebo detail účesu
- **Styl**: Světlé, přirozené osvětlení, teplé tóny

### About Image (`about.jpg`)
- **Rozměry**: min. 1200x900px
- **Poměr stran**: 4:3
- **Obsah**: Interiér salonu nebo týmová fotka
- **Styl**: Příjemný, profesionální, ukazující prostředí

### Open Graph Image (`og-image.jpg`)
- **Rozměry**: přesně 1200x630px
- **Obsah**: Logo + krátký text nebo hero obrázek s logem
- **Použití**: Sdílení na sociálních sítích

    ### Service Images (`services/*.jpg`)
    - **Rozměry**: min. 800x600px
    - **Poměr stran**: 4:3
    - **Obsah**:
    - `strih.jpg` - Střih vlasů, nůžky v akci
    - `barva.jpg` - Barvení vlasů, štětec s barvou
    - `pece.jpg` - Péče o vlasy, maska na vlasy
    - `styling.jpg` - Styling, žehlení nebo kulma

### Gallery Images (`gallery/*.jpg`)
- **Rozměry**: min. 800x800px
- **Poměr stran**: 1:1 (čtverec) doporučeno
- **Obsah**: Hotové účesy, before/after, detaily práce
- **Počet**: 8-16 obrázků pro začátek
- **Styl**: Konzistentní osvětlení a úprava

## 🎨 Doporučená barevná paleta

```css
/* Hlavní barvy */
--primary-500: #b8936a;  /* Zlatavě béžová */
--primary-600: #a67d5a;  /* Tmavší béžová */
--primary-700: #8a654b;  /* Hnědá */

/* Neutrální */
--neutral-900: #171717;  /* Téměř černá */
--neutral-600: #525252;  /* Šedá */
--neutral-100: #f5f5f5;  /* Světle šedá */

/* Akcent */
--accent-cream: #f8f4ef; /* Krémová */
--accent-beige: #e8dfd4; /* Béžová */
```

## 📷 Doporučení pro fotografie

1. **Osvětlení**: Přirozené denní světlo, měkké stíny
2. **Pozadí**: Čisté, neutrální, nejlépe interiér salonu
3. **Modely**: Profesionální vzhled, úsměv, pohled do kamery
4. **Úpravy**: Mírná korekce barev, zachovat přirozený vzhled
5. **Kvalita**: Min. 72 DPI pro web, doporučeno 150 DPI

## 🔧 Nástroje pro generování

### Doporučené AI nástroje:
- **Midjourney** - Pro vysoce kvalitní fotky
- **DALL-E 3** - Pro specifické koncepty
- **Stable Diffusion** - Pro lokální generování

### Příklady promptů:

**Hero image:**
```
Professional hairdresser salon, elegant woman with beautiful wavy hair, 
soft natural lighting, minimalist beige interior, warm tones, 
high quality photography, 8k
```

**Gallery image:**
```
Before and after hair transformation, professional salon lighting, 
beautiful styled hair, elegant, high fashion editorial style
```

## ✅ Checklist před spuštěním

- [ ] Logo ve formátu SVG
- [ ] Hero obrázek (min. 1920x1080)
- [ ] About obrázek
- [ ] 4 obrázky pro služby
- [ ] Min. 8 obrázků do galerie
- [ ] Open Graph obrázek (1200x630)
- [ ] Favicon

## 📝 Poznámky

- Všechny obrázky optimalizovat pro web (WebP formát je doporučen)
- Použít lazy loading pro galerii
- Zajistit alternativní texty (alt) pro všechny obrázky
- Respektovat autorská práva u všech použitých fotografií
