import { getWithdrawProposalUiStatus } from '@/src/lib/formatters';
import type { WithdrawProposal } from '@/src/types/api.types';

function pickWeight(fetched: number | undefined, fromList: number | undefined): number {
  const f = fetched ?? 0;
  const l = fromList ?? 0;
  if (f > 0) return f;
  if (l > 0) return l;
  return f || l || 0;
}

/** GET by id may omit vote weights; keep list-row values for progress UI. */
export function mergeWithdrawProposalDetail(
  listRow: WithdrawProposal | null | undefined,
  fetched: WithdrawProposal | null | undefined,
): WithdrawProposal | null {
  if (!listRow && !fetched) return null;
  const base = listRow ?? fetched!;
  const patch = fetched ?? listRow!;
  return {
    ...base,
    ...patch,
    approve_weight: pickWeight(patch.approve_weight, base.approve_weight),
    refuse_weight: pickWeight(patch.refuse_weight, base.refuse_weight),
    withdraw_amount: patch.withdraw_amount || base.withdraw_amount || 0,
    approvers: patch.approvers?.length ? patch.approvers : base.approvers,
    refusers: patch.refusers?.length ? patch.refusers : base.refusers,
  };
}

/** Admin chỉ xác nhận chuyển tiền khi phiên bỏ phiếu đã đóng và đủ ngưỡng duyệt. */
export function canAdminConfirmWithdrawTransfer(proposal: WithdrawProposal): boolean {
  return getWithdrawProposalUiStatus(proposal) === 'Chờ nhận tiền';
}
