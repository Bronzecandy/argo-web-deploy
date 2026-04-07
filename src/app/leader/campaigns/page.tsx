'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { pendingSpecialNeedsService } from '@/src/services/pending-special-needs.service';
import { childrenService } from '@/src/services/children.service';
import type { CreateSpecialNeedProposalRequest, PendingSpecialNeedProposal } from '@/src/types/api.types';

const PAGE_SIZE = 10;

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
      toast.error('Failed to load special need campaigns');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

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
      toast.success('Special need proposal created');
      setChildId('');
      setDescription('');
      setTarget('');
      setProofBlobId('');
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create proposal');
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
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Pending special needs</h2>
        <DataTable<PendingSpecialNeedProposal>
          columns={[
            { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
            { key: 'child_id', label: 'Child', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.child_id, 4)}</span> },
            {
              key: 'description',
              label: 'Description',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'target', label: 'Target', render: (r) => formatVND(r.target) },
            { key: 'region', label: 'Region' },
            {
              key: 'ai_evaluation',
              label: 'AI evaluation',
              render: (r) => <span className="line-clamp-2 max-w-[200px] text-xs">{r.ai_evaluation || '-'}</span>,
            },
            { key: 'review_status', label: 'Review', render: (r) => <StatusBadge status={r.review_status} /> },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No pending special needs"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create new special need proposal</h2>
        <form onSubmit={handleCreateProposal} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
              Child ID
            </label>
            <input
              id="child_id"
              type="text"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="target" className="mb-1 block text-xs font-medium text-slate-500">
              Target (VND)
            </label>
            <input
              id="target"
              type="number"
              min={1}
              step={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="proof" className="mb-1 block text-xs font-medium text-slate-500">
              Proof blob ID (optional)
            </label>
            <input
              id="proof"
              type="text"
              value={proofBlobId}
              onChange={(e) => setProofBlobId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit proposal'}
          </button>
        </form>
      </section>
    </div>
  );
}
