# Navigation & Gallery UI Overhaul — Design Spec

**Date:** 2026-04-12  
**Status:** Approved  
**Scope:** Nav component, gallery index page, album page, collection page

---

## Overview

Overhaul the navigation structure and gallery UI of pasqualo.to. The direction is **B+C Measured**: structured nav that always communicates location, combined with immersive photo-first layouts. Photos dominate; chrome recedes. Dark, calm tone preserved throughout.

---

## 1. Navigation

### Behavior

The nav left side is dynamic — it morphs based on depth. The right side (section links) stays constant.

| Route depth | Left side | Right side |
|---|---|---|
| Homepage (`/`) | `pasqualo.to` (logo only) | Links, active underlined |
| Section root (`/projects`) | `pasqualo.to / Projects` | Links, active underlined |
| Deep page (`/gallery/pb-inca`) | `pasqualo.to / Gallery / Inca Trail` | Links, active underlined |

### Breadcrumb rules

- Logo (`pasqualo.to`) is always a link to `/`
- Intermediate segments (e.g. `Gallery`) are links to their respective section root
- Final segment (current page title) is plain text, not a link
- Separator is `/` in a very dark colour (`#2d2d2d`) — visually recessive
- Intermediate segments use `color: #555`; final segment uses `color: #ccc`
- The active section link on the right is still underlined even when the breadcrumb is showing

### Typography

- Logo: `font-size: 11px`, `letter-spacing: 0.15em`, `text-transform: uppercase`, `color: #fff`
- Breadcrumb segments: `font-size: 11px`, no uppercase
- Nav links: `font-size: 11px`, active = `color: #fff` + `border-bottom: 1px solid #fff`, inactive = `color: #444`

### Mobile

The inline breadcrumb is dropped on mobile (too narrow). The hamburger menu opens a full-width panel with the same links. Context on mobile is handled by the page header (title + back link), not the nav.

Mobile nav panel:
- Closed: logo left, 3-line hamburger right
- Open: logo left, `✕` right; links stacked vertically with larger font (`13px`); active link underlined

### Implementation

- Modify `src/components/Nav.astro` to accept optional `breadcrumbs` prop: `{ label: string; href?: string }[]`
- When `breadcrumbs` is provided and non-empty, render the inline breadcrumb path on the left instead of logo-only
- Pass breadcrumbs from each layout/page via `BaseLayout` or directly where needed
- `BaseLayout.astro` passes no breadcrumbs by default (homepage state)
- Individual pages (album, collection) pass their breadcrumb array

---

## 2. Gallery Index (Homepage)

### Layout

Pure CSS columns masonry — covers displayed at their natural aspect ratios. No fixed grid, no featured slot, no manual curation required.

- Desktop (`md+`): `columns: 3`, `gap: 6px`
- Mobile (`sm`): `columns: 2`, `gap: 4px`
- Each card: `break-inside: avoid`, `margin-bottom` matching the gap

### Card design

- **Default state**: image only, no visible text
- **Hover state**: gradient fades in from bottom (`rgba(0,0,0,0.75)` → transparent over ~55% of height); title and meta slide up from below
  - Title: `font-size: 13px`, `font-weight: 500`, `color: #fff`
  - Meta (location · year): `font-size: 11px`, `color: #aaa`, `letter-spacing: 0.05em`, `text-transform: uppercase`
- **Mobile**: titles and meta always visible (no hover on touch devices). Use `@media (hover: none)` to keep overlay permanently visible on touch.
- Transition: `opacity` and `transform` on the overlay and text, `duration: 200ms`, `ease`

### Badges

- **Protected albums**: lock icon `position: absolute; bottom: 8px; left: 8px` — shown in overlay, visible on hover (always visible on mobile)
- **Collections**: `"collection"` label `position: absolute; bottom: 8px; right: 8px` — same visibility rule as lock

### Implementation

- Rewrite `src/pages/index.astro` grid section
- Replace `aspect-[4/3]` fixed-ratio cards with natural-height images (`width: 100%; height: auto; display: block`)
- Remove the `<div class="px-3 py-3">` metadata block below each card — metadata moves into the overlay
- The `<a>` card wrapper becomes `position: relative; overflow: hidden; cursor: pointer`
- Gradient overlay and text are absolutely positioned children inside the card

---

## 3. Album Page

### Layout

Replace the sticky preview + horizontal thumb strip with a masonry grid of all photos. Album header (title, meta) sits above the grid and does not scroll away.

- **Header**: `<h1>` title (`font-size: 22px`, `font-weight: 500`, `color: #fff`) + meta line (`location · year · N photos`, `font-size: 12px`, `color: #555`)
- **Grid**: CSS columns masonry, same column counts as index (3-col desktop, 2-col mobile)
- Each photo: `cursor: zoom-in` on hover; clicking opens the lightbox

### Lightbox

Full-screen black overlay (`background: #000` or `rgba(0,0,0,0.97)`):

| Element | Position | Style |
|---|---|---|
| Counter (`8 / 24`) | Top-left | `font-size: 11px`, `color: #444` |
| Close `✕` | Top-right | `font-size: 18px`, `color: #666`, hover `#fff` |
| Prev `‹` | Left center | `font-size: 28px`, `color: #333`, hover `#fff` |
| Next `›` | Right center | `font-size: 28px`, `color: #333`, hover `#fff` |
| Photo | Center | `max-height: 90vh; max-width: 90vw; object-fit: contain` |

Navigation:
- `←` / `→` keyboard arrow keys
- Click prev/next buttons
- Swipe left/right on mobile
- `Esc` or click outside photo area to close

### Protected albums

Preview photos (first `previewCount` entries) render in the masonry grid normally.

Locked photos are rendered behind a password gate overlay:
- The locked portion of the grid is blurred (`filter: blur(3px)`) and dimmed (`opacity: 0.3`) behind the gate
- Gate: centred card with `border: 1px solid #222`, count message, password input, Unlock button
- On successful unlock: gate fades out, full photo list loads (via existing `/api/albums/[slug]/photos` endpoint), locked photos render into the masonry grid

### Breadcrumb

Nav receives breadcrumbs from the album page. Note: the gallery root is the homepage (`/`), not `/gallery`.
- For a top-level album: `[{ label: 'Gallery', href: '/' }]`
- For a collection child album: `[{ label: 'Gallery', href: '/' }, { label: 'Collection Name', href: '/gallery/collection-slug' }]`

### Implementation

- Rewrite `src/components/gallery/AlbumPage.astro`
- Remove sticky preview div, thumb strip, `#preview-img`, `#preview-btn`, `#preview-prev/next`, `#thumb-strip`, `#photo-count`
- Replace with masonry grid (same CSS pattern as index); each `<img>` gets `data-src`, `data-alt`, `data-index` attributes
- **Rewrite `public/scripts/gallery.js`** — the existing script is tightly coupled to removed elements (`#preview-img`, `#preview-btn`, `#thumb-strip`). New script: build `allPhotos[]` from masonry grid images, open lightbox on any grid photo click, keep lightbox navigation / swipe / keyboard / password gate logic
- Pass breadcrumbs to `Nav` via `BaseLayout` props or a new layout slot

---

## 4. Collection Page

No structural changes to `CollectionPage.astro` beyond:
- Apply same masonry grid to child album cards (replacing the current fixed `aspect-[4/3]` grid)
- Apply same hover overlay / title treatment as the index
- Pass breadcrumbs to nav

---

## 5. What Is Not Changing

- Design tokens (`--color-bg`, `--color-surface`, etc.) — unchanged
- `BaseLayout.astro` structure (head, footer) — only nav props added
- API routes, auth, JWT logic — untouched
- `src/lib/photos.ts` URL helpers — untouched
- Blog, notes, projects pages — untouched
- `.gitignore`, content collections, R2 bucket separation — untouched

---

## 6. Files to Modify

| File | Change |
|---|---|
| `src/components/Nav.astro` | Add `breadcrumbs` prop; render inline breadcrumb path on left |
| `src/layouts/BaseLayout.astro` | Pass `breadcrumbs` prop through to `Nav` |
| `src/pages/index.astro` | Rewrite grid: CSS columns masonry, overlay titles, natural aspect ratios |
| `src/components/gallery/AlbumPage.astro` | Replace sticky preview + thumbstrip with masonry grid; update lightbox trigger |
| `src/components/gallery/CollectionPage.astro` | Apply masonry grid + overlay treatment to child cards |
| `src/components/gallery/Breadcrumbs.astro` | Remove — breadcrumb moves into Nav |
| `src/pages/gallery/[...slug].astro` | Pass breadcrumbs array to layout |
| `public/scripts/gallery.js` | Rewrite — remove preview/thumbstrip coupling; build photo list from masonry grid; open lightbox on grid click |

---

## 7. Out of Scope

- Typography overhaul (system-ui stays)
- Dark/light mode toggle
- Infinite scroll or pagination
- Image lazy-loading strategy changes (existing `loading="lazy"` stays)
- Any backend / API changes
