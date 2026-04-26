export type NormalizedEvent = {
  source: 'pagbrasil';
  type: 'order.paid' | 'order.failed' | 'order.refunded' | 'order.chargeback';
  orderId: string;
  amountBrlCents: number;
  paymentMethod: 'pix' | 'credit_card' | 'boleto' | 'debit' | 'unknown';
  authorizationCode?: string;
  receivedAt: string;
  raw: Record<string, string>;
};

export type PspAdapter<P = unknown> = {
  sourceId: 'pagbrasil' | 'mercadopago' | 'pagarme';
  verify(rawBody: string, headers: Headers, payload: P, secret: string): boolean;
  toEvent(payload: P): NormalizedEvent | null;
};
