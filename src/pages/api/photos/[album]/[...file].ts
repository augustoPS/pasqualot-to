export const prerender = false;

import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PHOTO_JWT_SECRET as secret, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } from '../../../../lib/env';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const GET: APIRoute = async ({ params, cookies, url }) => {
  const { album, file } = params;
  if (!album || !file) return new Response('Not found', { status: 404 });

  // Prevent path traversal and enforce slug format
  if (!/^[a-z0-9-]+$/.test(album) || file.includes('..') || file.includes('/..')) {
    return new Response('Bad request', { status: 400 });
  }

  const token = cookies.get(`album_token_${album}`)?.value;
  if (!token) return new Response('Unauthorized', { status: 401 });

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.album !== album) return new Response('Forbidden', { status: 403 });
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  try {
    const cmd = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `${album}/${file}`,
    });
    const res = await s3.send(cmd);
    let body = await res.Body?.transformToByteArray();
    if (!body) return new Response('Not found', { status: 404 });

    const w = url.searchParams.get('w');
    const parsed = w ? parseInt(w, 10) : null;
    const width = parsed && Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 2400) : null;
    let contentType = res.ContentType ?? 'image/jpeg';
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
