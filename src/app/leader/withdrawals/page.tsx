'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import {
  formatDate,
  formatDateTimeSeconds,
  formatVND,
  getWithdrawProposalUiStatus,
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
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

  const columns = [
    { key: 'description', label: 'Mô tả' },
    { key: 'pool_name', label: 'Quỹ' },
    {
      key: 'withdraw_amount',
      label: 'Số tiền',
      render: (row: WithdrawProposal) => formatVND(row.withdraw_amount),
    },
    { key: 'approve_weight', label: 'Trọng số duyệt' },
    { key: 'refuse_weight', label: 'Trọng số từ chối' },
    {
      key: 'status_ui',
      label: 'Trạng thái',
      render: (row: WithdrawProposal) => <StatusBadge status={getWithdrawProposalUiStatus(row)} />,
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      render: (row: WithdrawProposal) => formatDate(row.created_at),
    },
    {
      key: 'closed_at',
      label: 'Thời gian đóng',
      render: (row: WithdrawProposal) => (
        <span className="whitespace-nowrap text-xs text-slate-700">{formatDateTimeSeconds(row.closed_at)}</span>
      ),
    },
    {
      key: 'details',
      label: 'Chi tiết',
      render: (row: WithdrawProposal) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setProposalDetailId(row.id);
            setProposalDetailOpen(true);
          }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Chi tiết
        </button>
      ),
    },
  ];

  const regionBlocked = !canUseRegion;
  const poolFieldsDisabled = regionBlocked || !poolId?.trim();

  const showPoolProofUpload = withdrawMode === 'pool' && canUseRegion && !!poolId?.trim();

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 transition focus:border-blue-800 focus:ring-2';

  return (
    <div>
      <PageHeader
        title="Rút tiền"
        description="Xem đề xuất rút tiền của bạn: rút nhanh theo nhu cầu trẻ trong vùng hoặc đề xuất rút từ quỹ vùng"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Tạo
          </button>
        }
      />

      {!user?.address ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Kết nối ví để xem đề xuất rút tiền của bạn.
        </div>
      ) : (
        <DataTable<WithdrawProposal>
          columns={columns}
          data={rows}
          loading={listLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Chưa có đề xuất"
        />
      )}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10"
          onClick={() => setCreateOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Tạo đề xuất rút</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {poolStatus === 'failed' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Không tải được vùng: {poolError || 'quỹ không khả dụng'}
                </div>
              )}
              {canUseRegion && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Vùng của bạn</p>
                  <p className="mt-1">{poolName}</p>
                </div>
              )}
              {(poolStatus === 'loading' || poolStatus === 'idle') && (
                <p className="text-sm text-slate-500">Đang tải vùng trưởng…</p>
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

              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
              >
                {submitting ? 'Đang gửi…' : 'Gửi'}
              </button>
            </form>
          </div>
        </div>
      )}

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
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs break-all">{proposalDetail.id}</p>
            <p>
              <span className="text-slate-500">Quỹ:</span> {proposalDetail.pool_name}
            </p>
            <p>
              <span className="text-slate-500">Số tiền:</span> {formatVND(proposalDetail.withdraw_amount)}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Trạng thái:</span>
              <StatusBadge status={getWithdrawProposalUiStatus(proposalDetail)} />
            </p>
            <p>
              <span className="text-slate-500">Mô tả:</span> {proposalDetail.description}
            </p>
            <p>
              <span className="text-slate-500">Thời gian đóng:</span> {formatDateTimeSeconds(proposalDetail.closed_at)}
            </p>
            <p>
              <span className="text-slate-500">Ngày tạo:</span> {formatDate(proposalDetail.created_at)}
            </p>
            {proposalDetail.proof_blob_id && (
              <BlobImage blobId={proposalDetail.proof_blob_id} className="max-h-56 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
