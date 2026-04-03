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
 *   node scripts/compress-photos.mjs <input-dir> <output-dir> --keep-small
 *   node scripts/compress-photos.mjs <input-dir> <output-dir> --keep-small --keep-threshold 512
 *
 * --thumbs            Also generate thumbnails into <output-dir>/thumbs/
 * --thumb-width       Thumbnail width in pixels (default: 400)
 * --keep-small        Copy files below the threshold as-is instead of compressing
 * --keep-threshold    Size threshold in KB (default: 1024). Files strictly below
 *                     this size are copied unchanged; others are compressed.
 *
 * Full-size output is ready to upload to R2.
 * Thumbs output goes into public/photos/[album]/thumbs/ (commit to repo).
 */

import sharp from 'sharp';
import { readdir, mkdir, stat, copyFile } from 'node:fs/promises';
import { resolve, join, extname, relative, dirname } from 'node:path';

const args = process.argv.slice(2);

// Named flags take priority over positional args
const iIdx = args.indexOf('-i');
const oIdx = args.indexOf('-o');

// Positional args: first two entries that aren't a flag or a flag value
const positional = [];
const flagValueIndices = new Set();
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('-')) { flagValueIndices.add(i + 1); }
}
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('-') && !flagValueIndices.has(i)) positional.push(args[i]);
}

const inputArg  = iIdx !== -1 ? args[iIdx + 1] : positional[0];
const outputArg = oIdx !== -1 ? args[oIdx + 1] : positional[1];

const inputDir  = inputArg  ? resolve(inputArg)  : process.cwd();
const outputDir = outputArg ? resolve(outputArg) : resolve(inputDir, 'web');

const flags = args;

const qualityIdx = flags.indexOf('--quality') !== -1 ? flags.indexOf('--quality') : flags.indexOf('-q');
const quality = qualityIdx !== -1 ? parseInt(flags[qualityIdx + 1], 10) : 80;

const genThumbs = flags.includes('--thumbs');
const thumbWidthIdx = flags.indexOf('--thumb-width');
const thumbWidth = thumbWidthIdx !== -1 ? parseInt(flags[thumbWidthIdx + 1], 10) : 400;

const keepSmall = flags.includes('--keep-small') || flags.includes('-ks');
const keepThresholdIdx = flags.indexOf('--keep-threshold');
const keepThresholdKB = keepThresholdIdx !== -1 ? parseInt(flags[keepThresholdIdx + 1], 10) : 1024;
const keepThresholdBytes = keepThresholdKB * 1024;

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

async function collectFiles(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...await collectFiles(join(dir, entry.name), base));
    } else if (JPEG_EXTS.has(extname(entry.name).toLowerCase())) {
      files.push(relative(base, join(dir, entry.name)));
    }
  }
  return files.sort();
}

async function main() {
  const files = await collectFiles(inputDir, inputDir);

  if (files.length === 0) {
    console.log('No JPEG files found.');
    process.exit(0);
  }

  await mkdir(outputDir, { recursive: true });

  console.log(`Compressing ${files.length} photo${files.length !== 1 ? 's' : ''} at quality ${quality}...`);
  if (keepSmall) console.log(`Keeping originals for files below ${keepThresholdKB} KB (copied as-is)`);
  if (genThumbs) console.log(`Generating thumbnails at ${thumbWidth}px wide into thumbs/ (mirroring subfolder structure)`);
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

      await mkdir(dirname(dst), { recursive: true });

      const inBytes = (await stat(src)).size;
      const small = keepSmall && inBytes < keepThresholdBytes;

      if (small) {
        await copyFile(src, dst);
      } else {
        await sharp(src)
          .jpeg({
            quality,
            mozjpeg: true,
            progressive: true,
          })
          .withMetadata()
          .toFile(dst);
      }

      if (genThumbs) {
        const thumbDst = join(outputDir, 'thumbs', outFile);
        await mkdir(dirname(thumbDst), { recursive: true });
        await sharp(src)
          .resize({ width: thumbWidth, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true, progressive: true })
          .toFile(thumbDst);
      }

      const outBytes = (await stat(dst)).size;
      totalIn  += inBytes;
      totalOut += outBytes;
      done++;

      const tag = small ? ' (kept)' : '';
      const pct = small ? '' : `  (-${((1 - outBytes / inBytes) * 100).toFixed(1)}%)`;
      console.log(`  [${String(done).padStart(String(files.length).length)}/${files.length}] ${file}  ${fmt(inBytes)} → ${fmt(outBytes)}${pct}${tag}`);
    }));
  }

  const totalPct = ((1 - totalOut / totalIn) * 100).toFixed(1);
  console.log(`\nTotal  ${fmt(totalIn)} → ${fmt(totalOut)}  (-${totalPct}%)`);
  console.log(`Output: ${outputDir}`);
  if (genThumbs) console.log(`Thumbs: ${join(outputDir, 'thumbs')}`);
}

main().catch(err => { console.error(err); process.exit(1); });
