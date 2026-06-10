'use client';

import { Calendar, Clock, Wallet } from 'lucide-react';
import StatusBadge from '@/src/components/ui/StatusBadge';
import VoteProgressBar from '@/src/components/ui/VoteProgressBar';
import { btnSecondary } from '@/src/lib/uiClasses';
import {
  formatDate,
  formatDateTimeSeconds,
  formatVND,
  getWithdrawApprovalPercent,
  getWithdrawProposalUiStatus,
  getWithdrawRefusePercent,
  isWithdrawEpochClosedAt,
} from '@/src/lib/formatters';
import type { WithdrawProposal } from '@/src/types/api.types';

type WithdrawProposalCardProps = {
  proposal: WithdrawProposal;
  onDetail: () => void;
  /** Admin list: highlight proposals from local leader pools. */
  showSourceBadge?: boolean;
};

export default function WithdrawProposalCard({
  proposal,
  onDetail,
  showSourceBadge = false,
}: WithdrawProposalCardProps) {
  const status = getWithdrawProposalUiStatus(proposal);
  const approvePct = getWithdrawApprovalPercent(proposal);
  const refusePct = getWithdrawRefusePercent(proposal);
  const isVoting = status === 'Đang bỏ phiếu';

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {showSourceBadge && proposal.is_from_local_pool ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Leader địa phương
            </span>
          ) : null}
        </div>
        <button type="button" onClick={onDetail} className={`shrink-0 ${btnSecondary} !px-3 !py-1.5 text-xs`}>
          Chi tiết
        </button>
      </div>

      <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
        {proposal.description?.trim() || 'Đề xuất rút tiền'}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="font-medium text-slate-800">{proposal.pool_name || '—'}</span>
        </span>
        <span className="font-semibold text-blue-900">{formatVND(proposal.withdraw_amount)}</span>
      </div>

      <div className="mt-4">
        <VoteProgressBar approvePercent={approvePct} refusePercent={refusePct} />
        {isVoting && proposal.closed_at && !isWithdrawEpochClosedAt(proposal.closed_at) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Đóng phiên: {formatDateTimeSeconds(proposal.closed_at)}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          Tạo {formatDate(proposal.created_at)}
        </span>
        {!isVoting && proposal.closed_at && !isWithdrawEpochClosedAt(proposal.closed_at) && (
          <span>Đóng {formatDateTimeSeconds(proposal.closed_at)}</span>
        )}
      </div>
    </article>
  );
}
