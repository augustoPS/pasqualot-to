import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env.SHOP_INTERNAL_WEBHOOK_SECRET = 'shop-internal-secret';

const { forwardToShop } = await import('../../src/lib/webhooks/forward');

const baseEvent = {
  source: 'pagbrasil' as const,
  type: 'order.paid' as const,
  orderId: 'order-123',
  amountBrlCents: 3950,
  paymentMethod: 'pix' as const,
  authorizationCode: 'AUTH123',
  receivedAt: '2026-04-26T12:00:00.000Z',
  raw: { order: 'order-123' },
};

describe('forwardToShop', () => {
  beforeEach(() => mockFetch.mockClear());

  it('POSTs to the shop internal endpoint as JSON', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await forwardToShop(baseEvent);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://shop.pasqualo.to/api/internal/order-paid');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['X-Webhook-Source']).toBe('pagbrasil');
  });

  it('signs the request with HMAC-SHA256 over `<timestamp>.<body>`', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await forwardToShop(baseEvent);

    const init = mockFetch.mock.calls[0][1];
    const timestamp = init.headers['X-Webhook-Timestamp'];
    const sigHeader = init.headers['X-Webhook-Signature'];
    const body = init.body;

    expect(typeof timestamp).toBe('string');
    expect(sigHeader.startsWith('sha256=')).toBe(true);

    const expected =
      'sha256=' +
      createHmac('sha256', 'shop-internal-secret')
        .update(`${timestamp}.${body}`)
        .digest('hex');
    expect(sigHeader).toBe(expected);
  });

  it('serializes the event in the body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await forwardToShop(baseEvent);

    const body = mockFetch.mock.calls[0][1].body;
    expect(JSON.parse(body)).toEqual(baseEvent);
  });

  it('returns ok=false with the response status when shop fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await forwardToShop(baseEvent);
    expect(result).toEqual({ ok: false, status: 500 });
  });

  it('uses a recent timestamp (within 5 seconds of now)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const before = Math.floor(Date.now() / 1000);
    await forwardToShop(baseEvent);
    const after = Math.floor(Date.now() / 1000);

    const sentTs = Number(mockFetch.mock.calls[0][1].headers['X-Webhook-Timestamp']);
    expect(sentTs).toBeGreaterThanOrEqual(before);
    expect(sentTs).toBeLessThanOrEqual(after);
  });
});
