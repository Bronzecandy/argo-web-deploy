'use client';

import DetailField from '@/src/components/ui/DetailField';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import DetailMediaTile from '@/src/components/registration/DetailMediaTile';
import GuardianDetailCard from '@/src/components/child/GuardianDetailCard';
import { formatGenderVi, normalizeGuardian } from '@/src/lib/childDisplay';
import { formatDate } from '@/src/lib/formatters';
import type { Child } from '@/src/types/api.types';

type ChildProfileDetailContentProps = {
  child: Child;
};

export default function ChildProfileDetailContent({ child: c }: ChildProfileDetailContentProps) {
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';
  const firstGuardian = normalizeGuardian(c.first_guardian);
  const secondGuardian = normalizeGuardian(c.second_guardian);
  const gallery = (c.image_blob_ids ?? []).filter((id) => typeof id === 'string' && id.trim());

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailMediaTile label="Ảnh đại diện trẻ" imageUrl={c.avatar_img_url} blobId={c.avatar_blob_id} />
        <DetailMediaTile
          label="Giấy khai sinh"
          imageUrl={c.birth_certificate_img_url}
          blobId={c.birth_certificate_blob_id}
        />
      </div>

      {(c.home_img_url?.trim() || c.home_blob_id?.trim()) && (
        <DetailMediaTile label="Ảnh nhà / cảnh quan" imageUrl={c.home_img_url} blobId={c.home_blob_id} />
      )}

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
        <h4 className="text-base font-semibold text-slate-900">{fullName}</h4>
        <p className="mt-1 text-sm text-slate-600">
          Vùng: <span className="font-medium text-slate-800">{c.region || '—'}</span>
          {' · '}
          Giới tính: <span className="font-medium text-slate-800">{formatGenderVi(c.gender)}</span>
        </p>
      </div>

      <div className="grid gap-x-6 sm:grid-cols-2">
        <DetailField label="Mã hồ sơ" value={<CopyableTruncated value={c.id} chars={10} />} />
        <DetailField label="Mã định danh" value={c.identity_code || '—'} />
        <DetailField label="Ngày sinh" value={formatDate(c.date_of_birth)} />
        <DetailField label="Địa chỉ nhà" value={c.home_address || '—'} />
        <DetailField
          label="Nhu cầu bữa ăn"
          value={c.meal_need ? <CopyableTruncated value={c.meal_need} chars={10} /> : '—'}
        />
        <DetailField
          label="Nhu cầu bảo hiểm y tế"
          value={
            c.health_insurance_need ? <CopyableTruncated value={c.health_insurance_need} chars={10} /> : '—'
          }
        />
        <DetailField
          label="Nhu cầu sách"
          value={
            c.books_needs?.length ? (
              <div className="flex flex-wrap gap-2">
                {c.books_needs.map((bid) => (
                  <CopyableTruncated key={bid} value={bid} chars={8} />
                ))}
              </div>
            ) : (
              '—'
            )
          }
        />
        <DetailField
          label="Người tải lên"
          value={c.uploaded_by ? <CopyableTruncated value={c.uploaded_by} chars={10} /> : '—'}
        />
        <DetailField label="Ngày tải lên" value={formatDate(c.uploaded_at)} />
        <DetailField label="Cập nhật lúc" value={formatDate(c.updated_at)} />
      </div>

      {firstGuardian ? <GuardianDetailCard title="Người giám hộ thứ nhất" guardian={firstGuardian} /> : null}
      {secondGuardian ? <GuardianDetailCard title="Người giám hộ thứ hai" guardian={secondGuardian} /> : null}

      {gallery.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h5 className="mb-3 text-sm font-semibold text-slate-800">Thư viện ảnh</h5>
          <div className="flex flex-wrap gap-3">
            {gallery.map((blobId) => (
              <EntityBlobThumb
                key={blobId}
                blobId={blobId}
                source="api"
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover sm:h-28 sm:w-28"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
