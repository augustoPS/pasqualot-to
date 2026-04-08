export const prerender = false;

import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';
import { timingSafeEqual, createHmac } from 'node:crypto';
import { PHOTO_JWT_SECRET as jwtSecret } from '../../../lib/env';

function safeCompare(a: string, b: string): boolean {
  // HMAC-normalize both inputs to equal-length digests before comparing,
  // so the comparison is constant-time regardless of input length differences.
  const key = process.env.PHOTO_JWT_SECRET!;
  const hmacA = createHmac('sha256', key).update(a).digest();
  const hmacB = createHmac('sha256', key).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

function getAlbumPassword(albumId: string): string | undefined {
  // Album passwords are stored as env vars: ALBUM_PASSWORD_<SLUG_UPPERCASE_DASHES_AND_SLASHES_TO_UNDERSCORES>
  const key = `ALBUM_PASSWORD_${albumId.toUpperCase().replace(/[-/]/g, '_')}`;
  return process.env[key];
}

export const POST: APIRoute = async ({ request }) => {
  let body: { album?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { album, password } = body;
  if (!album || !password) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  if (!/^[a-z0-9][a-z0-9/-]*$/.test(album)) {
    return new Response(JSON.stringify({ error: 'Invalid album' }), { status: 400 });
  }

  const expectedPassword = getAlbumPassword(album);
  if (!expectedPassword) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  if (!safeCompare(password, expectedPassword)) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  const token = await new SignJWT({ album })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(jwtSecret);

  const secure = import.meta.env.PROD ? '; Secure' : '';
  const cookieName = `__Host-album_token_${album.replace(/\//g, '_')}`;
  const cookie = `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${secure}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
};
