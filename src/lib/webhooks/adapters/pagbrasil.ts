import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NormalizedEvent, PspAdapter } from '../types';

type PagBrasilPayload = Record<string, unknown>;

const STATUS_MAP: Record<string, NormalizedEvent['type']> = {
  A: 'order.paid',
  F: 'order.failed',
  R: 'order.failed',
  J: 'order.failed',
  P: 'order.refunded',
  C: 'order.chargeback',
};

const METHOD_MAP: Record<string, NormalizedEvent['paymentMethod']> = {
  X: 'pix',
  C: 'credit_card',
  B: 'boleto',
  D: 'debit',
};

const STRIP_RAW_KEYS = new Set(['secret', 'signature']);

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

function toEvent(payload: unknown): NormalizedEvent | null {
  if (!isObject(payload)) return null;

  const order = getString(payload, 'order');
  const amountBrl = getString(payload, 'amount_brl');
  const paymentStatus = getString(payload, 'payment_status');
  const paymentMethod = getString(payload, 'payment_method');
  if (!order || !amountBrl || !paymentStatus) return null;

  const cents = Math.round(parseFloat(amountBrl) * 100);
  if (!Number.isFinite(cents)) return null;

  const type = STATUS_MAP[paymentStatus];
  if (!type) return null;

  const method = (paymentMethod && METHOD_MAP[paymentMethod]) ?? 'unknown';
  const authorizationCode =
    type === 'order.paid' ? getString(payload, 'authorization_code') ?? undefined : undefined;

  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (STRIP_RAW_KEYS.has(k)) continue;
    if (typeof v === 'string') raw[k] = v;
  }

  return {
    source: 'pagbrasil',
    type,
    orderId: order,
    amountBrlCents: cents,
    paymentMethod: method,
    authorizationCode,
    receivedAt: new Date().toISOString(),
    raw,
  };
}

export const pagbrasilAdapter: PspAdapter<PagBrasilPayload> = {
  sourceId: 'pagbrasil',
  verify,
  toEvent,
};
