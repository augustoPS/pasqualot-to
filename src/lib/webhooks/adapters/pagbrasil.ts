import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NormalizedEvent, PspAdapter } from '../types';

type PagBrasilPayload = Record<string, unknown>;

function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function getString(p: Record<string, unknown>, key: string): string | null {
  const v = p[key];
  return typeof v === 'string' ? v : null;
}

function verify(_rawBody: string, _headers: Headers, payload: unknown, secret: string): boolean {
  if (!isObject(payload)) return false;

  const order = getString(payload, 'order');
  const amountBrl = getString(payload, 'amount_brl');
  const paymentStatus = getString(payload, 'payment_status');
  const received = getString(payload, 'signature');
  if (!order || !amountBrl || !paymentStatus || !received) return false;

  const totalLen = String(order.length + amountBrl.length + paymentStatus.length);
  const source = order + amountBrl + paymentStatus + totalLen;
  const expected = createHmac('md5', secret).update(source).digest('hex');

  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export const pagbrasilAdapter: PspAdapter<PagBrasilPayload> = {
  sourceId: 'pagbrasil',
  verify,
  toEvent: () => null, // implemented in next task
};
