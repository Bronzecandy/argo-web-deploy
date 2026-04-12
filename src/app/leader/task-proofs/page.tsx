'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { taskProofService } from '@/src/services/task-proof.service';
import { blobService } from '@/src/services/blob.service';
import type { TaskProof } from '@/src/types/api.types';

const PAGE_SIZE = 10;

function isReviewableStatus(status: string) {
  const s = status?.toLowerCase();
  return s === 'pending' || s === 'pending_review' || s === 'submitted';
}

export default function LeaderTaskProofsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<TaskProof[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [taskId, setTaskId] = useState('');
  const [imageBlobId, setImageBlobId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await taskProofService.list({ page: p, page_size: PAGE_SIZE, sort_order: 'desc' });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load task proofs');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const refresh = () => void loadPage(page);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId.trim() || !imageBlobId.trim()) {
      toast.error('Task ID and image blob ID are required');
      return;
    }
    setSubmitting(true);
    try {
      await taskProofService.submit(taskId.trim(), imageBlobId.trim());
      toast.success('Proof submitted');
      setTaskId('');
      setImageBlobId('');
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await taskProofService.approve(id);
      toast.success('Proof approved');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Approve failed');
    }
  };

  const handleRefuse = async (id: string) => {
    try {
      await taskProofService.refuse(id);
      toast.success('Proof refused');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Refuse failed');
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="image_blob" className="mb-1 block text-xs font-medium text-slate-500">
              Image blob ID
            </label>
            <input
              id="image_blob"
              type="text"
              value={imageBlobId}
              onChange={(e) => setImageBlobId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit proof'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Proofs</h2>
        <DataTable<TaskProof>
          columns={[
            { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
            {
              key: 'task_id',
              label: 'Task',
              render: (r) => (r.task_id ? <span className="font-mono text-xs">{truncateAddress(r.task_id, 4)}</span> : '-'),
            },
            { key: 'actor_address', label: 'Actor', render: (r) => truncateAddress(r.actor_address) },
            {
              key: 'image_blob_id',
              label: 'Image',
              render: (r) => {
                const url = blobService.getUrl(r.image_blob_id);
                if (!url) return '-';
                return (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block" onClick={(e) => e.stopPropagation()}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic API blob URL */}
                    <img src={url} alt="" className="h-12 w-12 rounded-md border border-slate-200 object-cover" />
                  </a>
                );
              },
            },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              label: 'Actions',
              className: 'whitespace-nowrap',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {isReviewableStatus(r.status) ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleApprove(r.id);
                        }}
                        className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRefuse(r.id);
                        }}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Refuse
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              ),
            },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No task proofs"
        />
      </section>
    </div>
  );
}
