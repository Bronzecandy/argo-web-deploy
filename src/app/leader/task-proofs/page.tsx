'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { taskProofService } from '@/src/services/task-proof.service';
import { blobService } from '@/src/services/blob.service';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { TaskProof } from '@/src/types/api.types';

const PAGE_SIZE = 20;

/** Values aligned with backend `review_status` (e.g. "Approved"). */
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Refused', label: 'Đã từ chối' },
  { value: 'Rejected', label: 'Bị từ chối' },
];

/** Normalize API status for comparison (handles "Pending Review", empty, etc.). */
function normalizeProofStatus(status?: string | null) {
  return (status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

/** Show Approve/Refuse unless the proof is clearly finished (matches real API enums + spacing variants). */
const TERMINAL_PROOF_STATUSES = new Set([
  'approved',
  'refused',
  'rejected',
  'completed',
  'executed',
  'cancelled',
  'canceled',
  'closed',
]);

function isProofActionable(status?: string | null) {
  const s = normalizeProofStatus(status);
  if (!s) return true;
  return !TERMINAL_PROOF_STATUSES.has(s);
}

/** Prefer API `review_status`, then legacy `status`. */
function proofReviewStatus(r: TaskProof): string {
  return (r.review_status ?? r.status ?? '').trim();
}

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function LeaderTaskProofsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<TaskProof[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [proofDetailOpen, setProofDetailOpen] = useState(false);
  const [proofDetailId, setProofDetailId] = useState<string | null>(null);
  const [proofDetailRow, setProofDetailRow] = useState<TaskProof | null>(null);
  const [proofDetailData, setProofDetailData] = useState<TaskProof | null>(null);
  const [proofDetailLoading, setProofDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskProofService.list({
        page,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
        review_status: status || undefined,
      });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Không tải được bằng chứng nhiệm vụ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!proofDetailOpen || !proofDetailId) {
      setProofDetailData(null);
      return;
    }
    setProofDetailLoading(true);
    setProofDetailData(null);
    void taskProofService
      .getById(proofDetailId)
      .then((res) => setProofDetailData(res.data ?? null))
      .catch(() => setProofDetailData(null))
      .finally(() => setProofDetailLoading(false));
  }, [proofDetailOpen, proofDetailId]);

  const { execute } = useExecuteTransaction();
  const refresh = () => void load();

  const handleApprove = async (id: string) => {
    const ok = await execute(
      () => taskProofService.approve(id),
      { successMessage: 'Đã duyệt bằng chứng và thực thi on-chain' },
    );
    if (ok) refresh();
  };

  const handleRefuse = async (id: string) => {
    try {
      await taskProofService.refuse(id);
      toast.success('Đã từ chối bằng chứng');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Từ chối thất bại');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bằng chứng nhiệm vụ"
        description={
          user?.address
            ? `Duyệt ảnh bằng chứng nhiệm vụ · ${truncateAddress(user.address)}`
            : 'Duyệt ảnh bằng chứng nhiệm vụ'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Danh sách bằng chứng</h2>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">Trạng thái duyệt</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <DataTable<TaskProof>
          columns={[
            {
              key: 'task_id',
              label: 'Nhiệm vụ',
              render: (r) => (r.task_id ? <CopyableTruncated value={r.task_id} chars={4} /> : '-'),
            },
            { key: 'actor_address', label: 'Người thực hiện', render: (r) => <CopyableTruncated value={r.actor_address} /> },
            {
              key: 'image_blob_id',
              label: 'Ảnh',
              render: (r) => {
                const url = blobService.getUrl(r.image_blob_id);
                if (!url) return '-';
                return (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block" onClick={(e) => e.stopPropagation()}>
                    <WalrusFallbackImg blobId={r.image_blob_id} className="h-12 w-12 rounded-md border border-slate-200 object-cover" />
                  </a>
                );
              },
            },
            {
              key: 'review_status',
              label: 'Trạng thái',
              render: (r) => {
                const label = proofReviewStatus(r);
                return label ? <StatusBadge status={label} /> : <span className="text-slate-400">—</span>;
              },
            },
            {
              key: 'ai_evaluation',
              label: 'Đánh giá AI',
              render: (r) => (
                <span className="max-w-[200px] truncate text-slate-600" title={r.ai_evaluation}>
                  {r.ai_evaluation ?? '—'}
                </span>
              ),
            },
            { key: 'reviewed_by', label: 'Người duyệt', render: (r) => (r.reviewed_by ? <CopyableTruncated value={r.reviewed_by} /> : '-') },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              label: 'Thao tác',
              className: 'whitespace-nowrap',
              render: (r) => {
                const actionable = isProofActionable(proofReviewStatus(r));
                return (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProofDetailRow(r);
                        setProofDetailId(r.id);
                        setProofDetailOpen(true);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      disabled={!actionable}
                      title={actionable ? undefined : 'Bằng chứng này đã được duyệt'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!actionable) return;
                        void handleApprove(r.id);
                      }}
                      className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={!actionable}
                      title={actionable ? undefined : 'Bằng chứng này đã được duyệt'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!actionable) return;
                        void handleRefuse(r.id);
                      }}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale"
                    >
                      Từ chối
                    </button>
                  </div>
                );
              },
            },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Không có bằng chứng nào khớp bộ lọc"
        />
      </section>

      <DetailModal
        title="Chi tiết bằng chứng nhiệm vụ"
        open={proofDetailOpen}
        onClose={() => {
          setProofDetailOpen(false);
          setProofDetailId(null);
          setProofDetailRow(null);
        }}
        loading={proofDetailLoading}
        wide
      >
        {(() => {
          const p = proofDetailData ?? proofDetailRow;
          if (!p) return null;
          const blobs = collectBlobIdEntries(p);
          const label = proofReviewStatus(p);
          return (
            <div className="space-y-1">
              {detailField('Mã', <CopyableTruncated value={p.id} chars={4} />)}
              {detailField('ID nhiệm vụ', p.task_id ? <CopyableTruncated value={p.task_id} chars={4} /> : '—')}
              {detailField('Người thực hiện', <CopyableTruncated value={p.actor_address} />)}
              {detailField('Hồ sơ người thực hiện', p.actor_profile_id ? <CopyableTruncated value={p.actor_profile_id} /> : '—')}
              {detailField('Trạng thái', label ? <StatusBadge status={label} /> : <span className="text-slate-400">—</span>)}
              {detailField('Mô tả', p.description ?? '—')}
              {detailField('Ghi chú AI', p.ai_evaluation ?? '—')}
              {detailField('Ngày gửi thô', p.raw_submit_date ? formatDate(p.raw_submit_date) : '—')}
              {detailField('Người duyệt', p.reviewed_by ? <CopyableTruncated value={p.reviewed_by} /> : '—')}
              {detailField('Ngày tạo', formatDate(p.created_at))}
              {detailField('Cập nhật lúc', formatDate(p.updated_at))}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Ảnh (Walrus)</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} className="h-24 w-24 rounded-md border border-slate-200 object-cover" />
                        <div className="mt-1 text-[10px] text-slate-500">{blobFieldDisplayLabel(key)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </DetailModal>
    </div>
  );
}
