'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { taskProofService } from '@/src/services/task-proof.service';
import { blobService } from '@/src/services/blob.service';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import type { TaskProof } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function VolunteerTaskProofsPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId.trim() || !imageBlobId.trim()) {
      toast.error('Task ID and proof image are required');
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Task Proofs"
        description="Submit proof of task completion and track submissions"
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Submit new proof</h2>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="vol-task-id" className="mb-1 block text-xs font-medium text-slate-500">
              Task ID
            </label>
            <input
              id="vol-task-id"
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="Enter the task ID you completed"
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit proof'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">My Proofs</h2>
        <DataTable<TaskProof>
          columns={[
            { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
            {
              key: 'task_id',
              label: 'Task',
              render: (r) => (r.task_id ? <span className="font-mono text-xs">{truncateAddress(r.task_id, 4)}</span> : '-'),
            },
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
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.review_status ?? r.status ?? '—'} /> },
            { key: 'reviewed_by', label: 'Reviewed by', render: (r) => (r.reviewed_by ? truncateAddress(r.reviewed_by) : '-') },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No proofs submitted yet"
        />
      </section>
    </div>
  );
}
