export const prerender = false;

import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';
import { getCollection } from 'astro:content';

const secret = new TextEncoder().encode(import.meta.env.PHOTO_JWT_SECRET);

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

  const albums = await getCollection('albums');
  const entry = albums.find((a) => a.id === album);

  if (!entry?.data.password) {
    return new Response(JSON.stringify({ error: 'Album not found' }), { status: 404 });
  }

  if (password !== entry.data.password) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  const token = await new SignJWT({ album })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret);

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
