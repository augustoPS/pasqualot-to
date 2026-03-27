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

- **Astro 6** with static output
- **Tailwind CSS v4** (configured via `@theme` in `src/styles/global.css`, no tailwind.config.js)
- **Content Layer API** (Astro 5+ glob loaders, not legacy `type: 'content'`)

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

Photos live in `public/photos/[album-slug]/`. The album JSON references filenames only (e.g. `"cover": "01.jpg"`). No Astro image optimization — files are served directly from `public/`.

### Site Config (`src/config.ts`)

- `SHOW_BLOG`: toggle blog visibility. When `false`, `/blog` redirects to `/` and blog pages are excluded from the static build.

### Layout

`src/layouts/BaseLayout.astro` is the single shared layout — handles `<head>`, nav, footer, and global CSS import. Nav links are driven by `SHOW_BLOG` from config.

## Adding Content

**New album:** create `src/content/albums/[slug].json` and add photos to `public/photos/[slug]/`.

**Enable blog:** set `SHOW_BLOG = true` in `src/config.ts` once you have posts in `src/content/blog/`.

## Design Tokens

CSS custom properties defined in `src/styles/global.css` under `@theme`:
- `--color-bg` `#0a0a0a` — page background
- `--color-surface` `#141414` — card/surface background
- `--color-border` `#222` — borders
- `--color-text` `#e5e5e5` — body text
- `--color-muted` `#666` — secondary/meta text
- `--color-accent` `#fff` — headings, active nav, logo
