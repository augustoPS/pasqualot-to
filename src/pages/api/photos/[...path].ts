export const prerender = false;

import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PHOTO_JWT_SECRET as secret, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } from '../../../lib/env';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const GET: APIRoute = async ({ params, cookies, url }) => {
  const raw = params.path;
  if (!raw) return new Response('Not found', { status: 404 });

  // Split path: last segment is the filename, everything before is the album slug
  const parts = raw.split('/');
  if (parts.length < 2) return new Response('Not found', { status: 404 });
  const file = parts[parts.length - 1];
  const album = parts.slice(0, -1).join('/');

  // Validate album slug and filename
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(album) || !/^[a-zA-Z0-9._-]+$/.test(file)) {
    return new Response('Bad request', { status: 400 });
  }

  const w = url.searchParams.get('w');
  const parsed = w ? parseInt(w, 10) : null;
  const width = parsed && Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 2400) : null;

  // This route only serves protected album photos (locked, JWT-gated).
  // Public photos are served directly via CDN (photos.pasqualo.to) and never hit this route.
  const cookieName = `album_token_${album.replace(/\//g, '_')}`;
  const token = cookies.get(cookieName)?.value;
  if (!token) return new Response('Unauthorized', { status: 401 });

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.album !== album) return new Response('Forbidden', { status: 403 });
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: `${album}/${file}` });
    const res = await s3.send(cmd);
    let body = await res.Body?.transformToByteArray();
    if (!body) return new Response('Not found', { status: 404 });

    let contentType = res.ContentType ?? 'image/jpeg';

    // Thumbnail (?w=N): resize via sharp before serving
    if (width) {
      body = await sharp(body).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      contentType = 'image/jpeg';
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
