import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.PAGBRASIL_WEBHOOK_SECRET = 'testkey';
process.env.SHOP_INTERNAL_WEBHOOK_SECRET = 'shop-internal-secret';

vi.mock('../../src/lib/webhooks/forward', () => ({
  forwardToShop: vi.fn(),
}));

const { forwardToShop } = await import('../../src/lib/webhooks/forward');
const { POST } = await import('../../src/pages/api/webhooks/pagbrasil-ipn');

const VALID_PAID_BODY = JSON.stringify({
  secret: 'testkey',
  payment_method: 'X',
  order: '1234567890',
  amount_brl: '39.50',
  payment_status: 'A',
  authorization_code: 'AUTH123',
  signature: '53dfeb23c113e66a043eafc6a1f2f37d',
});

const VALID_FAILED_BODY = JSON.stringify({
  secret: 'testkey',
  payment_method: 'X',
  order: '1234567890',
  amount_brl: '39.50',
  payment_status: 'F',
  signature: '0a6178316274bbb453c5999746dd2937',
});

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://pasqualo.to/api/webhooks/pagbrasil-ipn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

function ctx(req: Request) {
  return { request: req } as Parameters<typeof POST>[0];
}

describe('POST /api/webhooks/pagbrasil-ipn', () => {
  beforeEach(() => {
    vi.mocked(forwardToShop).mockReset();
  });

  it('forwards a paid event to shop and returns 200 with the ack body', async () => {
    vi.mocked(forwardToShop).mockResolvedValueOnce({ ok: true, status: 200 });
    const res = await POST(ctx(makeRequest(VALID_PAID_BODY)));

    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^Received successfully \d{4}-\d{2}-\d{2}T/);
    expect(forwardToShop).toHaveBeenCalledTimes(1);
    const event = vi.mocked(forwardToShop).mock.calls[0][0];
    expect(event.type).toBe('order.paid');
    expect(event.orderId).toBe('1234567890');
  });

  it('returns 401 and does not forward when the signature is invalid', async () => {
    const tampered = JSON.parse(VALID_PAID_BODY);
    tampered.amount_brl = '99.99';
    const res = await POST(ctx(makeRequest(JSON.stringify(tampered))));

    expect(res.status).toBe(401);
    expect(forwardToShop).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(ctx(makeRequest('{not-json')));
    expect(res.status).toBe(400);
    expect(forwardToShop).not.toHaveBeenCalled();
  });

  it('returns 400 for a JSON array body', async () => {
    const res = await POST(ctx(makeRequest('[1, 2, 3]')));
    expect(res.status).toBe(400);
    expect(forwardToShop).not.toHaveBeenCalled();
  });

  it('returns 400 for a JSON null body', async () => {
    const res = await POST(ctx(makeRequest('null')));
    expect(res.status).toBe(400);
    expect(forwardToShop).not.toHaveBeenCalled();
  });

  it('returns 502 when forwardToShop fails', async () => {
    vi.mocked(forwardToShop).mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await POST(ctx(makeRequest(VALID_PAID_BODY)));
    expect(res.status).toBe(502);
  });

  it('acks verified non-paid events without forwarding', async () => {
    const res = await POST(ctx(makeRequest(VALID_FAILED_BODY)));
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^Received successfully /);
    expect(forwardToShop).not.toHaveBeenCalled();
  });
});
