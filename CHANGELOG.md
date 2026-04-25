# Changelog

## 2026-04-25 — gallery-ui-copy-deploy

Session focused on pasqualo.to UI polish and tooling. Fixed a critical album password auth bug (safeCompare was missing its HMAC key argument, crashing every auth attempt). Overhauled the protected/series badges to use 「」brackets at top-right. Reworked the about, 404, and series pages for consistent viewport-lock layouts with proper mobile behavior. Established a copy.json workflow for external copy editing. Added `npm run deploy` for local build + Vercel prebuilt deploys, and wired up a pre-wrap-up hook to flag pending changes.

### Added
- feat: 「SOME PROTECTED」badge on series cards with protected albums (9b5c23e)

### Fixed
- fix: album passwords, protected badge style, about mobile order (507b837)
- fix: 「」brackets on protected badge, about page mobile scrollable (73b08ad)
- fix: 404 page viewport-lock, no scroll — matches home/about treatment (b36f417)
- fix: 404 mobile shows photo band so copy referencing it makes sense (cc481a2)
- fix: remove whitespace between album title and date on 404 page (a7793ef)
- fix: 「」brackets outside <em> tags — no italic on brackets (6f1b91c)

### Other
- chore: add copy.json — editable inventory of all site text (6874a83)
- content: apply copy.json — 「」brackets on headlines, built-with update (8f77a4a)
- content: apply copy.json — 404 body trimmed, no date, no period (c14f423)
- content: apply copy.json — 「」on home line 2 and series Archive (234c5f1)
- chore: add npm run deploy — local build + vercel deploy --prebuilt (3160e5b)

## 2026-04-25 — nav-wordmark-aria

Short implementation session. Picked up a pre-designed bracketed wordmark (created externally in Claude design) and wired it into Nav.astro — both the sticky header and the mobile drawer. The wordmark uses diagonal SVG corner brackets flanking "pasqualo" (Space Grotesk 500) and ".to" (Fraunces italic, accent gold). Fixed a pre-existing nested `<a>` bug in the breadcrumb path as a side effect. Swapped favicon.ico → favicon.svg and deleted scratch prototype files. Also cleared the remaining ARIA debt: added aria-label to the protected album password input and role="alert" to the error message.

### Added
- feat: bracketed wordmark in nav, SVG favicon (46066e3)

### Fixed
- fix: ARIA label on password input, role=alert on error message (f2d5047)

## 2026-04-25 — series-routing-hero-redesign

Major design and routing overhaul of pasqualo.to. Split /gallery into a static home landing page and a /series catalog route. Redesigned the home hero with larger display type (clamp 64–96px), accent color on the italic tagline, ONGOING ARCHIVE sub-label, and 19px body — inspired by the 404 design language. Applied the same typographic approach to the about page. Built a new /series index page with AUGUSTO PASQUALOTTO kicker, The Archive display headline, and SeriesCard redesigned to use image overlays matching CollectionPage. Fixed breadcrumbs to only appear on album/all pages (suppressed on collection pages). Fixed ← ALL SERIES link and a subtle CSS cascade bug where --nav-h on body was overriding the nav script's runtime measurement.

### Added
- feat: redesign home hero, split gallery to /series, polish 404 (3c427bf)
- feat: series page header, overlay cards, nav/breadcrumb polish (e0b37e0)

## 2026-04-24 — about-hero-layout

Fixed full-viewport layout on the home hero and about page so photos fill the entire viewport without gaps, stretching, or distortion. Added `coverOrientation` schema field to albums so the hero can switch between portrait (45% column) and landscape (60% column) layouts. Key discoveries: the root cause of the about page gap was `clip-path: inset(0 10%)` applied when `isLandscape=true` — it was cropping the image visually even though the container was correct. About page now uses `position: fixed; top: var(--nav-h); left: 0; right: 0; bottom: 0;` on the section, and `--nav-h` is set at runtime by an inline script in Nav.astro measuring actual `header.offsetHeight`. Text column pinned to bottom with `justify-end`.

### Added
- feat: fix full-viewport hero/about layout and add landscape orientation support (2b698cb)

## 2026-04-21 — about-page-layout

Debugged and refined the about page layout to display full-screen without scrolling. Fixed issues with content visibility, photo sizing, and blank space through iterative visual testing. Made the landscape photo display at 16/9 aspect ratio with a 10% side crop to focus on the central subject. Repositioned contact info directly below about text using mt-6 spacing. Applied grid `items-start` alignment to eliminate unwanted vertical stretching and blank space. User edited about page content with updated contact details (email, Instagram handles, built-with credits).

### Fixed
- fix: make about page full screen without scroll (79256bf)
- fix: make text column scrollable while keeping page full-screen (6372eb0)
- fix: reduce top padding to fit all content without scroll (54b57b5)
- fix: aggressive spacing and font size reductions to fit all content (9e27c9d)
- fix: use mt-auto to stick contact section to bottom dynamically (8563a8c)
- fix: add h-full to text column so mt-auto works (e6cb2c3)
- fix: constrain photo height with max-h-full and aspect-ratio (13a7854)
- fix: crop 10% from sides of landscape photo to focus center (585867e)
- fix: stack about+contact text and scale image to fill space (fd0f548)
- fix: remove scaleX transform from landscape photo (da717fd)
- fix: remove fixed height so section sizes to content (513218c)
- fix: add items-start to prevent grid stretching (c0b5260)

---

## 2026-04-21 — css-csp-fix

Debugged critical Tailwind CSS v4 production styling issue where CSS variables and font sizes failed to apply on Vercel while working correctly in development. Applied systematic root-cause investigation (Phase 1–2) and discovered the root cause: Vercel's Content Security Policy header blocked Astro's injected `<style>` tags. Fixed by adding `'unsafe-inline'` to the style-src directive in vercel.json. Deployed to preview and verified styles now resolve correctly in production.

### Added
- feat: add explicit Tailwind v4 content path configuration (44352fd)

### Fixed
- fix: prevent CSS variable scoping by marking global style as is:global (e5e045d)
- fix: consolidate CSS variables to single @theme block in global.css (f045b5a)
- fix: allow unsafe-inline styles in CSP to enable CSS variable resolution (2ca3428)

### Other
- docs: add Tailwind production build investigation spec (3cdbb76)

---

## 2026-04-21 — tailwind-investigation

Continued work on pasqualo.to gallery redesign with focus on CSS styling issues. Made layout improvements (redesigned home gallery layout and album card styling) but discovered a critical production CSS rendering bug: Tailwind classes weren't applying in the external CSS file despite being present. After systematic investigation, determined the root cause was systemic to the Tailwind v4 + Astro 6 + @astrojs/vercel static build pipeline. Committed to a formal 4-phase investigation rather than patching with inline-only CSS.

### Added
- feat: redesign home gallery layout and album card styling (1a52a53)

### Fixed
- fix: add missing font class definitions to BaseLayout (315f776)
- fix: simplify 404 page to photographic message only (1561005)

---

## 2026-04-20 — about-redesign

Long session spanning the full `feat/ui-redesign` arc. Started by reading the design spec, auditing the codebase against it at target screen sizes (402px mobile, 1728px desktop), and running a code review that surfaced 10 gaps. Ran brainstorming to design fixes (user chose smooth inline unlock reveal over page reload). Wrote and executed a 6-task implementation plan via subagent-driven development: color tokens, Nav mobile drawer + breadcrumb hiding, 404 three-tone switcher, gallery lightbox mobile fade+scale + album auth unlock fix (wrong field name + static-page reload bug), HomeHero max-width, minor dead-link/emoji cleanups. After pushing, diagnosed and fixed a persistent landscape about page photo issue — the root cause was `aspect-ratio` on a flex-col item with no in-flow content (collapses to zero height on the main axis). Final fix switched both landscape and portrait to a two-column CSS grid (2fr/1fr and 1fr/1.1fr respectively), where the photo column fills full row height via grid stretch.

### Fixed
- fix(fonts): bundle fonts as static assets in public/fonts (13fe88c)
- fix(fonts): add preload hints so fonts download before CSS is parsed (88cd24e)
- fix(fonts): redeclare font vars outside @theme layer so var() resolves correctly (e59771d)
- fix(fonts): move @font-face and font vars into inline <style> in BaseLayout head, bypass Tailwind pipeline entirely (8c56266)
- fix(fonts): use <style is:global> so Astro doesn't scope :root font vars (06f2cfd)
- fix(fonts): replace var(--font-*) in inline styles with literal font stacks (cb8750d)
- fix(fonts): use CSS class rules instead of inline font-family (6f1c849)
- fix(about): plain shop link, redesign contact as dl grid (6d1dfb8)
- fix(about): responsive orientation layout, fix contact grid, bump body size (e9628d8)
- fix(tokens): restore color-line, color-accent, color-dim to spec values; remove dead Google Fonts CSP (2ca9d88)
- fix(about): 4/5 portrait aspect ratio, 3/2 landscape aspect ratio, correct instagram handle (ace7d92)
- fix(auth): correct POST field name album→albumId, replace reload with inline unlock reveal; mobile lightbox fade+scale; event delegation for injected buttons (bf9585c)
- fix(nav): hide breadcrumbs below sm breakpoint; add mobile hamburger + full-screen drawer (2d4eca9)
- fix(nav): guard Escape handler to only close when drawer is open (083dad9)
- fix(404): three-tone copy switcher, mobile padding px-8 md:px-16, fix dead /gallery links (ed59834)
- fix(home): max-width 1200px hero content wrapper; fix /gallery dead links; remove emoji from protected badge (c5c166f)
- fix(gallery): clear stale transition after navigate fade-in (622fafc)
- fix(about): use orientation-aware photo filename (portrait.jpg vs landscape.jpg) (18bb07d)
- fix(about): add width:100% to landscape photo div so aspect-ratio computes height in flex-col context (94b125c)
- fix(about): restructure landscape photo to flow element so aspect-ratio resolves (5605efc)
- fix(about): landscape uses 2/3+1/3 grid matching portrait layout (c71e874)
- fix: add missing CSS color variables to BaseLayout head (72522a3)
- fix: use plain <style> instead of <style is:global> so CSS variables render in static output (1bacfcc)
- fix: add CSS color variables to :root in global.css so they're in the CSS pipeline (f25ad32)

### Other
- revert: restore hero photo to original size (undo last 3 hero changes) (f37c68a)
- test: hardcode Fraunces on html to diagnose font loading (5344fed)

---

## 2026-04-19 — ui-redesign

Implemented the full monograph UI redesign from the design handoff. Read the design spec, wrote a 12-task execution plan and Obsidian catalogue, then implemented in a git worktree on `feat/ui-redesign`: content schema updates (blurb, lens, title fields), monograph nav, home page hero + series grid, series drill-in with stacked layout, album detail with FLIP lightbox and password gate, about page with orientation-aware two-column layout, and 404 page. Made a corrections pass against updated design screenshots — rewrote Nav for inline Space Grotesk breadcrumbs, HomeHero for 4:5 cover photo, CollectionPage for stacked layout, AlbumPage for centered header with position indicator. Fixed font selection by reading the Hi-fi design spec and switching to Fraunces, Space Grotesk, and IBM Plex Mono. Created PR #1.

### Added
- feat: add blurb to collections, lens/title to photo entries (39d7f1d)
- feat: monograph nav — mono logo, breadcrumb, mobile drawer (1b3b56a)
- feat: home page — monograph series index with hero + 2-col grid + mobile alternating rhythm (f455f16)
- feat: series drill-in — monograph 3-col album grid with hero (5de597f)
- feat: album detail — monograph header, masonry, password gate, prev/next footer (3289b93)
- feat: FLIP-animated lightbox with keyboard nav, mobile swipe, swipe-down-to-close (28de953)
- feat: about page — full-bleed two-col split, env-var photo orientation (fa1a05d)
- feat: 404 page — photographic layout with three-tone switcher (5f07398)

### Fixed
- fix: align all pages with updated design handoff (0d8a04d)
- fix: allow Google Fonts in CSP and fix about page grid layout (90787c3)
- fix(fonts): switch to correct design spec fonts and fix nav structure (601ebac)
