/** Align with mobile PaymentQrScreen success detection. */
const SUCCESS_STATUSES = new Set([
  'PAID',
  'paid',
  'SUCCESS',
  'Success',
  'success',
  'completed',
  'COMPLETED',
]);

const FAILURE_NORMALIZED = new Set([
  'failed',
  'fail',
  'failure',
  'error',
  'refused',
  'rejected',
  'cancelled',
  'canceled',
  'expired',
  'void',
  'voided',
]);

export function isPaymentSuccessStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  if (SUCCESS_STATUSES.has(status)) return true;
  const s = status.trim().toLowerCase();
  return s === 'success' || s === 'paid' || s === 'completed' || s === 'complete';
}

/** Terminal failure / cancelled states from GET /payments/:id */
export function isPaymentFailureStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return FAILURE_NORMALIZED.has(status.trim().toLowerCase());
}
