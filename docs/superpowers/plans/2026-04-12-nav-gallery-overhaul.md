# Nav & Gallery UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing nav (logo-only left side, fixed `aspect-[4/3]` gallery cards) with an inline breadcrumb nav and CSS-columns masonry galleries with hover overlay titles.

**Architecture:** Nav gains a `breadcrumbs` prop that BaseLayout threads through; breadcrumbs are already built in `[...slug].astro` and need only to be forwarded. Gallery components swap fixed-ratio grids for `columns-2 md:columns-3` CSS masonry with gradient overlay titles. The album page drops the sticky-preview + thumbstrip entirely; `gallery.js` is rewritten from scratch to collect photos from the masonry grid and open the existing lightbox.

**Tech Stack:** Astro 6, Tailwind CSS v4 (CSS-first, no `tailwind.config.js`), vanilla JS (CSP-safe, no inline handlers), existing lightbox + password gate logic retained.

**Dev server:** `npm run dev` at `localhost:4321`. Node PATH may need `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"`.

---

## File Map

| File | Action | Responsibility after change |
|---|---|---|
| `src/components/Nav.astro` | Modify | Accepts `breadcrumbs` prop; renders inline breadcrumb path on left; active-link underline |
| `src/layouts/BaseLayout.astro` | Modify | Accepts + passes `breadcrumbs` prop to Nav |
| `src/pages/gallery/[...slug].astro` | Modify | Passes breadcrumbs to BaseLayout; removes breadcrumbs prop from child component calls |
| `src/pages/index.astro` | Modify | CSS columns masonry; hover-reveal gradient overlay; natural aspect ratios |
| `src/components/gallery/CollectionPage.astro` | Modify | CSS columns masonry + overlay; removes Breadcrumbs usage |
| `src/components/gallery/AlbumPage.astro` | Modify | Masonry grid of all photos; removes sticky preview + thumbstrip + Breadcrumbs |
| `src/components/gallery/AllPage.astro` | Modify | Removes Breadcrumbs import/usage only; grid unchanged |
| `public/scripts/gallery.js` | Rewrite | Reads photos from masonry grid; click-to-lightbox; keeps lightbox nav, swipe, keyboard, password gate |
| `src/components/gallery/Breadcrumbs.astro` | Delete | Replaced by inline Nav breadcrumb |

---

## Task 1: Update Nav to render inline breadcrumbs

**Files:**
- Modify: `src/components/Nav.astro`

- [ ] **Step 1: Replace Nav.astro with the breadcrumb-aware version**

Replace the entire file content:

```astro
---
import { SITE_NAME, SHOW_BLOG, SHOW_NOTES } from '../config';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  breadcrumbs?: Crumb[];
}

const { breadcrumbs = [] } = Astro.props;

const links = [
  { href: '/', label: 'Gallery' },
  ...(SHOW_BLOG ? [{ href: '/blog', label: 'Blog' }] : []),
  ...(SHOW_NOTES ? [{ href: '/notes', label: 'Notes' }] : []),
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
];

const currentPath = Astro.url.pathname;

function isActive(href: string, label: string): boolean {
  if (label === 'Gallery') {
    return currentPath === '/' || currentPath.startsWith('/gallery');
  }
  return currentPath === href || (href !== '/' && currentPath.startsWith(href));
}
---

<nav class="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] relative">
  <!-- Left: logo, or logo + inline breadcrumb path -->
  <div class="flex items-center gap-2 min-w-0 flex-1 mr-8 overflow-hidden">
    <a
      href="/"
      class="text-xs font-medium tracking-widest uppercase text-[var(--color-accent)] hover:opacity-70 transition-opacity whitespace-nowrap shrink-0"
    >
      {SITE_NAME}
    </a>
    {breadcrumbs.map((crumb, i) => {
      const isLast = i === breadcrumbs.length - 1;
      return (
        <>
          <span class="text-[#2d2d2d] text-xs shrink-0 hidden sm:inline">/</span>
          {isLast ? (
            <span class="text-xs text-[#ccc] whitespace-nowrap overflow-hidden text-ellipsis hidden sm:inline">
              {crumb.label}
            </span>
          ) : (
            <a
              href={crumb.href}
              class="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors whitespace-nowrap shrink-0 hidden sm:inline"
            >
              {crumb.label}
            </a>
          )}
        </>
      );
    })}
  </div>

  <!-- Desktop links -->
  <ul class="hidden sm:flex gap-6 shrink-0">
    {links.map(({ href, label }) => (
      <li>
        <a
          href={href}
          class:list={[
            'text-xs transition-colors whitespace-nowrap',
            isActive(href, label)
              ? 'text-[var(--color-accent)] border-b border-[var(--color-accent)] pb-0.5'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
          ]}
        >
          {label}
        </a>
      </li>
    ))}
  </ul>

  <!-- Mobile hamburger -->
  <button
    id="nav-toggle"
    class="sm:hidden flex flex-col gap-1.5 p-1 shrink-0"
    aria-label="Toggle menu"
    aria-expanded="false"
  >
    <span class="block w-5 h-px bg-[var(--color-text)] transition-all"></span>
    <span class="block w-5 h-px bg-[var(--color-text)] transition-all"></span>
    <span class="block w-5 h-px bg-[var(--color-text)] transition-all"></span>
  </button>
</nav>

<!-- Mobile menu panel -->
<div
  id="nav-menu"
  class="hidden sm:hidden border-b border-[var(--color-border)] bg-[var(--color-bg)]"
>
  <ul class="flex flex-col px-6 py-4 gap-4">
    {links.map(({ href, label }) => (
      <li>
        <a
          href={href}
          class:list={[
            'text-sm transition-colors',
            isActive(href, label)
              ? 'text-[var(--color-accent)] border-b border-[var(--color-accent)] pb-0.5'
              : 'text-[var(--color-muted)]',
          ]}
        >
          {label}
        </a>
      </li>
    ))}
  </ul>
</div>

<script>
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  toggle?.addEventListener('click', () => {
    const isOpen = !menu?.classList.contains('hidden');
    menu?.classList.toggle('hidden', isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });
</script>
```

- [ ] **Step 2: Verify nav renders at localhost:4321**

Open `http://localhost:4321`. Nav should show `pasqualo.to` on the left, `Gallery` underlined on the right. No visual change yet (no breadcrumbs passed).

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.astro
git commit -m "feat: add breadcrumbs prop to Nav with inline path rendering"
```

---

## Task 2: Thread breadcrumbs through BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add breadcrumbs prop to BaseLayout**

Replace the `Props` interface and `Nav` usage in `src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import { SITE_NAME, SITE_DESCRIPTION } from '../config';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  breadcrumbs?: Crumb[];
}

const { title, description = SITE_DESCRIPTION, ogImage, breadcrumbs } = Astro.props;
const pageTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
const canonicalURL = new URL(Astro.url.pathname, Astro.site ?? Astro.url.origin);
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content={Astro.generator} />
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalURL} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={description} />
    {ogImage && <meta property="og:image" content={ogImage} />}

    <title>{pageTitle}</title>
  </head>
  <body class="flex flex-col min-h-screen">
    <Nav breadcrumbs={breadcrumbs} />
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t border-[var(--color-border)] mt-24 py-8 px-6 text-[var(--color-muted)] text-sm">
      <div class="max-w-5xl mx-auto">
        &copy; {new Date().getFullYear()} {SITE_NAME}
      </div>
    </footer>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: thread breadcrumbs prop from BaseLayout to Nav"
```

---

## Task 3: Pass breadcrumbs from gallery slug page to BaseLayout

**Files:**
- Modify: `src/pages/gallery/[...slug].astro`

The breadcrumbs are already built in this file (lines 67–78). They just need to be forwarded to `BaseLayout` instead of the child components.

- [ ] **Step 1: Update the BaseLayout call and child component calls**

Find the bottom render block (line 162 onwards) and replace it:

```astro
<BaseLayout title={pageTitle} description={pageDescription} ogImage={ogImage} breadcrumbs={breadcrumbs}>
  {type === 'album' && album && (
    <AlbumPage album={album} />
  )}
  {type === 'collection' && collection && (
    <CollectionPage
      collection={collection}
      children={collectionChildren}
      hasAll={hasAll}
    />
  )}
  {type === 'all' && collection && (
    <AllPage
      collection={collection}
      groups={allGroups}
    />
  )}
</BaseLayout>
```

Note: `breadcrumbs` prop is removed from `AlbumPage`, `CollectionPage`, and `AllPage` calls — they no longer use it.

- [ ] **Step 2: Verify breadcrumb renders in nav**

Navigate to any album page (e.g. `http://localhost:4321/gallery/pb-inca`). The nav should show:
`pasqualo.to / Gallery / Inca Trail` on the left, `Gallery` underlined on the right.

- [ ] **Step 3: Commit**

```bash
git add src/pages/gallery/[...slug].astro
git commit -m "feat: forward breadcrumbs from gallery slug page to BaseLayout"
```

---

## Task 4: Add breadcrumbs to non-gallery section pages

**Files:**
- Modify: `src/pages/projects/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/blog/index.astro` (if SHOW_BLOG)
- Modify: `src/pages/notes/index.astro` (if SHOW_NOTES)

The spec requires section roots to show `pasqualo.to / Projects` in the nav. These pages need to pass a single-item breadcrumbs array.

- [ ] **Step 1: Update projects/index.astro**

Change `<BaseLayout title="Projects">` to:

```astro
<BaseLayout title="Projects" breadcrumbs={[{ label: 'Projects' }]}>
```

- [ ] **Step 2: Update about.astro**

Change `<BaseLayout title="About">` to:

```astro
<BaseLayout title="About" breadcrumbs={[{ label: 'About' }]}>
```

- [ ] **Step 3: Update blog/index.astro and notes/index.astro**

In `src/pages/blog/index.astro`, find the `<BaseLayout` call and add `breadcrumbs={[{ label: 'Blog' }]}`.

In `src/pages/notes/index.astro`, find the `<BaseLayout` call and add `breadcrumbs={[{ label: 'Notes' }]}`.

- [ ] **Step 4: Verify at localhost:4321**

Visit `/projects` — nav should show `pasqualo.to / Projects` on left, `Projects` underlined right.
Visit `/about` — nav should show `pasqualo.to / About` on left, `About` underlined right.

- [ ] **Step 5: Commit**

```bash
git add src/pages/projects/index.astro src/pages/about.astro src/pages/blog/index.astro src/pages/notes/index.astro
git commit -m "feat: add section breadcrumbs to projects, about, blog, notes pages"
```

---

## Task 5: Remove Breadcrumbs from AlbumPage; replace sticky preview with masonry grid

**Files:**
- Modify: `src/components/gallery/AlbumPage.astro`

This is the largest change. The sticky preview + thumbstrip are removed entirely. Photos render in a CSS columns masonry grid. Password gate moves from a full-screen fixed modal to an overlay on a section of placeholder tiles below the preview photos.

- [ ] **Step 1: Replace AlbumPage.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';
import { cdnUrl, cdnThumbUrl, apiUrl, apiThumbUrl } from '../../lib/photos';

interface Props {
  album: CollectionEntry<'albums'>;
}

const { album } = Astro.props;
const { title, date, location, description, photos, previewCount } = album.data;
const isProtected = album.data.protected;
const year = new Date(date).getFullYear();

const previewPhotos = isProtected ? photos.slice(0, previewCount) : photos;
const lockedCount = isProtected ? Math.max(0, photos.length - previewCount) : 0;
const previewFiles = new Set(previewPhotos.map(p => p.file));

function thumbUrl(file: string) {
  if (!isProtected || previewFiles.has(file)) return cdnThumbUrl(album.id, file);
  return apiThumbUrl(album.id, file);
}
function fullUrl(file: string) {
  if (!isProtected || previewFiles.has(file)) return cdnUrl(album.id, file);
  return apiUrl(album.id, file);
}
---

<div class="max-w-5xl mx-auto px-6 py-10">

  <!-- Album header -->
  <div class="mb-8">
    <h1 class="text-2xl font-medium text-[var(--color-accent)]">{title}</h1>
    <p class="text-sm text-[var(--color-muted)] mt-1">
      {location ? `${location} · ` : ''}{year} · {photos.length} photo{photos.length !== 1 ? 's' : ''}
    </p>
    {description && (
      <p class="text-sm text-[var(--color-text)] mt-2 max-w-xl">{description}</p>
    )}
  </div>

  <!-- Photo masonry grid -->
  <div id="photo-grid" class="columns-2 md:columns-3" style="column-gap: 5px;">
    {previewPhotos.map((photo, i) => (
      <button
        class="gallery-photo block w-full p-0 border-0 bg-transparent mb-[5px] break-inside-avoid cursor-zoom-in"
        data-src={fullUrl(photo.file)}
        data-alt={photo.alt}
        data-index={i}
        aria-label={`View ${photo.alt}`}
      >
        <img
          src={thumbUrl(photo.file)}
          alt={photo.alt}
          class="w-full h-auto block"
          loading={i < 6 ? 'eager' : 'lazy'}
        />
      </button>
    ))}
  </div>

  <!-- Locked section — only rendered for protected albums with locked photos -->
  {isProtected && lockedCount > 0 && (
    <div id="locked-section" class="relative mt-[5px]">
      <!-- Blurred placeholder tiles hinting at locked photos -->
      <div class="columns-2 md:columns-3 blur-sm opacity-30 pointer-events-none select-none" style="column-gap: 5px;">
        {Array.from({ length: Math.min(lockedCount, 9) }).map((_, i) => (
          <div
            class="mb-[5px] bg-[var(--color-surface)] break-inside-avoid"
            style={`height: ${100 + (i % 3) * 30}px;`}
          />
        ))}
      </div>

      <!-- Password gate overlay -->
      <div
        id="password-gate"
        class="absolute inset-0 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Album password"
      >
        <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-8 w-full max-w-sm mx-4 text-center">
          <p class="text-sm text-[var(--color-muted)] mb-1">
            {lockedCount} more photo{lockedCount !== 1 ? 's' : ''}
          </p>
          <p class="text-base text-[var(--color-text)] mb-6">Enter the password to view the full album</p>
          <form id="password-form" class="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="password"
              id="password-input"
              placeholder="Password"
              class="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2 text-sm outline-none focus:border-[var(--color-muted)] placeholder:text-[var(--color-muted)]"
              autocomplete="current-password"
              autofocus
            />
            <button
              id="unlock-btn"
              type="submit"
              class="px-6 py-2 text-sm bg-white text-black hover:bg-[var(--color-text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Unlock
            </button>
          </form>
          <p id="password-error" class="text-xs text-red-400 mt-3 hidden">Incorrect password.</p>
        </div>
      </div>
    </div>
  )}

</div>

<!-- Album config for gallery.js -->
<div
  id="album-config"
  data-album-id={album.id}
  data-is-protected={String(isProtected)}
  data-preview-count={String(previewCount)}
  hidden
></div>

<!-- Lightbox -->
<div
  id="lightbox"
  class="fixed inset-0 z-50 hidden items-center justify-center bg-black/97"
  role="dialog"
  aria-modal="true"
  aria-label="Photo lightbox"
>
  <p id="lightbox-counter" class="absolute top-5 left-6 text-xs text-white/40 select-none"></p>

  <button
    id="lightbox-close"
    class="absolute top-4 right-6 text-white/50 hover:text-white text-xl leading-none transition-colors"
    aria-label="Close"
  >&#x2715;</button>

  <button
    id="lightbox-prev"
    class="absolute left-4 text-white/30 hover:text-white text-4xl leading-none transition-colors px-4 py-10"
    aria-label="Previous photo"
  >&#x2039;</button>

  <div class="relative flex items-center justify-center">
    <span
      id="lightbox-loader"
      class="absolute text-white/30 text-xs tracking-widest animate-pulse select-none hidden"
    >loading</span>
    <img
      id="lightbox-img"
      src=""
      alt=""
      class="max-h-[90vh] max-w-[90vw] object-contain select-none opacity-0 transition-opacity duration-300"
    />
  </div>

  <button
    id="lightbox-next"
    class="absolute right-4 text-white/30 hover:text-white text-4xl leading-none transition-colors px-4 py-10"
    aria-label="Next photo"
  >&#x203A;</button>
</div>

<script src="/scripts/gallery.js" defer></script>
```

- [ ] **Step 2: Verify album page structure at localhost:4321**

Visit a public album. You should see:
- Title + meta header
- Masonry grid of photos at natural aspect ratios
- No sticky preview, no thumbstrip

The lightbox will not work yet (gallery.js still references removed elements). That's fine — it's fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/gallery/AlbumPage.astro
git commit -m "feat: replace sticky preview with masonry grid in AlbumPage"
```

---

## Task 6: Update CollectionPage — masonry grid + overlay, remove Breadcrumbs

**Files:**
- Modify: `src/components/gallery/CollectionPage.astro`

- [ ] **Step 1: Replace CollectionPage.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface ChildNode {
  id: string;
  title: string;
  href: string;
  coverSrc: string;
  meta: string;
  protected: boolean;
  isCollection: boolean;
}

interface Props {
  collection: CollectionEntry<'albumCollections'>;
  children: ChildNode[];
  hasAll: boolean;
}

const { collection, children, hasAll } = Astro.props;
const { title, date, location, description } = collection.data;
const year = new Date(date).getFullYear();
---

<div class="max-w-5xl mx-auto px-6 py-10">
  <h1 class="text-2xl font-medium text-[var(--color-accent)]">{title}</h1>
  <p class="text-sm text-[var(--color-muted)] mt-1">
    {location ? `${location} · ` : ''}{year}
  </p>
  {description && (
    <p class="text-sm text-[var(--color-text)] mt-2 max-w-xl">{description}</p>
  )}

  {hasAll && (
    <div class="mt-6 mb-2">
      <a
        href={`/gallery/${collection.id}/all`}
        class="inline-block text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)] px-3 py-1.5"
      >
        All photos
      </a>
    </div>
  )}

  {children.length === 0 ? (
    <p class="text-[var(--color-muted)] text-sm mt-8">No albums yet.</p>
  ) : (
    <div class="columns-2 md:columns-3 mt-6" style="column-gap: 6px;">
      {children.map((child) => (
        <a
          href={child.href}
          class="group block relative overflow-hidden mb-[6px] break-inside-avoid cursor-pointer"
        >
          <img
            src={child.coverSrc}
            alt={child.title}
            class="w-full h-auto block"
            loading="lazy"
          />
          <!-- Hover overlay -->
          <div class="gallery-overlay absolute inset-0 bg-gradient-to-t from-black/75 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div class="gallery-text absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
            <p class="text-sm font-medium text-white leading-tight">{child.title}</p>
            <p class="text-xs text-[#aaa] mt-0.5 uppercase tracking-wide">{child.meta}</p>
          </div>
          {child.protected && (
            <span class="gallery-badge absolute bottom-2 left-2 text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <span class="sr-only">Protected album</span>
            </span>
          )}
          {child.isCollection && (
            <span class="gallery-badge absolute bottom-2 right-2 text-[var(--color-muted)] text-xs bg-black/50 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              collection
            </span>
          )}
        </a>
      ))}
    </div>
  )}
</div>

<style>
  @media (hover: none) {
    .gallery-overlay { opacity: 1 !important; }
    .gallery-text { transform: translateY(0) !important; }
    .gallery-badge { opacity: 1 !important; }
  }
</style>
```

- [ ] **Step 2: Verify at localhost:4321**

Navigate to a collection page. Should show masonry grid with overlay titles on hover.

- [ ] **Step 3: Commit**

```bash
git add src/components/gallery/CollectionPage.astro
git commit -m "feat: masonry grid + hover overlay in CollectionPage, remove Breadcrumbs"
```

---

## Task 7: Update AllPage — remove Breadcrumbs only

**Files:**
- Modify: `src/components/gallery/AllPage.astro`

The AllPage grid (square thumbs linking back to albums) is intentionally not changed — it's a different use case (quick scan of all photos). Only the `Breadcrumbs` import and usage is removed.

- [ ] **Step 1: Remove Breadcrumbs from AllPage.astro**

Remove line 3: `import Breadcrumbs from './Breadcrumbs.astro';`

Remove from Props interface: `breadcrumbs: { label: string; href: string }[];`

Change the destructuring from:
```astro
const { collection, groups, breadcrumbs } = Astro.props;
```
to:
```astro
const { collection, groups } = Astro.props;
```

Remove line 23: `<Breadcrumbs crumbs={breadcrumbs} />`

- [ ] **Step 2: Commit**

```bash
git add src/components/gallery/AllPage.astro
git commit -m "refactor: remove Breadcrumbs from AllPage (moved to Nav)"
```

---

## Task 8: Rewrite gallery index page — CSS columns masonry + hover overlay

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace index.astro**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import { cdnUrl } from '../lib/photos';

const allAlbums = await getCollection('albums');
const allCollections = await getCollection('albumCollections');

const childIds = new Set(allCollections.flatMap((c) => c.data.children));
const topAlbums = allAlbums.filter((a) => !childIds.has(a.id));
const topCollections = allCollections.filter((c) => !childIds.has(c.id) && !c.data.hidden);

const nodes: {
  id: string;
  title: string;
  href: string;
  coverSrc: string;
  meta: string;
  protected: boolean;
  isCollection: boolean;
  date: Date;
}[] = [
  ...topAlbums.map((a) => ({
    id: a.id,
    title: a.data.title,
    href: `/gallery/${a.id}`,
    coverSrc: cdnUrl(a.id, a.data.cover),
    meta: a.data.location
      ? `${a.data.location} · ${new Date(a.data.date).getFullYear()}`
      : String(new Date(a.data.date).getFullYear()),
    protected: a.data.protected,
    isCollection: false,
    date: new Date(a.data.date),
  })),
  ...topCollections.map((c) => ({
    id: c.id,
    title: c.data.title,
    href: `/gallery/${c.id}`,
    coverSrc: cdnUrl(c.id, c.data.cover),
    meta: c.data.location
      ? `${c.data.location} · ${new Date(c.data.date).getFullYear()}`
      : String(new Date(c.data.date).getFullYear()),
    protected: false,
    isCollection: true,
    date: new Date(c.data.date),
  })),
].sort((a, b) => b.date.getTime() - a.date.getTime());
---

<BaseLayout>
  <section class="max-w-5xl mx-auto px-6 py-12">
    {nodes.length === 0 ? (
      <p class="text-[var(--color-muted)] text-sm">No albums yet.</p>
    ) : (
      <div class="columns-2 md:columns-3" style="column-gap: 6px;">
        {nodes.map((node) => (
          <a
            href={node.href}
            class="group block relative overflow-hidden mb-[6px] break-inside-avoid cursor-pointer"
          >
            <img
              src={node.coverSrc}
              alt={node.title}
              class="w-full h-auto block"
              loading="lazy"
            />
            <!-- Gradient overlay: hidden by default, revealed on hover -->
            <div class="gallery-overlay absolute inset-0 bg-gradient-to-t from-black/75 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <!-- Title + meta: slide up on hover -->
            <div class="gallery-text absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
              <p class="text-sm font-medium text-white leading-tight">{node.title}</p>
              <p class="text-xs text-[#aaa] mt-0.5 uppercase tracking-wide">{node.meta}</p>
            </div>
            <!-- Lock badge (protected) -->
            {node.protected && (
              <span class="gallery-badge absolute bottom-2 left-2 text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <span class="sr-only">Protected album</span>
              </span>
            )}
            <!-- Collection badge -->
            {node.isCollection && (
              <span class="gallery-badge absolute bottom-2 right-2 text-[var(--color-muted)] text-xs bg-black/50 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                collection
              </span>
            )}
          </a>
        ))}
      </div>
    )}
  </section>
</BaseLayout>

<style>
  /* On touch devices: always show overlay (no hover state) */
  @media (hover: none) {
    .gallery-overlay { opacity: 1 !important; }
    .gallery-text { transform: translateY(0) !important; }
    .gallery-badge { opacity: 1 !important; }
  }
</style>
```

- [ ] **Step 2: Verify gallery index at localhost:4321**

- Cards display at natural aspect ratios (no forced 4:3 crop)
- Hover reveals gradient + title overlay
- No metadata below cards
- Lock icon visible on protected albums on hover
- "collection" label visible on collections on hover

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: CSS columns masonry + hover overlay on gallery index"
```

---

## Task 9: Rewrite gallery.js for masonry grid

**Files:**
- Modify: `public/scripts/gallery.js`

The new script collects photos from `.gallery-photo` buttons in `#photo-grid` and any photos appended after unlock. The sticky preview, thumbstrip, and their associated DOM references are gone.

- [ ] **Step 1: Replace public/scripts/gallery.js**

```js
// Gallery page script — CSP-safe (no inline handlers), loaded via <script src defer>.
// Reads photo data from .gallery-photo buttons in #photo-grid.
// Opens lightbox on click; handles keyboard, swipe, and password gate.

(function () {
  const cfg = document.getElementById('album-config');
  if (!cfg) return; // not an album page

  const isProtected = cfg.dataset.isProtected === 'true';
  const albumId = cfg.dataset.albumId;

  // ── Photo list ────────────────────────────────────────────────────────────
  // Built from .gallery-photo buttons already in the DOM.
  // After unlock, locked photos are appended and this list is extended.
  let allPhotos = [];

  function collectPhotos() {
    allPhotos = [];
    document.querySelectorAll('#photo-grid .gallery-photo').forEach((btn, i) => {
      allPhotos.push({
        src: btn.dataset.src,
        alt: btn.dataset.alt,
      });
      btn.dataset.index = String(i);
    });
  }

  collectPhotos();

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const lightbox        = document.getElementById('lightbox');
  const lightboxImg     = document.getElementById('lightbox-img');
  const lightboxLoader  = document.getElementById('lightbox-loader');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxClose   = document.getElementById('lightbox-close');
  const lightboxPrevBtn = document.getElementById('lightbox-prev');
  const lightboxNextBtn = document.getElementById('lightbox-next');

  let activeIndex = 0;
  let lightboxOpener = null;

  function setLightboxImage(index) {
    activeIndex = index;
    const photo = allPhotos[index];
    lightboxImg.classList.add('opacity-0');
    lightboxLoader.classList.remove('hidden');
    lightboxImg.onload = () => {
      lightboxImg.classList.remove('opacity-0');
      lightboxLoader.classList.add('hidden');
    };
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt;
    lightboxCounter.textContent = `${index + 1} / ${allPhotos.length}`;
    schedulePreload(index);
  }

  function openLightbox(index) {
    lightboxOpener = document.activeElement;
    activeIndex = index;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setLightboxImage(index);
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = '';
    if (lightboxOpener) { lightboxOpener.focus(); lightboxOpener = null; }
  }

  function prev() { setLightboxImage((activeIndex - 1 + allPhotos.length) % allPhotos.length); }
  function next() { setLightboxImage((activeIndex + 1) % allPhotos.length); }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrevBtn.addEventListener('click', prev);
  lightboxNextBtn.addEventListener('click', next);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  // Focus trap within lightbox
  const focusable = [lightboxClose, lightboxPrevBtn, lightboxNextBtn];
  lightbox.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  });

  // Swipe
  let swipeStartX = null;
  lightbox.addEventListener('touchstart', (e) => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (swipeStartX === null) return;
    const delta = e.changedTouches[0].clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) next(); else prev();
  }, { passive: true });

  // ── Click-to-open on masonry grid ─────────────────────────────────────────
  function bindGridPhoto(btn) {
    btn.addEventListener('click', () => openLightbox(Number(btn.dataset.index)));
  }

  document.querySelectorAll('#photo-grid .gallery-photo').forEach(bindGridPhoto);

  // ── Proximity preloader ───────────────────────────────────────────────────
  const preloaded = new Set();
  let preloadQueue = [];
  let preloadActive = 0;
  const CONCURRENCY = 2;
  const WINDOW = 3;

  function runPreloadQueue() {
    while (preloadActive < CONCURRENCY && preloadQueue.length > 0) {
      const src = preloadQueue.shift();
      if (preloaded.has(src)) continue;
      preloaded.add(src);
      preloadActive++;
      const img = new Image();
      img.onload = img.onerror = () => { preloadActive--; runPreloadQueue(); };
      img.src = src;
    }
  }

  function schedulePreload(centerIdx) {
    preloadQueue = [];
    for (let d = 1; d <= WINDOW; d++) {
      for (const idx of [centerIdx + d, centerIdx - d]) {
        const photo = allPhotos[idx];
        if (photo && !preloaded.has(photo.src)) preloadQueue.push(photo.src);
      }
    }
    runPreloadQueue();
  }

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!isProtected) return;

  const storageKey = `unlocked:${albumId}`;
  const lockedSection = document.getElementById('locked-section');
  const gate = document.getElementById('password-gate');

  const alreadyUnlocked = sessionStorage.getItem(storageKey) === 'true';

  async function fetchLockedPhotos() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(`/api/albums/${albumId}/photos`, { signal: controller.signal });
    } catch {
      return 'network';
    } finally {
      clearTimeout(timeout);
    }
    if (res.status === 401 || res.status === 403) return 'expired';
    if (!res.ok) return 'error';
    return res.json();
  }

  function appendLockedPhotos(photos) {
    const grid = document.getElementById('photo-grid');
    const startIndex = allPhotos.length;
    photos.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = 'gallery-photo block w-full p-0 border-0 bg-transparent mb-[5px] break-inside-avoid cursor-zoom-in';
      btn.dataset.src = p.src;
      btn.dataset.alt = p.alt;
      btn.dataset.index = String(startIndex + i);
      btn.setAttribute('aria-label', `View ${p.alt}`);
      const img = document.createElement('img');
      img.src = p.thumbSrc;
      img.alt = p.alt;
      img.className = 'w-full h-auto block';
      img.loading = 'lazy';
      btn.appendChild(img);
      bindGridPhoto(btn);
      grid.appendChild(btn);
    });
    // Rebuild allPhotos from DOM so indices stay correct
    collectPhotos();
  }

  function showGateError(msg) {
    if (gate) {
      gate.style.display = 'flex';
      if (lockedSection) lockedSection.style.display = 'block';
    }
    const btn = document.getElementById('unlock-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Unlock'; }
    const err = document.getElementById('password-error');
    if (err) { err.textContent = msg; err.classList.remove('hidden'); }
  }

  async function unlock(fromSessionStorage = false) {
    const result = await fetchLockedPhotos();
    if (typeof result !== 'object' || !result.photos) {
      if (fromSessionStorage) sessionStorage.removeItem(storageKey);
      const msg = result === 'expired'
        ? 'Your session has expired. Please enter the password again.'
        : 'Something went wrong. Please try again.';
      showGateError(msg);
      return;
    }
    // Remove locked section (blurred placeholders + gate)
    if (lockedSection) {
      lockedSection.style.opacity = '0';
      lockedSection.style.transition = 'opacity 200ms';
      setTimeout(() => lockedSection.remove(), 200);
    }
    appendLockedPhotos(result.photos);
  }

  if (alreadyUnlocked) {
    unlock(true);
  }

  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('unlock-btn');
    btn.disabled = true;
    btn.textContent = 'Unlocking…';

    const input = document.getElementById('password-input').value;
    const res = await fetch('/api/auth/album', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album: albumId, password: input }),
    });

    if (res.ok) {
      sessionStorage.setItem(storageKey, 'true');
      unlock();
    } else {
      btn.disabled = false;
      btn.textContent = 'Unlock';
      const err = document.getElementById('password-error');
      err.classList.remove('hidden');
      const input = document.getElementById('password-input');
      input.value = '';
      input.addEventListener('input', () => err.classList.add('hidden'), { once: true });
    }
  });
})();
```

- [ ] **Step 2: Verify lightbox at localhost:4321**

Visit a public album. Click any photo — lightbox should open with:
- Counter top-left (`1 / N`)
- Close button top-right
- Prev/next arrows
- ← → keyboard navigation
- Esc to close
- Click outside photo to close

- [ ] **Step 3: Verify protected album flow**

Visit a protected album (e.g. `/gallery/pb-salvador`). You should see:
- Preview photos rendered in masonry
- Blurred placeholder tiles below
- Password gate card overlaid on placeholders
- Enter correct password → gate fades, locked photos append to masonry

- [ ] **Step 4: Commit**

```bash
git add public/scripts/gallery.js
git commit -m "feat: rewrite gallery.js for masonry click-to-lightbox"
```

---

## Task 10: Delete Breadcrumbs.astro

**Files:**
- Delete: `src/components/gallery/Breadcrumbs.astro`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "Breadcrumbs" src/
```

Expected output: no results. If any remain, fix them before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/gallery/Breadcrumbs.astro
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove Breadcrumbs component (replaced by inline Nav breadcrumb)"
```

---

## Task 11: Final verification pass

No code changes. Manual acceptance criteria check.

- [ ] **Start dev server and run through all scenarios**

```bash
npm run dev
```

**Homepage (`/`):**
- [ ] Nav: `pasqualo.to` left, `Gallery` underlined right
- [ ] Masonry grid at natural aspect ratios, 3-col desktop, 2-col mobile
- [ ] Hover: gradient + title slides up, meta below
- [ ] Mobile: titles always visible
- [ ] Protected badge visible on hover; collection label visible on hover

**Public album (`/gallery/pb-inca` or similar):**
- [ ] Nav: `pasqualo.to / Gallery / Album Title`, `Gallery` underlined right
- [ ] Album header: title, meta with photo count
- [ ] Masonry grid of photos, cursor zoom-in
- [ ] Lightbox opens on click, counter shows `1 / N`
- [ ] Keyboard ← → navigation works
- [ ] Swipe navigation works on mobile
- [ ] Esc closes lightbox

**Protected album (`/gallery/pb-salvador`):**
- [ ] Preview photos render in masonry
- [ ] Blurred placeholder tiles below previews
- [ ] Password gate overlaid on placeholders
- [ ] Wrong password: error message shown
- [ ] Correct password: gate fades, locked photos append to masonry
- [ ] Lightbox works on all photos after unlock
- [ ] Session persists on page reload (sessionStorage)

**Collection (`/gallery/circo-hibrido`):**
- [ ] Nav: `pasqualo.to / Gallery / Collection Name`, `Gallery` underlined
- [ ] Masonry grid with hover overlay
- [ ] "All photos" link visible if applicable

**All-photos page (`/gallery/circo-hibrido/all`):**
- [ ] Nav: `pasqualo.to / Gallery / Collection / All`, `Gallery` underlined
- [ ] Grid unchanged (square thumbs, not masonry)

**Other sections (`/projects`, `/about`):**
- [ ] Nav: `pasqualo.to / Projects` or `pasqualo.to / About` — wait, these are section roots, so breadcrumbs would be `[{ label: 'Projects' }]`. But BaseLayout passes no breadcrumbs for these pages — confirm no regression.

Actually: `/projects`, `/about` pages render via `BaseLayout` with no `breadcrumbs` prop, so Nav shows logo-only left, with active link underlined right. ✓

- [ ] **Step: Production build check**

```bash
npm run build
```

Expected: no TypeScript errors, no missing imports.

- [ ] **Step: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: verification pass corrections"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Nav: inline breadcrumb `logo / Gallery / Title` | Task 1 |
| Nav: active section underlined right | Task 1 |
| Nav: mobile drops breadcrumb, hamburger stays | Task 1 (`hidden sm:inline`) |
| Nav: section roots show `pasqualo.to / Projects` etc. | Task 4 |
| BaseLayout threads breadcrumbs to Nav | Task 2 |
| Gallery index: CSS columns masonry | Task 7 |
| Gallery index: hover overlay with gradient + title | Task 7 |
| Gallery index: mobile always-visible overlay | Task 7 (`@media (hover: none)`) |
| Gallery index: lock icon + collection badge | Task 7 |
| Album page: masonry grid replaces sticky preview | Task 4 |
| Album page: lightbox on grid photo click | Tasks 4 + 8 |
| Album page: lightbox counter, close, prev/next | Task 4 (markup) + Task 8 (JS) |
| Album page: keyboard + swipe navigation | Task 8 |
| Protected album: blurred placeholders + gate | Task 4 |
| Protected album: gate fades, photos append on unlock | Task 8 |
| CollectionPage: masonry + overlay | Task 5 |
| CollectionPage: removes Breadcrumbs | Task 5 |
| AllPage: removes Breadcrumbs | Task 6 |
| Delete Breadcrumbs.astro | Task 9 |
| gallery.js: full rewrite | Task 8 |
