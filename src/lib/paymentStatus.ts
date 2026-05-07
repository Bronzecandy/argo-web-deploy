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

export function isPaymentSuccessStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return SUCCESS_STATUSES.has(status);
}
