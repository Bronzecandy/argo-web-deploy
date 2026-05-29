/**
 * PayOS return URL lands on the web app; FE then triggers the backend
 * "server callback" (cook on-chain, update DB) without pointing PayOS at the API host.
 *
 * BE when creating PayOS link should set returnUrl to:
 *   `${NEXT_PUBLIC_APP_URL}/payment/result?payment_id={paymentId}`
 * (or append payment_id to whatever query PayOS allows)
 */

/** Relative API path template; `{id}` = payment id. Override via env if BE uses another route. */
export const PAYMENT_SERVER_CALLBACK_PATH_TEMPLATE =
  process.env.NEXT_PUBLIC_PAYMENT_SERVER_CALLBACK_PATH?.trim() || '/payments/callback/{id}';

export function buildPaymentServerCallbackPath(paymentId: string): string {
  const id = paymentId.trim();
  if (!id) return '';
  if (PAYMENT_SERVER_CALLBACK_PATH_TEMPLATE.includes('{id}')) {
    return PAYMENT_SERVER_CALLBACK_PATH_TEMPLATE.replace('{id}', encodeURIComponent(id));
  }
  const base = PAYMENT_SERVER_CALLBACK_PATH_TEMPLATE.replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(id)}`;
}

/** Read payment id from PayOS / backend return URL query. */
export function parsePaymentIdFromSearchParams(params: URLSearchParams): string | null {
  const keys = [
    'payment_id',
    'paymentId',
    'payment-id',
    'id',
    'orderCode',
    'order_code',
    'orderId',
    'order_id',
  ];
  for (const key of keys) {
    const v = params.get(key)?.trim();
    if (v) return v;
  }
  return null;
}

export function isPayOSCancelled(params: URLSearchParams): boolean {
  const cancel = params.get('cancel');
  if (cancel === 'true' || cancel === '1') return true;
  const status = (params.get('status') || '').toLowerCase();
  return status === 'cancelled' || status === 'canceled';
}
