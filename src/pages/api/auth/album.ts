export const prerender = false;

import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';
import { PHOTO_JWT_SECRET as jwtSecret } from '../../../lib/env';
import { safeCompare, getAlbumPassword, ALBUM_SLUG_REGEX } from '../../../lib/auth';

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

  if (!ALBUM_SLUG_REGEX.test(album)) {
    return new Response(JSON.stringify({ error: 'Invalid album' }), { status: 400 });
  }

  const expectedPassword = getAlbumPassword(album);
  if (!expectedPassword) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  if (!safeCompare(password, expectedPassword, jwtSecret)) {
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
