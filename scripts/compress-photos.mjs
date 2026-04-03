#!/usr/bin/env node
/**
 * compress-photos.mjs
 *
 * Compresses Lightroom 100% JPEG exports for web delivery.
 * Keeps original dimensions. Uses MozJPEG for best quality-to-size ratio.
 *
 * Usage:
 *   node scripts/compress-photos.mjs <input-dir> <output-dir>
 *   node scripts/compress-photos.mjs <input-dir> <output-dir> --quality 85
 *   node scripts/compress-photos.mjs <input-dir> <output-dir> --thumbs
 *   node scripts/compress-photos.mjs <input-dir> <output-dir> --thumbs --thumb-width 400
 *
 * --thumbs        Also generate thumbnails into <output-dir>/thumbs/
 * --thumb-width   Thumbnail width in pixels (default: 400)
 *
 * Full-size output is ready to upload to R2.
 * Thumbs output goes into public/photos/[album]/thumbs/ (commit to repo).
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';

const [,, arg1, arg2, ...flags] = process.argv;

const inputDir  = arg1 ? resolve(arg1) : process.cwd();
const outputDir = arg2 ? resolve(arg2) : resolve(inputDir, 'web');

const qualityIdx = flags.indexOf('--quality');
const quality = qualityIdx !== -1 ? parseInt(flags[qualityIdx + 1], 10) : 80;

const genThumbs = flags.includes('--thumbs');
const thumbWidthIdx = flags.indexOf('--thumb-width');
const thumbWidth = thumbWidthIdx !== -1 ? parseInt(flags[thumbWidthIdx + 1], 10) : 400;

if (isNaN(quality) || quality < 1 || quality > 100) {
  console.error('--quality must be a number between 1 and 100');
  process.exit(1);
}

if (genThumbs && (isNaN(thumbWidth) || thumbWidth < 1)) {
  console.error('--thumb-width must be a positive number');
  process.exit(1);
}

const JPEG_EXTS = new Set(['.jpg', '.jpeg']);
const CONCURRENCY = 4;

function fmt(bytes) {
  return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(0)} KB`;
}

async function main() {
  const entries = await readdir(inputDir);
  const files = entries
    .filter(f => JPEG_EXTS.has(extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log('No JPEG files found.');
    process.exit(0);
  }

  await mkdir(outputDir, { recursive: true });

  const thumbsDir = join(outputDir, 'thumbs');
  if (genThumbs) await mkdir(thumbsDir, { recursive: true });

  console.log(`Compressing ${files.length} photo${files.length !== 1 ? 's' : ''} at quality ${quality}...`);
  if (genThumbs) console.log(`Generating thumbnails at ${thumbWidth}px wide into thumbs/`);
  console.log('');

  let totalIn = 0;
  let totalOut = 0;
  let done = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (file) => {
      const src = join(inputDir, file);
      const outFile = file.replace(/\.[^.]+$/, '.jpg');
      const dst = join(outputDir, outFile);

      const inBytes = (await stat(src)).size;

      await sharp(src)
        .jpeg({
          quality,
          mozjpeg: true,
          progressive: true,
        })
        .withMetadata()
        .toFile(dst);

      if (genThumbs) {
        await sharp(src)
          .resize({ width: thumbWidth, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true, progressive: true })
          .toFile(join(thumbsDir, outFile));
      }

      const outBytes = (await stat(dst)).size;
      totalIn  += inBytes;
      totalOut += outBytes;
      done++;

      const pct = ((1 - outBytes / inBytes) * 100).toFixed(1);
      console.log(`  [${String(done).padStart(String(files.length).length)}/${files.length}] ${file}  ${fmt(inBytes)} → ${fmt(outBytes)}  (-${pct}%)`);
    }));
  }

  const totalPct = ((1 - totalOut / totalIn) * 100).toFixed(1);
  console.log(`\nTotal  ${fmt(totalIn)} → ${fmt(totalOut)}  (-${totalPct}%)`);
  console.log(`Output: ${outputDir}`);
  if (genThumbs) console.log(`Thumbs: ${thumbsDir}`);
}

main().catch(err => { console.error(err); process.exit(1); });
