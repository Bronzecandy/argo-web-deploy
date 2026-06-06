'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import BlobImage from '@/src/components/ui/BlobImage';
import ContextBanner from '@/src/components/ui/ContextBanner';
import EmptyState from '@/src/components/ui/EmptyState';
import FormModal from '@/src/components/ui/FormModal';
import ListPagination from '@/src/components/ui/ListPagination';
import PageSection from '@/src/components/ui/PageSection';
import VoteProgressBar from '@/src/components/ui/VoteProgressBar';
import WithdrawProposalCard from '@/src/components/leader/WithdrawProposalCard';
import { btnPrimary, inputClass } from '@/src/lib/uiClasses';
import {
  formatDate,
  formatDateTimeSeconds,
  formatVND,
  getWithdrawApprovalPercent,
  getWithdrawProposalUiStatus,
  getWithdrawRefusePercent,
} from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { withdrawService } from '@/src/services/withdraw.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { Plus } from 'lucide-react';
import type { WithdrawProposal } from '@/src/types/api.types';

type WithdrawMode = 'child_quick' | 'pool';

const PAGE_SIZE = 20;

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export default function LeaderWithdrawalsPage() {
  const { execute } = useExecuteTransaction();
  const { user } = useAppSelector((state) => state.auth);
  const { poolId, poolName, status: poolStatus, error: poolError } = useAppSelector((state) => state.leaderPool);
  const [createOpen, setCreateOpen] = useState(false);

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState<WithdrawProposal[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const canUseRegion = poolStatus === 'succeeded' && !!poolName?.trim();

  const [withdrawMode, setWithdrawMode] = useState<WithdrawMode>('child_quick');

  const [poolTaskDescription, setPoolTaskDescription] = useState('');
  const [poolWithdrawAmount, setPoolWithdrawAmount] = useState('');
  const [proofBlobId, setProofBlobId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [proposalDetailOpen, setProposalDetailOpen] = useState(false);
  const [proposalDetailId, setProposalDetailId] = useState<string | null>(null);
  const [proposalDetail, setProposalDetail] = useState<WithdrawProposal | null>(null);
  const [proposalDetailLoading, setProposalDetailLoading] = useState(false);

  const loadProposals = useCallback(async () => {
    const addr = user?.address;
    if (!addr) {
      setRows([]);
      setTotalPages(1);
      return;
    }
    setListLoading(true);
    try {
      const res = await withdrawService.list({
        creator: addr,
        page,
        page_size: PAGE_SIZE,
      });
      const body = res.data;
      setRows(Array.isArray(body.data) ? body.data : []);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không tải được đề xuất'));
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    if (!proposalDetailOpen || !proposalDetailId) {
      setProposalDetail(null);
      return;
    }
    setProposalDetailLoading(true);
    void withdrawService
      .getById(proposalDetailId)
      .then((res) => setProposalDetail(res.data))
      .catch(() => setProposalDetail(null))
      .finally(() => setProposalDetailLoading(false));
  }, [proposalDetailOpen, proposalDetailId]);

  const poolFlowReady =
    canUseRegion &&
    !!poolId?.trim() &&
    !!poolTaskDescription.trim() &&
    Number.isFinite(Number(poolWithdrawAmount)) &&
    Number(poolWithdrawAmount) > 0;

  const canSubmit = withdrawMode === 'pool' ? poolFlowReady : canUseRegion;

  async function handleCreate() {
    const proof = proofBlobId.trim() || undefined;

    if (withdrawMode === 'child_quick') {
      if (!canUseRegion) return;
      setSubmitting(true);
      const ok = await execute(() => withdrawService.proposeChildrenWithdrawals(), {
        successMessage: 'Đã tạo đề xuất rút nhanh cho nhu cầu trẻ',
      });
      if (ok) {
        setProofBlobId('');
        setCreateOpen(false);
        setPage(0);
        void loadProposals();
      }
      setSubmitting(false);
      return;
    }

    if (!poolFlowReady || !poolId?.trim()) return;
    setSubmitting(true);
    const ok = await execute(() =>
      withdrawService.create({
        pool_id: poolId.trim(),
        description: poolTaskDescription.trim(),
        withdraw_amount: Number(poolWithdrawAmount),
        proof_blob_id: proof,
      }),
    );
    if (ok) {
      setPoolTaskDescription('');
      setPoolWithdrawAmount('');
      setProofBlobId('');
      setCreateOpen(false);
      setPage(0);
      void loadProposals();
    }
    setSubmitting(false);
  }

  const openProposalDetail = (id: string) => {
    setProposalDetailId(id);
    setProposalDetailOpen(true);
  };

  const regionBlocked = !canUseRegion;
  const poolFieldsDisabled = regionBlocked || !poolId?.trim();

  const showPoolProofUpload = withdrawMode === 'pool' && canUseRegion && !!poolId?.trim();

  return (
    <div>
      <PageHeader
        title="Rút tiền"
        description="Xem đề xuất rút tiền của bạn: rút nhanh theo nhu cầu trẻ trong vùng hoặc đề xuất rút từ quỹ vùng"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" />
            Tạo
          </button>
        }
      />

      {!user?.address ? (
        <PageSection>
          <p className="text-center text-sm text-slate-500">Kết nối ví để xem đề xuất rút tiền của bạn.</p>
        </PageSection>
      ) : (
        <PageSection title="Đề xuất rút tiền" noPadding>
          {listLoading ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-5">
                  <div className="mb-3 h-6 w-24 rounded bg-slate-100" />
                  <div className="mb-2 h-5 w-full rounded bg-slate-100" />
                  <div className="mb-4 h-4 w-2/3 rounded bg-slate-100" />
                  <div className="h-2.5 w-full rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="Chưa có đề xuất" hint="Nhấn «Tạo» để gửi đề xuất rút tiền mới." />
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {rows.map((row) => (
                <WithdrawProposalCard
                  key={row.id}
                  proposal={row}
                  onDetail={() => openProposalDetail(row.id)}
                />
              ))}
            </div>
          )}
          {!listLoading && rows.length > 0 && (
            <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </PageSection>
      )}
      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo đề xuất rút"
        submitLabel={submitting ? 'Đang gửi…' : 'Gửi'}
        submitDisabled={submitting || !canSubmit}
        onSubmit={() => void handleCreate()}
        wide
      >
        <div className="space-y-4">
              {poolStatus === 'failed' && (
                <ContextBanner variant="error" title="Không tải được vùng">
                  {poolError || 'Quỹ không khả dụng'}
                </ContextBanner>
              )}
              {canUseRegion && (
                <ContextBanner title="Vùng của bạn">{poolName}</ContextBanner>
              )}
              {(poolStatus === 'loading' || poolStatus === 'idle') && (
                <ContextBanner title="Đang tải vùng trưởng">Vui lòng đợi…</ContextBanner>
              )}

              <fieldset className="space-y-2" disabled={regionBlocked}>
                <legend className="mb-2 text-sm font-medium text-slate-700">Loại rút tiền</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="withdrawMode"
                    checked={withdrawMode === 'child_quick'}
                    onChange={() => {
                      setWithdrawMode('child_quick');
                      setPoolTaskDescription('');
                      setPoolWithdrawAmount('');
                    }}
                  />
                  <span>Rút nhanh — nhu cầu trẻ (đề xuất hàng loạt)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="withdrawMode"
                    checked={withdrawMode === 'pool'}
                    onChange={() => {
                      setWithdrawMode('pool');
                    }}
                  />
                  <span>Quỹ vùng — nhiệm vụ chung (không gắn trẻ cụ thể)</span>
                </label>
              </fieldset>

              {withdrawMode === 'child_quick' && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-950">
                  Gửi yêu cầu tạo đề xuất rút cho các nhu cầu trẻ trong vùng (API không cần payload). Sau khi gửi,
                  kiểm tra danh sách đề xuất bên dưới.
                </div>
              )}

              {withdrawMode === 'pool' && canUseRegion && poolId && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
                  Đề xuất rút cho quỹ trưởng vùng (không liên kết trẻ). Mã quỹ:{' '}
                  <span className="font-mono break-all">{poolId}</span>
                </div>
              )}

              {withdrawMode === 'pool' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả</label>
                    <textarea
                      className={`${inputClass} min-h-[100px] resize-y`}
                      disabled={poolFieldsDisabled}
                      value={poolTaskDescription}
                      onChange={(e) => setPoolTaskDescription(e.target.value)}
                      placeholder="Mô tả chi phí hoặc nhiệm vụ (vận hành, logistics, …)"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Số tiền rút (VND)</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={inputClass}
                      disabled={poolFieldsDisabled}
                      value={poolWithdrawAmount}
                      onChange={(e) => setPoolWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Lần rút này không gắn hồ sơ trẻ. Có thể đính kèm ảnh chứng từ bên dưới.
                  </p>
                </>
              )}

              {showPoolProofUpload && (
                <FileUploadInput
                  label="Ảnh chứng từ (tùy chọn)"
                  value={proofBlobId}
                  onChange={setProofBlobId}
                  accept="image/*"
                  placeholder="Tải ảnh chứng từ hoặc dán blob ID"
                />
              )}

        </div>
      </FormModal>

      <DetailModal
        title="Đề xuất rút tiền"
        open={proposalDetailOpen}
        onClose={() => {
          setProposalDetailOpen(false);
          setProposalDetailId(null);
        }}
        loading={proposalDetailLoading}
        wide
      >
        {proposalDetail && (
          <div>
            <DetailField label="Mã" value={<span className="font-mono text-xs break-all">{proposalDetail.id}</span>} />
            <DetailField label="Quỹ" value={proposalDetail.pool_name} />
            <DetailField label="Số tiền" value={formatVND(proposalDetail.withdraw_amount)} />
            <DetailField label="Trạng thái" value={<StatusBadge status={getWithdrawProposalUiStatus(proposalDetail)} />} />
            <DetailField label="Mô tả" value={proposalDetail.description} />
            <div className="border-b border-slate-100 py-2.5">
              <VoteProgressBar
                approvePercent={getWithdrawApprovalPercent(proposalDetail)}
                refusePercent={getWithdrawRefusePercent(proposalDetail)}
              />
            </div>
            <DetailField
              label="Trọng số"
              value={`Đồng ý ${proposalDetail.approve_weight} · Từ chối ${proposalDetail.refuse_weight}`}
            />
            <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(proposalDetail.closed_at)} />
            <DetailField label="Ngày tạo" value={formatDate(proposalDetail.created_at)} />
            {proposalDetail.proof_blob_id && (
              <BlobImage blobId={proposalDetail.proof_blob_id} className="mt-3 max-h-56 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
