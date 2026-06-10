'use client';

import DetailField from '@/src/components/ui/DetailField';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import DetailMediaTile from '@/src/components/registration/DetailMediaTile';
import RegistrationVoteSummary from '@/src/components/registration/RegistrationVoteSummary';
import GuardianDetailCard from '@/src/components/child/GuardianDetailCard';
import { formatGenderVi, normalizeGuardian } from '@/src/lib/childDisplay';
import { formatDate, formatDateTimeSeconds } from '@/src/lib/formatters';
import type { UploadChildRequestEntity } from '@/src/types/api.types';

type UploadChildRequestDetailContentProps = {
  record: UploadChildRequestEntity;
};

export default function UploadChildRequestDetailContent({ record: u }: UploadChildRequestDetailContentProps) {
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
  const firstGuardian = normalizeGuardian(u.first_guardian_profile);
  const secondGuardian = normalizeGuardian(u.second_guardian_profile);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailMediaTile label="Ảnh đại diện trẻ" imageUrl={u.avatar_img_url} blobId={u.avatar_blob_id} />
        <DetailMediaTile
          label="Giấy khai sinh"
          imageUrl={u.birth_certificate_img_url}
          blobId={u.birth_certificate_blob_id}
        />
      </div>

      {(u.home_img_url?.trim() || u.home_blob_id?.trim()) && (
        <DetailMediaTile label="Ảnh nhà / cảnh quan" imageUrl={u.home_img_url} blobId={u.home_blob_id} />
      )}

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-semibold text-slate-900">{fullName}</h4>
          <StatusBadge status={u.status} />
          {u.review_status ? <StatusBadge status={u.review_status} /> : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Vùng: <span className="font-medium text-slate-800">{u.region || '—'}</span>
          {' · '}
          Giới tính: <span className="font-medium text-slate-800">{formatGenderVi(u.gender)}</span>
        </p>
      </div>

      <RegistrationVoteSummary record={u} />

      <div className="grid gap-x-6 sm:grid-cols-2">
        <DetailField label="Mã yêu cầu" value={<CopyableTruncated value={u.id} chars={10} />} />
        <DetailField label="Mã hồ sơ" value={<CopyableTruncated value={u.profile_id} chars={10} />} />
        <DetailField label="Mã định danh" value={u.identity_code || '—'} />
        <DetailField label="Ngày sinh" value={formatDate(u.date_of_birth)} />
        <DetailField label="Địa chỉ nhà" value={u.home_address || '—'} />
        <DetailField
          label="Người duyệt"
          value={u.reviewed_by ? <CopyableTruncated value={u.reviewed_by} chars={10} /> : '—'}
        />
        <DetailField label="Người tạo" value={<CopyableTruncated value={u.created_by} chars={10} />} />
        <DetailField label="Ngày tạo" value={formatDate(u.created_at)} />
        <DetailField label="Cập nhật lúc" value={formatDate(u.updated_at)} />
        <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(u.closed_at)} />
        <DetailField label="Xác nhận tải lên" value={u.is_confirm_upload ? 'Đã xác nhận' : 'Chưa xác nhận'} />
      </div>

      {firstGuardian ? <GuardianDetailCard title="Người giám hộ thứ nhất" guardian={firstGuardian} /> : null}
      {secondGuardian ? <GuardianDetailCard title="Người giám hộ thứ hai" guardian={secondGuardian} /> : null}

      <AiInsightPanel record={u} />
    </div>
  );
}
