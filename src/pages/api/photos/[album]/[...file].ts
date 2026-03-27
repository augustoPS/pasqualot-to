export const prerender = false;

import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const secret = new TextEncoder().encode(process.env.PHOTO_JWT_SECRET);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const GET: APIRoute = async ({ params, cookies }) => {
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
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `${album}/${file}`,
    });
    const res = await s3.send(cmd);
    const body = await res.Body?.transformToByteArray();
    if (!body) return new Response('Not found', { status: 404 });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': res.ContentType ?? 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
