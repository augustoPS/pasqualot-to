export const prerender = false;

import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';
import { getEntry } from 'astro:content';
import { PHOTO_JWT_SECRET as secret } from '../../../../lib/env';

export const GET: APIRoute = async ({ params, cookies }) => {
  const { slug } = params;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return new Response('Bad request', { status: 400 });
  }

  const token = cookies.get(`album_token_${slug}`)?.value;
  if (!token) return new Response('Unauthorized', { status: 401 });

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.album !== slug) return new Response('Forbidden', { status: 403 });
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  const album = await getEntry('albums', slug);
  if (!album) return new Response('Not found', { status: 404 });
  if (!album.data.protected) return new Response('Not a protected album', { status: 400 });

  const { photos, previewCount } = album.data;
  const lockedPhotos = photos.slice(previewCount).map((p) => ({
    file: p.file,
    alt: p.alt,
    src: `/api/photos/${slug}/${p.file}`,
  }));

  return new Response(JSON.stringify({ photos: lockedPhotos }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
