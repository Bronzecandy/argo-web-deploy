'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAppSelector } from '@/src/store/hooks';
import { pendingSpecialNeedsService } from '@/src/services/pending-special-needs.service';
import { childrenService } from '@/src/services/children.service';
import type { CreateSpecialNeedProposalRequest, PendingSpecialNeedProposal } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function LeaderCampaignsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PendingSpecialNeedProposal[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [proofBlobId, setProofBlobId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<PendingSpecialNeedProposal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await pendingSpecialNeedsService.list({
        page: p,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
      });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Không tải được chiến dịch nhu cầu đặc biệt');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  useEffect(() => {
    if (!detailId) {
      setDetailRow(null);
      return;
    }
    setDetailLoading(true);
    void pendingSpecialNeedsService
      .getById(detailId)
      .then((res) => setDetailRow(res.data))
      .catch(() => setDetailRow(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = Number(target);
    if (!childId.trim() || !description.trim() || !Number.isFinite(targetNum) || targetNum <= 0) {
      toast.error('Valid child ID, description, and target amount are required');
      return;
    }
    const data: CreateSpecialNeedProposalRequest = {
      child_id: childId.trim(),
      description: description.trim(),
      target: targetNum,
      ...(proofBlobId.trim() ? { proof_blob_id: proofBlobId.trim() } : {}),
    };
    setSubmitting(true);
    try {
      await childrenService.createSpecialNeedProposal(data);
      toast.success('Đã tạo đề xuất nhu cầu đặc biệt');
      setChildId('');
      setDescription('');
      setTarget('');
      setProofBlobId('');
      setCreateOpen(false);
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Không tạo được đề xuất');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Special need campaigns"
        description={
          user?.address
            ? `Review pending proposals and submit new urgent special needs · ${truncateAddress(user.address)}`
            : 'Review pending proposals and submit new urgent special needs'
        }
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Create proposal
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Pending special needs</h2>
        <DataTable<PendingSpecialNeedProposal>
          columns={[
            { key: 'child_id', label: 'Child', render: (r) => <CopyableTruncated value={r.child_id} chars={4} /> },
            {
              key: 'description',
              label: 'Description',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'target', label: 'Target', render: (r) => formatVND(r.target) },
            { key: 'region', label: 'Vùng' },
            {
              key: 'ai_evaluation',
              label: 'AI evaluation',
              render: (r) => <span className="line-clamp-2 max-w-[200px] text-xs">{r.ai_evaluation || '-'}</span>,
            },
            { key: 'review_status', label: 'Review', render: (r) => <StatusBadge status={r.review_status} /> },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'details',
              label: 'Chi tiết',
              render: (r) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailId(r.id);
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Details
                </button>
              ),
            },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No pending special needs"
        />
      </section>

      <DetailModal
        title="Special need proposal"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailRow && (
          <div className="space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">ID:</span> <CopyableTruncated value={detailRow.id} chars={4} />
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Child:</span> <CopyableTruncated value={detailRow.child_id} chars={4} />
            </p>
            <p>
              <span className="text-slate-500">Region:</span> {detailRow.region}
            </p>
            <p>
              <span className="text-slate-500">Description:</span> {detailRow.description}
            </p>
            <p>
              <span className="text-slate-500">Target:</span> {formatVND(detailRow.target)}
            </p>
            <p>
              <span className="text-slate-500">AI:</span> {detailRow.ai_evaluation || '—'}
            </p>
            {detailRow.proof_blob_id && (
              <BlobImage blobId={detailRow.proof_blob_id} className="max-h-56 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create special need proposal</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
                  Child ID
                </label>
                <input
                  id="child_id"
                  type="text"
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <div>
                <label htmlFor="desc" className="mb-1 block text-xs font-medium text-slate-500">
                  Description
                </label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <div>
                <label htmlFor="target" className="mb-1 block text-xs font-medium text-slate-500">
                  Target (VND)
                </label>
                <GroupedNumericInput
                  id="target"
                  min={1}
                  value={target}
                  onChange={setTarget}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <FileUploadInput label="Proof (optional)" value={proofBlobId} onChange={setProofBlobId} />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit proposal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
