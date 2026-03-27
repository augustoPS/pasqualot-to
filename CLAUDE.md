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
- **Cloudflare R2** for protected photo storage (S3-compatible, accessed via `@aws-sdk/client-s3`)
- **JWT auth** via `jose` — HTTP-only cookies for protected album access

## Architecture

### Content Collections (`src/content.config.ts`)

All collections use the Astro 6 Content Layer glob loader:

| Collection | Format | Location |
|---|---|---|
| `albums` | JSON | `src/content/albums/*.json` |
| `blog` | Markdown | `src/content/blog/*.md` |
| `notes` | Markdown | `src/content/notes/*.md` |
| `projects` | JSON | `src/content/projects/*.json` |

Album slugs come from the JSON filename (e.g. `tokyo-2024.json` → `/gallery/tokyo-2024`).

### Photos

Two tiers depending on whether the album is protected:

- **Public photos** — live in `public/photos/[album-slug]/`, served directly from CDN. Used for preview photos and unprotected albums.
- **Protected photos** — stored in Cloudflare R2 bucket under `[album-slug]/[filename]`. Served via `/api/photos/[album]/[...file]` which validates a JWT cookie before proxying from R2.

To mark an album as protected, set `"protected": true` in the album JSON. The album password is stored as a Vercel env var: `ALBUM_PASSWORD_<SLUG_UPPERCASE>` (e.g. `ALBUM_PASSWORD_PB_SALVADOR`). Never store passwords in source.

### API Routes (`src/pages/api/`)

All API routes use `export const prerender = false` for serverless execution.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/album` | POST | Verify album password → issue JWT cookie |
| `/api/photos/[album]/[...file]` | GET | Validate JWT → proxy photo from R2 |

### Required Environment Variables

| Variable | Description |
|---|---|
| `PHOTO_JWT_SECRET` | Secret for signing/verifying JWT tokens (32+ chars) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name (e.g. `pasqualottoweb`) |
| `ALBUM_PASSWORD_<SLUG>` | Per-album password (e.g. `ALBUM_PASSWORD_PB_SALVADOR`) |

### Site Config (`src/config.ts`)

- `SHOW_BLOG`: toggle blog visibility. When `false`, `/blog` redirects to `/` and blog pages are excluded from the static build.

### Layout

`src/layouts/BaseLayout.astro` is the single shared layout — handles `<head>`, nav, footer, and global CSS import. Nav links are driven by `SHOW_BLOG` from config.

## Adding Content

**New public album:** create `src/content/albums/[slug].json` and add photos to `public/photos/[slug]/`.

**New protected album:** create `src/content/albums/[slug].json` with `"protected": true`, upload photos to R2 under `[slug]/`, and set `ALBUM_PASSWORD_<SLUG>` in Vercel env vars.

**Enable blog:** set `SHOW_BLOG = true` in `src/config.ts` once you have posts in `src/content/blog/`.

## Design Tokens

CSS custom properties defined in `src/styles/global.css` under `@theme`:
- `--color-bg` `#0a0a0a` — page background
- `--color-surface` `#141414` — card/surface background
- `--color-border` `#222` — borders
- `--color-text` `#e5e5e5` — body text
- `--color-muted` `#666` — secondary/meta text
- `--color-accent` `#fff` — headings, active nav, logo
