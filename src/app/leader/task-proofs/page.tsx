'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { collectBlobIdEntries } from '@/src/lib/blobFields';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { taskProofService } from '@/src/services/task-proof.service';
import { blobService } from '@/src/services/blob.service';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import type { TaskProof } from '@/src/types/api.types';

const PAGE_SIZE = 20;

/** Values aligned with backend `review_status` (e.g. "Approved"). */
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'Pending', label: 'Pending' },
  { value: 'PendingReview', label: 'Pending review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Refused', label: 'Refused' },
  { value: 'Rejected', label: 'Rejected' },
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
  const [taskId, setTaskId] = useState('');
  const [imageBlobId, setImageBlobId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listVersion, setListVersion] = useState(0);

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
  }, [page, status, listVersion]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId.trim() || !imageBlobId.trim()) {
      toast.error('Task ID and image blob ID are required');
      return;
    }
    setSubmitting(true);
    try {
      await taskProofService.submit(taskId.trim(), imageBlobId.trim());
      toast.success('Đã gửi bằng chứng');
      setTaskId('');
      setImageBlobId('');
      setPage(0);
      setListVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
      toast.error('Không gửi được bằng chứng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const ok = await execute(
      () => taskProofService.approve(id),
      { successMessage: 'Proof approved & executed on-chain' },
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
        title="Task proofs"
        description={
          user?.address
            ? `Submit and review task proof images · ${truncateAddress(user.address)}`
            : 'Submit and review task proof images'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Submit new proof</h2>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="task_id" className="mb-1 block text-xs font-medium text-slate-500">
              Task ID
            </label>
            <input
              id="task_id"
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
          </div>
          <FileUploadInput
            label="Proof image"
            value={imageBlobId}
            onChange={setImageBlobId}
            accept="image/*"
            placeholder="Upload proof image or paste blob ID"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit proof'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Proofs</h2>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">Review status</label>
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
              label: 'Task',
              render: (r) => (r.task_id ? <CopyableTruncated value={r.task_id} chars={4} /> : '-'),
            },
            { key: 'actor_address', label: 'Actor', render: (r) => <CopyableTruncated value={r.actor_address} /> },
            {
              key: 'image_blob_id',
              label: 'Image',
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
              label: 'Status',
              render: (r) => {
                const label = proofReviewStatus(r);
                return label ? <StatusBadge status={label} /> : <span className="text-slate-400">—</span>;
              },
            },
            { key: 'reviewed_by', label: 'Reviewed by', render: (r) => (r.reviewed_by ? <CopyableTruncated value={r.reviewed_by} /> : '-') },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              label: 'Actions',
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
                      Details
                    </button>
                    <button
                      type="button"
                      disabled={!actionable}
                      title={actionable ? undefined : 'This proof is already reviewed'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!actionable) return;
                        void handleApprove(r.id);
                      }}
                      className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={!actionable}
                      title={actionable ? undefined : 'This proof is already reviewed'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!actionable) return;
                        void handleRefuse(r.id);
                      }}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale"
                    >
                      Refuse
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
          emptyMessage="No task proofs match your filters"
        />
      </section>

      <DetailModal
        title="Task proof"
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
              {detailField('ID', <CopyableTruncated value={p.id} chars={4} />)}
              {detailField('Task ID', p.task_id ? <CopyableTruncated value={p.task_id} chars={4} /> : '—')}
              {detailField('Actor', <CopyableTruncated value={p.actor_address} />)}
              {detailField('Actor profile', p.actor_profile_id ? <CopyableTruncated value={p.actor_profile_id} /> : '—')}
              {detailField('Status', label ? <StatusBadge status={label} /> : <span className="text-slate-400">—</span>)}
              {detailField('Description', p.description ?? '—')}
              {detailField('AI note', p.ai_evaluation ?? '—')}
              {detailField('Raw submit date', p.raw_submit_date ? formatDate(p.raw_submit_date) : '—')}
              {detailField('Reviewed by', p.reviewed_by ? <CopyableTruncated value={p.reviewed_by} /> : '—')}
              {detailField('Ngày tạo', formatDate(p.created_at))}
              {detailField('Updated', formatDate(p.updated_at))}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Images (Walrus)</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} className="h-24 w-24 rounded-md border border-slate-200 object-cover" />
                        <div className="mt-1 text-[10px] text-slate-500">{key}</div>
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
