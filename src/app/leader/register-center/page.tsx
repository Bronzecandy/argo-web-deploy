'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Circle, Check } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import RegisterCenterModal from '@/src/components/leader/RegisterCenterModal';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import { registrationService } from '@/src/services/registration.service';
import { centerService } from '@/src/services/center.service';
import { useAppSelector } from '@/src/store/hooks';
import { userHasAnyRole } from '@/src/services/auth.service';
import { ROLES } from '@/src/lib/constants';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import { formatDateTime } from '@/src/lib/formatters';
import { blobService } from '@/src/services/blob.service';
import type { CenterRequest } from '@/src/types/api.types';

const MIN_VOLUNTEERS_APPROVED = 1;
const MIN_LOCAL_LEADERS_APPROVED = 1;

export default function LeaderRegisterCenterPage() {
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { execute, executing } = useExecuteTransaction();
  const {
    refetch: refetchLeaderCenter,
    status: centerStatus,
    leaderRegion,
    errorMessage: centerError,
  } = useLeaderCenter();

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [volunteerApproved, setVolunteerApproved] = useState(0);
  const [localLeaderApproved, setLocalLeaderApproved] = useState(0);

  const [centerReqRows, setCenterReqRows] = useState<CenterRequest[]>([]);
  const [centerReqLoading, setCenterReqLoading] = useState(false);
  const [confirmBusyId, setConfirmBusyId] = useState<string | null>(null);

  /** Cùng nguồn vùng với danh sách TNV: GET /centers/leader → `region`. */
  const canLoadCounts = centerStatus !== 'loading' && !!leaderRegion?.trim();

  const loadCounts = useCallback(async () => {
    const region = leaderRegion?.trim();
    if (!canLoadCounts || !region) {
      setVolunteerApproved(0);
      setLocalLeaderApproved(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [volRes, llRes] = await Promise.all([
        registrationService.list({
          page: 0,
          page_size: 1,
          register_role: 'Volunteer',
          region,
          status: 'approved',
        }),
        registrationService.list({
          page: 0,
          page_size: 1,
          register_role: 'LocalLeader',
          region,
          status: 'approved',
        }),
      ]);
      setVolunteerApproved(volRes.data.amount ?? 0);
      setLocalLeaderApproved(llRes.data.amount ?? 0);
    } catch {
      setVolunteerApproved(0);
      setLocalLeaderApproved(0);
    } finally {
      setLoading(false);
    }
  }, [canLoadCounts, leaderRegion]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const loadCenterReqs = useCallback(async () => {
    const region = leaderRegion?.trim();
    if (!region || centerStatus === 'loading') {
      setCenterReqRows([]);
      return;
    }
    setCenterReqLoading(true);
    try {
      const res = await centerService.listCenterRequests({
        page: 0,
        page_size: 50,
        region,
        sort_order: 'desc',
      });
      setCenterReqRows((res.data.data ?? []) as CenterRequest[]);
    } catch {
      toast.error('Không tải được đề xuất trung tâm');
      setCenterReqRows([]);
    } finally {
      setCenterReqLoading(false);
    }
  }, [leaderRegion, centerStatus]);

  useEffect(() => {
    void loadCenterReqs();
  }, [loadCenterReqs]);

  const handleConfirmCenterReq = async (id: string) => {
    setConfirmBusyId(id);
    const ok = await execute(() => centerService.confirmCenterRequest(id), {
      successMessage: 'Đã xác nhận đề xuất trung tâm on-chain',
    });
    if (ok) {
      void loadCenterReqs();
      void refetchLeaderCenter();
    }
    setConfirmBusyId(null);
  };

  const selfIsAssignedLeader = user ? userHasAnyRole(user, [ROLES.LOCAL_LEADER]) : false;
  const volunteersOk = volunteerApproved >= MIN_VOLUNTEERS_APPROVED;
  const leadersOk = localLeaderApproved >= MIN_LOCAL_LEADERS_APPROVED || selfIsAssignedLeader;
  const canPropose = canLoadCounts && volunteersOk && leadersOk;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register center"
        description="Create a proposal to establish a support center in your assigned region once minimum staffing is met."
      />

      {centerStatus === 'loading' ? (
        <p className="text-sm text-slate-600">Đang tải vùng từ trung tâm trưởng vùng (GET /centers/leader)…</p>
      ) : !leaderRegion?.trim() ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Không có trường <code className="rounded bg-white px-1">region</code> từ GET /centers/leader — không kiểm tra
          được điều kiện nhân sự theo vùng. Khi API trả về vùng được gán, trang sẽ tự cập nhật.
          {centerError ? <span className="mt-2 block text-xs opacity-90">{centerError}</span> : null}
        </div>
      ) : null}

      {canLoadCounts ? (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Minimum requirements</h2>
        <p className="mb-4 text-sm text-slate-600">
          At least {MIN_LOCAL_LEADERS_APPROVED} approved Local Leader registration(s) and{' '}
          {MIN_VOLUNTEERS_APPROVED} approved Volunteer registration(s) in region{' '}
          <span className="font-medium text-slate-800">{leaderRegion || '—'}</span>.
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            {loading ? (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            ) : leadersOk ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span>
              <span className="font-medium text-slate-800">Local Leaders</span> (approved in region):{' '}
              {loading ? '…' : localLeaderApproved} — need {MIN_LOCAL_LEADERS_APPROVED}+
              {selfIsAssignedLeader && (
                <span className="mt-1 block text-xs text-slate-500">
                  You are assigned as a Local Leader for this app; that satisfies the leader requirement if the count
                  above is still zero.
                </span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            {loading ? (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            ) : volunteersOk ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span>
              <span className="font-medium text-slate-800">Volunteers</span> (approved):{' '}
              {loading ? '…' : volunteerApproved} — need {MIN_VOLUNTEERS_APPROVED}+
            </span>
          </li>
        </ul>

        <div className="mt-6">
          <button
            type="button"
            disabled={!canPropose}
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Building2 className="h-4 w-4" />
            Create center establishment proposal
          </button>
          {!canPropose && canLoadCounts && !loading && (
            <p className="mt-2 text-xs text-slate-500">
              Meet the counts above to enable this action.
            </p>
          )}
        </div>
      </section>
      ) : null}

      {canLoadCounts ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Đề xuất trung tâm trong vùng</h2>
          <p className="mb-4 text-xs text-slate-500">
            Dữ liệu từ GET /center-reqs (lọc theo <span className="font-medium">{leaderRegion}</span>).
          </p>
          {centerReqLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
            </div>
          ) : centerReqRows.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có đề xuất nào cho vùng này.</p>
          ) : (
            <ul className="space-y-4">
              {centerReqRows.map((req) => {
                const imgUrl = blobService.getUrl(req.image_blob_id);
                return (
                  <li
                    key={req.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      {req.image_blob_id?.trim() ? (
                        <div className="shrink-0">
                          {imgUrl ? (
                            <a
                              href={imgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <WalrusFallbackImg
                                blobId={req.image_blob_id}
                                alt=""
                                className="h-24 w-24 rounded-md border border-slate-200 object-cover"
                              />
                            </a>
                          ) : (
                            <WalrusFallbackImg
                              blobId={req.image_blob_id}
                              alt=""
                              className="h-24 w-24 rounded-md border border-slate-200 object-cover"
                            />
                          )}
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={req.status} />
                          <span className="text-xs text-slate-500">
                            Tạo: {formatDateTime(req.created_at)}
                          </span>
                        </div>
                        <p>
                          <span className="text-slate-500">Vùng:</span>{' '}
                          <span className="font-medium">{req.region}</span>
                        </p>
                        <p>
                          <span className="text-slate-500">Địa chỉ:</span>{' '}
                          <CopyableTruncated value={req.address} chars={12} />
                        </p>
                        <p>
                          <span className="text-slate-500">Điện thoại:</span> {req.phone_number || '—'}
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-500">Người tạo:</span>
                          <CopyableTruncated value={req.created_by} chars={8} />
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          ID đề xuất: <CopyableTruncated value={req.id} chars={6} />
                        </p>
                        {req.isAvailableToConfirm ? (
                          <button
                            type="button"
                            disabled={executing || confirmBusyId === req.id}
                            onClick={() => void handleConfirmCenterReq(req.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Xác nhận on-chain
                          </button>
                        ) : (
                          <p className="text-xs text-slate-400">Chưa thể xác nhận (trạng thái hoặc quyền).</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <RegisterCenterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lockedRegion={leaderRegion?.trim() || undefined}
        onSuccess={() => {
          void loadCenterReqs();
          void refetchLeaderCenter().then(() => router.push('/leader'));
        }}
      />
    </div>
  );
}
