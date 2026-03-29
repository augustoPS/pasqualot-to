export const prerender = false;

import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

export const GET: APIRoute = async ({ params, url }) => {
  const { album, file } = params;
  if (!album || !file) return new Response('Not found', { status: 404 });
  if (!/^[a-z0-9-]+$/.test(album) || file.includes('..')) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const photoPath = resolve('public/photos', album, file);
    const raw = await readFile(photoPath);

    const w = url.searchParams.get('w');
    const width = w ? Math.min(parseInt(w, 10), 2400) : 300;
    const body = await sharp(raw).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
