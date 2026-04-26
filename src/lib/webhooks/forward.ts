import { createHmac } from 'node:crypto';
import type { NormalizedEvent } from './types';

const SHOP_URL = 'https://shop.pasqualo.to/api/internal/order-paid';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const SHOP_INTERNAL_WEBHOOK_SECRET = requireEnv('SHOP_INTERNAL_WEBHOOK_SECRET');

export async function forwardToShop(
  event: NormalizedEvent,
): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', SHOP_INTERNAL_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const res = await fetch(SHOP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Source': event.source,
    },
    body,
  });
  return { ok: res.ok, status: res.status };
}
