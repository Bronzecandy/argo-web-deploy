'use client';

import DetailField from '@/src/components/ui/DetailField';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import DetailMediaTile from '@/src/components/registration/DetailMediaTile';
import RegistrationVoteSummary from '@/src/components/registration/RegistrationVoteSummary';
import { formatRegisterRoleVi } from '@/src/lib/registrationDisplay';
import { formatDate, formatDateTimeSeconds } from '@/src/lib/formatters';
import type { RegistrationRequest } from '@/src/types/api.types';

type RegistrationDetailContentProps = {
  record: RegistrationRequest;
};

export default function RegistrationDetailContent({ record: r }: RegistrationDetailContentProps) {
  const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailMediaTile
          label="Ảnh đại diện"
          imageUrl={r.avatar_img_url}
          blobId={r.avatar_blob_id}
        />
        <DetailMediaTile
          label="Căn cước công dân"
          imageUrl={r.identity_card_img_url}
          blobId={r.identity_card_blob_id}
        />
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-semibold text-slate-900">{fullName}</h4>
          <StatusBadge status={r.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Vai trò đăng ký: <span className="font-medium text-slate-800">{formatRegisterRoleVi(r.register_role)}</span>
          {r.region ? (
            <>
              {' '}
              · Vùng: <span className="font-medium text-slate-800">{r.region}</span>
            </>
          ) : null}
        </p>
      </div>

      <RegistrationVoteSummary record={r} />

      <div className="grid gap-x-6 sm:grid-cols-2">
        <DetailField label="Mã yêu cầu" value={<CopyableTruncated value={r.id} chars={10} />} />
        <DetailField label="Mã định danh" value={r.identity_code || '—'} />
        <DetailField label="Email" value={r.email || '—'} />
        <DetailField label="Điện thoại" value={r.phone_number || '—'} />
        <DetailField label="Giới tính" value={r.gender || '—'} />
        <DetailField label="Ngày sinh" value={formatDate(r.date_of_birth)} />
        <DetailField label="Người tạo" value={<CopyableTruncated value={r.created_by} chars={10} />} />
        <DetailField label="Ngày tạo" value={formatDate(r.created_at)} />
        <DetailField label="Cập nhật lúc" value={formatDate(r.updated_at)} />
        <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(r.closed_at)} />
      </div>

      <AiInsightPanel record={r} />
    </div>
  );
}
