'use client';

import DetailMediaTile from '@/src/components/registration/DetailMediaTile';
import type { NormalizedGuardian } from '@/src/lib/childDisplay';

type GuardianDetailCardProps = {
  title: string;
  guardian: NormalizedGuardian;
};

export default function GuardianDetailCard({ title, guardian }: GuardianDetailCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <h5 className="text-sm font-semibold text-slate-800">{title}</h5>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500">Họ và tên</dt>
            <dd className="font-medium text-slate-900">{guardian.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Quan hệ với trẻ</dt>
            <dd className="text-slate-800">{guardian.relationLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Số điện thoại</dt>
            <dd className="text-slate-800">{guardian.phone}</dd>
          </div>
        </dl>
        <DetailMediaTile
          label="Căn cước người giám hộ"
          imageUrl={guardian.identityCardImgUrl}
          blobId={guardian.identityCardBlobId}
        />
      </div>
    </section>
  );
}
