import type { TransactionRecord } from '@/src/types/api.types';

/** Giá trị `action_type` từ BE cho giao dịch quyên góp. */
export const TX_ACTION_DONATE = 'Donate';

/** Giá trị `action_type` từ BE cho giao dịch rút tiền. */
export const TX_ACTION_WITHDRAW = 'Withdraw';

export function isDonateTransaction(tx: TransactionRecord): boolean {
  return (tx.action_type ?? '').trim() === TX_ACTION_DONATE;
}

export function isWithdrawTransaction(tx: TransactionRecord): boolean {
  return (tx.action_type ?? '').trim() === TX_ACTION_WITHDRAW;
}
