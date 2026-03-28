export const prerender = false;

import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';
import { timingSafeEqual } from 'node:crypto';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA); // constant-time dummy compare
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

const jwtSecret = new TextEncoder().encode(process.env.PHOTO_JWT_SECRET);

function getAlbumPassword(albumId: string): string | undefined {
  // Album passwords are stored as env vars: ALBUM_PASSWORD_<SLUG_UPPERCASE_DASHES_TO_UNDERSCORES>
  const key = `ALBUM_PASSWORD_${albumId.toUpperCase().replace(/-/g, '_')}`;
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

  if (!/^[a-z0-9-]+$/.test(album)) {
    return new Response(JSON.stringify({ error: 'Invalid album' }), { status: 400 });
  }

  const expectedPassword = getAlbumPassword(album);
  if (!expectedPassword) {
    return new Response(JSON.stringify({ error: 'Album not found' }), { status: 404 });
  }

  if (!safeCompare(password, expectedPassword)) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  const token = await new SignJWT({ album })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(jwtSecret);

  const secure = import.meta.env.PROD ? '; Secure' : '';
  const cookie = `album_token_${album}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secure}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
};
