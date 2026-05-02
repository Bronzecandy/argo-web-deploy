'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { taskProofService } from '@/src/services/task-proof.service';
import { blobService } from '@/src/services/blob.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { TaskProof } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminTaskProofsPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<TaskProof[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskProofService.list({
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
        sort_order: 'desc',
      });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load task proofs');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const { execute } = useExecuteTransaction();
  const refresh = () => void load();

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
      toast.success('Proof refused');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Refuse failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Task proofs"
        description="Review submitted proof images for tasks"
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable<TaskProof>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No task proofs match your filters"
        columns={[
          { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
          { key: 'task_id', label: 'Task', render: (r) => (r.task_id ? truncateAddress(r.task_id, 4) : '-') },
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
          { key: 'reviewed_by', label: 'Reviewed by', render: (r) => (r.reviewed_by ? truncateAddress(r.reviewed_by) : '-') },
          { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          {
            key: 'actions',
            label: 'Actions',
            className: 'whitespace-nowrap',
            render: (r) => (
              <div className="flex flex-wrap gap-1">
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
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
