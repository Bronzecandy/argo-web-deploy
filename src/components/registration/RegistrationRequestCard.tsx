'use client';

import { Calendar, Clock, ThumbsDown, ThumbsUp } from 'lucide-react';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import VoteProgressBar from '@/src/components/ui/VoteProgressBar';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { formatRegisterRoleVi } from '@/src/lib/registrationDisplay';
import { formatDate, formatDateTimeSeconds } from '@/src/lib/formatters';
import {
  getRosterApprovePercent,
  getRosterRefusePercent,
  getRosterVoteCounts,
} from '@/src/lib/voteFields';
import type { RegistrationRequest } from '@/src/types/api.types';

type RegistrationRequestCardProps = {
  registration: RegistrationRequest;
  onDetail: () => void;
  onVoteYes: () => void;
  onVoteNo: () => void;
  voteLocked: boolean;
  userVoted: boolean;
  voteBusy: boolean;
  actionsDisabled?: boolean;
};

export default function RegistrationRequestCard({
  registration: r,
  onDetail,
  onVoteYes,
  onVoteNo,
  voteLocked,
  userVoted,
  voteBusy,
  actionsDisabled = false,
}: RegistrationRequestCardProps) {
  const voteCounts = getRosterVoteCounts(r);
  const approvePct = getRosterApprovePercent(r);
  const refusePct = getRosterRefusePercent(r);
  const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        {r.avatar_blob_id?.trim() ? (
          <div className="shrink-0">
            <EntityBlobThumb blobId={r.avatar_blob_id} className="h-16 w-16 rounded-lg border border-slate-200 sm:h-20 sm:w-20" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Tạo: {formatDate(r.created_at)}
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-900">{fullName}</h3>

          <dl className="mt-2 space-y-1 text-sm text-slate-600">
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-slate-500">Vai trò:</dt>
              <dd className="font-medium text-slate-800">{formatRegisterRoleVi(r.register_role)}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-slate-500">Vùng:</dt>
              <dd>{r.region || '—'}</dd>
            </div>
            {r.phone_number ? (
              <div className="flex flex-wrap gap-x-1">
                <dt className="text-slate-500">Điện thoại:</dt>
                <dd>{r.phone_number}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-1 text-xs">
              <dt className="text-slate-500">Mã yêu cầu:</dt>
              <dd>
                <CopyableTruncated value={r.id} chars={8} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-blue-800">
          <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Đồng ý: {voteCounts.approve}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
          <ThumbsDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Không đồng ý: {voteCounts.refuse}
        </span>
      </div>

      <div className="mt-3">
        <VoteProgressBar
          approvePercent={approvePct}
          refusePercent={refusePct}
          showThreshold={false}
        />
      </div>

      {r.closed_at ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Đóng phiên: {formatDateTimeSeconds(r.closed_at)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <TableIconButton onClick={onDetail}>Chi tiết</TableIconButton>
        <div
          className={`flex flex-wrap gap-1 ${voteLocked ? 'pointer-events-none opacity-40' : ''}`}
          title={userVoted ? 'Bạn đã bỏ phiếu' : undefined}
        >
          <TableIconButton
            variant="primary"
            disabled={voteLocked || voteBusy || actionsDisabled}
            onClick={onVoteYes}
            title="Phiếu đồng ý"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </TableIconButton>
          <TableIconButton
            variant="danger"
            disabled={voteLocked || voteBusy || actionsDisabled}
            onClick={onVoteNo}
            title="Phiếu không đồng ý"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </TableIconButton>
        </div>
      </div>
    </article>
  );
}
