import { defineMiddleware } from 'astro:middleware';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only apply rate limiting when Upstash is configured
const ratelimit = (
  import.meta.env.UPSTASH_REDIS_REST_URL &&
  import.meta.env.UPSTASH_REDIS_REST_TOKEN
)
  ? new Ratelimit({
      redis: new Redis({
        url: import.meta.env.UPSTASH_REDIS_REST_URL,
        token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'album-auth',
    })
  : null;

export const onRequest = defineMiddleware(async (ctx, next) => {
  if (
    ratelimit &&
    ctx.request.method === 'POST' &&
    new URL(ctx.request.url).pathname === '/api/auth/album'
  ) {
    const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }
  }
  return next();
});
