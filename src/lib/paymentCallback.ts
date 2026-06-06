import { loadPendingPayOSPayment } from '@/src/lib/paymentSessionStorage';

/**
 * PayOS return URL → trang web (không trỏ thẳng API). Trang web gọi GET server callback rồi poll status.
 *
 * BE khi tạo link PayOS — set returnUrl:
 *   `${NEXT_PUBLIC_APP_URL}${NEXT_PUBLIC_PAYMENT_CALLBACK_PATH}?payment_id={paymentId}`
 * Ví dụ production: https://argo-web-deploy.vercel.app/payment/callback?payment_id=abc-123
 *
 * FE cũng lưu payment_id vào sessionStorage lúc bấm «Mở PayOS» (phòng redirect thiếu query).
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

/** URL query trước, sau đó sessionStorage (lúc bấm thanh toán). */
export function resolvePaymentIdForCallback(params: URLSearchParams): string | null {
  const fromUrl = parsePaymentIdFromSearchParams(params);
  if (fromUrl) return fromUrl;
  return loadPendingPayOSPayment()?.paymentId?.trim() || null;
}
