/**
 * Pre-generates 300px JPEG thumbnails for all public photos at build time.
 * Output: public/photos/[album]/thumbs/[file]
 * Run via: npm run build (wired into build script)
 */

import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const PHOTOS_DIR = 'public/photos';
const THUMB_WIDTH = 300;
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const albums = await readdir(PHOTOS_DIR, { withFileTypes: true });
let generated = 0;
let skipped = 0;

for (const entry of albums) {
  if (!entry.isDirectory() || entry.name === 'thumbs') continue;

  const albumDir = join(PHOTOS_DIR, entry.name);
  const thumbDir = join(albumDir, 'thumbs');

  const files = await readdir(albumDir, { withFileTypes: true });
  const photos = files.filter(f => f.isFile() && SUPPORTED.has(extname(f.name).toLowerCase()));

  if (photos.length === 0) continue;

  await mkdir(thumbDir, { recursive: true });

  await Promise.all(photos.map(async (photo) => {
    const src = join(albumDir, photo.name);
    const dest = join(thumbDir, photo.name.replace(/\.[^.]+$/, '.jpg'));

    if (existsSync(dest)) {
      skipped++;
      return;
    }

    await sharp(src)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(dest);

    generated++;
    console.log(`  ✓ ${entry.name}/thumbs/${photo.name}`);
  }));
}

console.log(`gen-thumbs: ${generated} generated, ${skipped} already exist`);
