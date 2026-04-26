import type { APIContext } from 'astro';
import { pagbrasilAdapter } from '../../../lib/webhooks/adapters/pagbrasil';
import { forwardToShop } from '../../../lib/webhooks/forward';

export const prerender = false;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const PAGBRASIL_WEBHOOK_SECRET = requireEnv('PAGBRASIL_WEBHOOK_SECRET');

function ackResponse(): Response {
  return new Response(`Received successfully ${new Date().toISOString()}`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function POST({ request }: APIContext): Promise<Response> {
  const rawBody = await request.text();

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return new Response('Bad Request', { status: 400 });
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (!pagbrasilAdapter.verify(rawBody, request.headers, payload, PAGBRASIL_WEBHOOK_SECRET)) {
    console.warn('pagbrasil-ipn: signature verification failed', {
      order: typeof payload.order === 'string' ? payload.order : null,
      payment_status: typeof payload.payment_status === 'string' ? payload.payment_status : null,
    });
    return new Response('Unauthorized', { status: 401 });
  }

  const event = pagbrasilAdapter.toEvent(payload);
  if (!event) return ackResponse();

  if (event.type === 'order.paid') {
    const result = await forwardToShop(event);
    if (!result.ok) {
      console.error('pagbrasil-ipn: shop forward failed', {
        status: result.status,
        orderId: event.orderId,
      });
      return new Response('Bad Gateway', { status: 502 });
    }
  } else {
    console.info('pagbrasil-ipn: non-paid event observed', {
      type: event.type,
      orderId: event.orderId,
    });
  }

  return ackResponse();
}
