/**
 * Lưu payment_id lúc bấm «Mở PayOS» — dùng khi redirect về web không kèm query (hoặc chỉ có orderCode).
 */

const STORAGE_KEY = 'raise_payos_pending_v1';

export type PendingPayOSPayment = {
  paymentId: string;
  source?: 'treasury' | 'donate' | 'other';
  proposalId?: string;
  savedAt: number;
};

export function savePendingPayOSPayment(payload: Omit<PendingPayOSPayment, 'savedAt'>) {
  const paymentId = payload.paymentId?.trim();
  if (!paymentId) return;
  try {
    const entry: PendingPayOSPayment = { ...payload, paymentId, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* private mode / quota */
  }
}

export function loadPendingPayOSPayment(): PendingPayOSPayment | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPayOSPayment;
    if (!parsed?.paymentId?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPayOSPayment() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
