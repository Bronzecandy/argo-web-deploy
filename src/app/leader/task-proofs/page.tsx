'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import AiEvaluationBadge from '@/src/components/ui/AiEvaluationBadge';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { selectClass } from '@/src/lib/uiClasses';
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
    <div className="space-y-6">
      <PageHeader
        title="Bằng chứng nhiệm vụ"
        description={
          user?.address
            ? `Duyệt ảnh bằng chứng nhiệm vụ · ${truncateAddress(user.address)}`
            : 'Duyệt ảnh bằng chứng nhiệm vụ'
        }
      />

      <FilterToolbar>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Trạng thái duyệt</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className={`${selectClass} min-w-[200px]`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </FilterToolbar>

      <PageSection title="Danh sách bằng chứng" noPadding>
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
              key: 'ai_evaluation',
              label: 'AI',
              render: (r) => <AiEvaluationBadge record={r} />,
            },
            {
              key: 'review_status',
              label: 'Trạng thái',
              render: (r) => {
                const label = proofReviewStatus(r);
                return label ? <StatusBadge status={label} /> : <span className="text-slate-400">—</span>;
              },
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
                  <div className="flex flex-nowrap items-center gap-1">
                    <TableIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setProofDetailRow(r);
                        setProofDetailId(r.id);
                        setProofDetailOpen(true);
                      }}
                    >
                      Chi tiết
                    </TableIconButton>
                    <TableIconButton
                      variant="primary"
                      disabled={!actionable}
                      title={actionable ? undefined : 'Bằng chứng này đã được duyệt'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!actionable) return;
                        void handleApprove(r.id);
                      }}
                    >
                      Duyệt
                    </TableIconButton>
                    <TableIconButton
                      variant="danger"
                      disabled={!actionable}
                      title={actionable ? undefined : 'Bằng chứng này đã được duyệt'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!actionable) return;
                        void handleRefuse(r.id);
                      }}
                    >
                      Từ chối
                    </TableIconButton>
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
      </PageSection>

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
            <div>
              <DetailField label="Mã" value={<CopyableTruncated value={p.id} chars={4} />} />
              <DetailField label="ID nhiệm vụ" value={p.task_id ? <CopyableTruncated value={p.task_id} chars={4} /> : '—'} />
              <DetailField label="Người thực hiện" value={<CopyableTruncated value={p.actor_address} />} />
              <DetailField label="Hồ sơ người thực hiện" value={p.actor_profile_id ? <CopyableTruncated value={p.actor_profile_id} /> : '—'} />
              <DetailField label="Trạng thái" value={label ? <StatusBadge status={label} /> : <span className="text-slate-400">—</span>} />
              <DetailField label="Mô tả" value={p.description ?? '—'} />
              {p.is_child_task != null && (
                <DetailField label="Nhiệm vụ theo trẻ" value={p.is_child_task ? 'Có' : 'Không'} />
              )}
              <AiInsightPanel record={p} className="my-3" />
              <DetailField label="Ngày gửi thô" value={p.raw_submit_date ? formatDate(p.raw_submit_date) : '—'} />
              <DetailField label="Người duyệt" value={p.reviewed_by ? <CopyableTruncated value={p.reviewed_by} /> : '—'} />
              <DetailField label="Ngày tạo" value={formatDate(p.created_at)} />
              <DetailField label="Cập nhật lúc" value={formatDate(p.updated_at)} />
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
