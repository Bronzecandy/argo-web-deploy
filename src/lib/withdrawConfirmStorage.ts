/**
 * Session draft for **Admin · Kho bạc** withdraw confirmation only (`/admin/treasury`).
 * Lets treasury staff resume manual bank / PayOS after closing modals without calling `confirm` again.
 */
import type { ManualBankTransferConfirmResponse } from '@/src/types/api.types';

const MANUAL_PREFIX = 'raise_withdraw_confirm_manual_v1:';
const PAYOS_PREFIX = 'raise_withdraw_confirm_payos_v1:';

/** Minimal state restored for PayOS (avoid persisting UI-only `open`). */
export type StoredPayosPayload = {
  url: string;
  paymentId?: string | number;
  title?: string;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveWithdrawManualPayload(proposalId: string, data: ManualBankTransferConfirmResponse) {
  try {
    sessionStorage.setItem(MANUAL_PREFIX + proposalId, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function loadWithdrawManualPayload(proposalId: string): ManualBankTransferConfirmResponse | null {
  return safeParse<ManualBankTransferConfirmResponse>(sessionStorage.getItem(MANUAL_PREFIX + proposalId));
}

export function clearWithdrawManualPayload(proposalId: string) {
  try {
    sessionStorage.removeItem(MANUAL_PREFIX + proposalId);
  } catch {
    /* ignore */
  }
}

export function saveWithdrawPayosPayload(proposalId: string, payload: StoredPayosPayload) {
  try {
    sessionStorage.setItem(PAYOS_PREFIX + proposalId, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadWithdrawPayosPayload(proposalId: string): StoredPayosPayload | null {
  return safeParse<StoredPayosPayload>(sessionStorage.getItem(PAYOS_PREFIX + proposalId));
}

export function clearWithdrawPayosPayload(proposalId: string) {
  try {
    sessionStorage.removeItem(PAYOS_PREFIX + proposalId);
  } catch {
    /* ignore */
  }
}

export function clearWithdrawConfirmPayloads(proposalId: string) {
  clearWithdrawManualPayload(proposalId);
  clearWithdrawPayosPayload(proposalId);
}
