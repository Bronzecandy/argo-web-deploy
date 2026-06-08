'use client';

import { WITHDRAW_APPROVAL_THRESHOLD } from '@/src/lib/formatters';

type VoteProgressBarProps = {
  approvePercent: number;
  refusePercent?: number;
  threshold?: number;
  className?: string;
};

/** Tiến độ bỏ phiếu đồng ý (và từ chối) cho đề xuất rút tiền. */
export default function VoteProgressBar({
  approvePercent,
  refusePercent = 0,
  threshold = WITHDRAW_APPROVAL_THRESHOLD * 100,
  className = '',
}: VoteProgressBarProps) {
  const approve = Math.max(0, Math.min(100, approvePercent));
  const refuse = Math.max(0, Math.min(100, refusePercent));
  const met = approve >= threshold;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700">Tiến độ đồng ý</span>
        <span className={met ? 'font-semibold text-blue-800' : 'text-slate-600'}>
          {approve}%
          
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${met ? 'bg-blue-800' : 'bg-blue-500'}`}
          style={{ width: `${approve}%` }}
        />
        {refuse > 0 && (
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-red-300/90"
            style={{ width: `${Math.min(refuse, 100 - approve)}%` }}
            title={`Từ chối: ${refuse}%`}
          />
        )}
        <div
          className="absolute inset-y-0 w-0.5 bg-amber-500/80"
          style={{ left: `${threshold}%` }}
          title={`Ngưỡng ${threshold}%`}
        />
      </div>
      {refuse > 0 && (
        <p className="mt-1 text-[11px] text-slate-500">Từ chối: {refuse}% trọng số</p>
      )}
    </div>
  );
}
