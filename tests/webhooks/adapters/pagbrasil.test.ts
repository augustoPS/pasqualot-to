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
