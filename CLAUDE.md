# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:4321
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

Node.js PATH may need: `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"`

## Stack

- **Astro 6** with `@astrojs/vercel` adapter — static output with serverless API routes
- **Tailwind CSS v4** (configured via `@theme` in `src/styles/global.css`, no tailwind.config.js)
- **Content Layer API** (Astro 5+ glob loaders, not legacy `type: 'content'`)
- **Cloudflare R2** for all photo storage — two buckets (public CDN + private proxy)
- **JWT auth** via `jose` — HTTP-only cookies for protected album access

## Architecture

### Content Collections (`src/content.config.ts`)

All collections use the Astro 6 Content Layer glob loader:

| Collection | Format | Location |
|---|---|---|
| `albums` | JSON | `src/content/albums/*.json` |
| `albumCollections` | JSON | `src/content/collections/*.json` |
| `blog` | Markdown | `src/content/blog/*.md` |
| `notes` | Markdown | `src/content/notes/*.md` |
| `projects` | JSON | `src/content/projects/*.json` |

Album slugs come from the JSON filename (e.g. `tokyo-2024.json` → `/gallery/tokyo-2024`). Collections are containers: their `children` array holds album or collection IDs, enabling nested hierarchies. The gallery index shows only top-level nodes (not referenced as any collection's child).

### Photos

Two R2 buckets with a hard security boundary:

| Bucket | CDN | Contains | Served via |
|---|---|---|---|
| `pasqualottoweb-public` | `photos.pasqualo.to` | Public album photos, preview photos, all thumbs | Cloudflare CDN — zero Vercel bandwidth |
| `pasqualottoweb` | none | Locked photos (protected albums, non-preview) | `/api/photos/` Vercel proxy — JWT-gated |

The separation means locked photos are unreachable via CDN by construction — not just by convention. Knowing a filename is not enough to access a locked photo.

**Public bucket layout:**
```
[album-slug]/[filename]          ← full-size photos (public albums + previews)
[album-slug]/thumbs/[filename]   ← pre-generated thumbnails (400px wide, JPEG)
```

**Private bucket layout:**
```
[album-slug]/[filename]          ← locked photos only
```

Thumbnails for locked photos are generated on-demand by `sharp` in the Vercel proxy (`?w=300`) — not pre-stored.

To mark an album as protected, set `"protected": true` in the album JSON. The album password is stored as a Vercel env var: `ALBUM_PASSWORD_<SLUG_UPPERCASE>` (e.g. `ALBUM_PASSWORD_PB_SALVADOR`). Never store passwords in source.

The CDN base URL is `PHOTOS_CDN` in `src/config.ts`. All photo URL construction goes through `src/lib/photos.ts` — do not hardcode paths in components.

### API Routes (`src/pages/api/`)

All API routes use `export const prerender = false` for serverless execution.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/album` | POST | Verify album password → issue JWT cookie |
| `/api/photos/[album]/[...file]` | GET | Validate JWT → proxy photo from R2 (add `?w=N` for resized thumb) |
| `/api/albums/[slug]/photos` | GET | Validate JWT → return JSON list of locked photo URLs |

### Middleware (`src/middleware.ts`)

Rate-limits `POST /api/auth/album` — 5 requests per 60s per IP — using Upstash Redis. The limiter is only instantiated when both Upstash env vars are present; omitting them disables rate limiting silently (safe for local dev).

### Required Environment Variables

| Variable | Description |
|---|---|
| `PHOTO_JWT_SECRET` | Secret for signing/verifying JWT tokens (32+ chars) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | Private R2 bucket name — locked photos only (e.g. `pasqualottoweb`) |
| `ALBUM_PASSWORD_<SLUG>` | Per-album password (e.g. `ALBUM_PASSWORD_PB_SALVADOR`) |

**Optional:**

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL — enables auth rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

The public bucket (`pasqualottoweb-public`) requires no env vars — it is served entirely via the Cloudflare CDN custom domain and never accessed by server code.

### Site Config (`src/config.ts`)

- `SHOW_BLOG`: toggle blog visibility. When `false`, `/blog` redirects to `/` and blog pages are excluded from the static build.

### Layout

`src/layouts/BaseLayout.astro` is the single shared layout — handles `<head>`, nav, footer, and global CSS import. Nav links are driven by `SHOW_BLOG` from config.

## Adding Content

**One-time Cloudflare setup:**
1. Create a second R2 bucket: `pasqualottoweb-public`
2. `pasqualottoweb-public` → Settings → Custom Domains → add `photos.pasqualo.to`
3. Keep `pasqualottoweb` as-is (no custom domain, no public access)

**New public album:**
1. Create `src/content/albums/[slug].json`
2. Compress and generate thumbs: `node scripts/compress-photos.mjs <raw-dir> <out-dir> --thumbs`
3. Upload `<out-dir>/*.jpg` → **public bucket** `[slug]/`
4. Upload `<out-dir>/thumbs/*.jpg` → **public bucket** `[slug]/thumbs/`

**New protected album:**
1. Create `src/content/albums/[slug].json` with `"protected": true` and `"previewCount": N`
   - `previewCount` means the **first N entries** in the `photos[]` array are public previews; all others are locked
2. Compress all photos: `node scripts/compress-photos.mjs <raw-dir> <out-dir> --thumbs`
3. Upload the N preview photos + thumbs → **public bucket** `[slug]/` and `[slug]/thumbs/`
4. Upload all remaining (locked) photos → **private bucket** `[slug]/`
5. Set `ALBUM_PASSWORD_<SLUG_UPPERCASE>` in Vercel env vars

**New collection:** create `src/content/collections/[slug].json` with a `children` array of album/collection IDs. Upload the collection's cover image → **public bucket** `[slug]/cover.jpg`.

**Migration (existing photos in `public/photos/`):**
1. Upload `public/photos/pb-inca/` preview photos + `thumbs/` → **public bucket** `pb-inca/`
2. Upload `public/photos/pb-salvador/` preview photos + `thumbs/` → **public bucket** `pb-salvador/`
3. Verify CDN delivery at `https://photos.pasqualo.to/pb-inca/IMG_4552.jpg`
4. Remove `public/photos/` from the repo

**Enable blog:** set `SHOW_BLOG = true` in `src/config.ts` once you have posts in `src/content/blog/`.

## Design Tokens

CSS custom properties defined in `src/styles/global.css` under `@theme`:
- `--color-bg` `#0a0a0a` — page background
- `--color-surface` `#141414` — card/surface background
- `--color-border` `#222` — borders
- `--color-text` `#e5e5e5` — body text
- `--color-muted` `#666` — secondary/meta text
- `--color-accent` `#fff` — headings, active nav, logo

## Agent Findings

Insights from the multi-agent team review (March–April 2026). These represent the team's accumulated knowledge — treat them as informed context, not immutable rules.

### Security
- The R2 dual-bucket separation (public CDN vs. private Vercel-proxied) is **load-bearing security** — not a deployment optimization. Public bucket has no auth by construction; private bucket is inaccessible without a valid JWT going through the Vercel proxy. Never collapse these into a single bucket or add public access to the private bucket.
- JWT in HTTP-only cookies replaced the old client-side sessionStorage gate. Never reintroduce client-side auth state.
- Knowing a private photo's filename is not enough to access it — the private bucket has no public domain.

### Testing
- Zero automated tests exist. Any new feature should define manual acceptance criteria before implementation begins. Verification steps should be documented in PRs.
- High-priority failure modes to test manually: wrong album password, expired JWT, missing env vars (`ALBUM_PASSWORD_*`, `PHOTO_JWT_SECRET`), R2 bucket unreachable.

### Accessibility
- ARIA attributes are incomplete on interactive elements (flagged March 2026, not yet addressed). Treat as ongoing debt — flag the a11y state on any UI work, even if not fixing it immediately.

### Image pipeline
- `scripts/compress-photos.mjs` and `scripts/gen-thumbs.mjs` are manual steps that run **outside the build**. They must be run before uploading photos to R2. This step has been forgotten before — the "Adding Content" workflow above is the authoritative checklist; follow it exactly.
