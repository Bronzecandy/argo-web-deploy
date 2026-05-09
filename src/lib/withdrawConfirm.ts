import type {
  BuildTransactionResponse,
  ManualBankTransferConfirmResponse,
  MessageResponse,
  PaymentRedirectResponse,
  WithdrawProposalConfirmResponse,
} from '@/src/types/api.types';

export function hasTxBytes(data: unknown): data is BuildTransactionResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tx_bytes' in data &&
    typeof (data as BuildTransactionResponse).tx_bytes === 'string' &&
    !!(data as BuildTransactionResponse).tx_bytes
  );
}

export function isPaymentRedirect(data: unknown): data is PaymentRedirectResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'url' in data &&
    typeof (data as PaymentRedirectResponse).url === 'string' &&
    !!(data as PaymentRedirectResponse).url
  );
}

/** Non-PayOS manual transfer: upload proof to `payment_callback` (full or relative URL). */
export function isManualBankTransferConfirm(data: unknown): data is ManualBankTransferConfirmResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'payment_callback' in data &&
    typeof (data as ManualBankTransferConfirmResponse).payment_callback === 'string' &&
    !!(data as ManualBankTransferConfirmResponse).payment_callback.trim() &&
    !isPaymentRedirect(data) &&
    !hasTxBytes(data)
  );
}

export function isMessageOnly(data: unknown): data is MessageResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as MessageResponse).message === 'string' &&
    !hasTxBytes(data) &&
    !isPaymentRedirect(data)
  );
}

export function normalizeConfirmPayload(data: unknown): WithdrawProposalConfirmResponse | null {
  if (!data || typeof data !== 'object') return null;
  return data as WithdrawProposalConfirmResponse;
}
