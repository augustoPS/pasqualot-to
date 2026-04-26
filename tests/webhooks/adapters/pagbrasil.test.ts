import { describe, it, expect } from 'vitest';
import { pagbrasilAdapter } from '../../../src/lib/webhooks/adapters/pagbrasil';

const SECRET = 'testkey';

const VALID_PAID = {
  secret: 'testkey',
  payment_method: 'X',
  order: '1234567890',
  amount_brl: '39.50',
  payment_status: 'A',
  authorization_code: 'AUTH123',
  signature: '53dfeb23c113e66a043eafc6a1f2f37d',
};

describe('pagbrasilAdapter.verify', () => {
  it('returns true for a valid signature', () => {
    expect(pagbrasilAdapter.verify('', new Headers(), VALID_PAID, SECRET)).toBe(true);
  });

  it('returns false when the body is tampered', () => {
    const tampered = { ...VALID_PAID, amount_brl: '99.50' };
    expect(pagbrasilAdapter.verify('', new Headers(), tampered, SECRET)).toBe(false);
  });

  it('returns false with the wrong secret', () => {
    expect(pagbrasilAdapter.verify('', new Headers(), VALID_PAID, 'wrongkey')).toBe(false);
  });

  it('returns false when payment_status is missing', () => {
    const { payment_status: _drop, ...incomplete } = VALID_PAID;
    expect(pagbrasilAdapter.verify('', new Headers(), incomplete, SECRET)).toBe(false);
  });

  it('returns false when signature is missing', () => {
    const { signature: _drop, ...incomplete } = VALID_PAID;
    expect(pagbrasilAdapter.verify('', new Headers(), incomplete, SECRET)).toBe(false);
  });

  it('returns false when amount_brl is a number, not a string (no coercion)', () => {
    const numericAmount = { ...VALID_PAID, amount_brl: 39.5 as unknown as string };
    expect(pagbrasilAdapter.verify('', new Headers(), numericAmount, SECRET)).toBe(false);
  });

  it('verifies the length-prefix correctly for shorter values', () => {
    // source "1234510.00A11" -> 1ed0adf196acd31c1775d0019c029327
    const payload = {
      ...VALID_PAID,
      order: '12345',
      amount_brl: '10.00',
      signature: '1ed0adf196acd31c1775d0019c029327',
    };
    expect(pagbrasilAdapter.verify('', new Headers(), payload, SECRET)).toBe(true);
  });

  it('returns false for non-object payloads', () => {
    expect(pagbrasilAdapter.verify('', new Headers(), null, SECRET)).toBe(false);
    expect(pagbrasilAdapter.verify('', new Headers(), 'string', SECRET)).toBe(false);
    expect(pagbrasilAdapter.verify('', new Headers(), [VALID_PAID], SECRET)).toBe(false);
  });
});

describe('pagbrasilAdapter.toEvent', () => {
  it('maps a paid Pix event with authorization_code', () => {
    const event = pagbrasilAdapter.toEvent(VALID_PAID);
    expect(event).not.toBeNull();
    expect(event!.source).toBe('pagbrasil');
    expect(event!.type).toBe('order.paid');
    expect(event!.orderId).toBe('1234567890');
    expect(event!.amountBrlCents).toBe(3950);
    expect(event!.paymentMethod).toBe('pix');
    expect(event!.authorizationCode).toBe('AUTH123');
    expect(event!.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it.each([
    ['F', 'order.failed'],
    ['R', 'order.failed'],
    ['J', 'order.failed'],
    ['P', 'order.refunded'],
    ['C', 'order.chargeback'],
  ])('maps payment_status %s to %s', (status, expectedType) => {
    const payload = { ...VALID_PAID, payment_status: status };
    const event = pagbrasilAdapter.toEvent(payload);
    expect(event!.type).toBe(expectedType);
  });

  it.each([
    ['X', 'pix'],
    ['C', 'credit_card'],
    ['B', 'boleto'],
    ['D', 'debit'],
    ['Z', 'unknown'],
  ])('maps payment_method %s to %s', (code, expected) => {
    const payload = { ...VALID_PAID, payment_method: code };
    const event = pagbrasilAdapter.toEvent(payload);
    expect(event!.paymentMethod).toBe(expected);
  });

  it.each([
    ['39.50', 3950],
    ['0.01', 1],
    ['100', 10000],
    ['39.5', 3950],
  ])('converts amount_brl %s to %d cents', (input, expected) => {
    const payload = { ...VALID_PAID, amount_brl: input };
    const event = pagbrasilAdapter.toEvent(payload);
    expect(event!.amountBrlCents).toBe(expected);
  });

  it('returns null when amount_brl is unparseable', () => {
    const payload = { ...VALID_PAID, amount_brl: 'not-a-number' };
    expect(pagbrasilAdapter.toEvent(payload)).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    const { order: _drop, ...incomplete } = VALID_PAID;
    expect(pagbrasilAdapter.toEvent(incomplete)).toBeNull();
  });

  it('omits authorizationCode when payment_status is not A', () => {
    const payload = { ...VALID_PAID, payment_status: 'F' };
    const event = pagbrasilAdapter.toEvent(payload);
    expect(event!.authorizationCode).toBeUndefined();
  });

  it('strips secret and signature from raw, keeps other fields', () => {
    const event = pagbrasilAdapter.toEvent(VALID_PAID);
    expect(event!.raw).not.toHaveProperty('secret');
    expect(event!.raw).not.toHaveProperty('signature');
    expect(event!.raw.order).toBe('1234567890');
    expect(event!.raw.payment_status).toBe('A');
  });

  it('skips non-string fields when building raw', () => {
    const payload = { ...VALID_PAID, weird_field: 42 as unknown as string };
    const event = pagbrasilAdapter.toEvent(payload);
    expect(event!.raw).not.toHaveProperty('weird_field');
  });
});
