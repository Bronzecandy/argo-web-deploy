'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import VoteProgressBar from '@/src/components/ui/VoteProgressBar';
import {
  getRosterApprovePercent,
  getRosterRefusePercent,
  getRosterVoteCounts,
  type VoteRosterRecord,
} from '@/src/lib/voteFields';

type RegistrationVoteSummaryProps = {
  record: VoteRosterRecord;
  className?: string;
};

/** Khối tóm tắt phiếu bầu trên modal chi tiết đăng ký. */
export default function RegistrationVoteSummary({ record, className = '' }: RegistrationVoteSummaryProps) {
  const voteCounts = getRosterVoteCounts(record);
  const approvePct = getRosterApprovePercent(record);
  const refusePct = getRosterRefusePercent(record);

  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50/80 p-4 ${className}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Kết quả bỏ phiếu</p>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-blue-800">
          <ThumbsUp className="h-4 w-4 shrink-0" aria-hidden />
          Đồng ý: {voteCounts.approve}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
          <ThumbsDown className="h-4 w-4 shrink-0" aria-hidden />
          Không đồng ý: {voteCounts.refuse}
        </span>
      </div>
      <VoteProgressBar approvePercent={approvePct} refusePercent={refusePct} showThreshold={false} />
    </div>
  );
}
