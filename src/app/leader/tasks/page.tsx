'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { taskService } from '@/src/services/task.service';
import type { Task } from '@/src/types/api.types';
import { Hand, ClipboardCheck, ThumbsUp, ThumbsDown } from 'lucide-react';

const PAGE_SIZE = 10;

export default function LeaderTasksPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Task[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Review modal
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewVote, setReviewVote] = useState(true);
  const [reviewReason, setReviewReason] = useState('');

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await taskService.list({ page: p, page_size: PAGE_SIZE, sort_order: 'desc' });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tasks');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const refresh = () => void loadPage(page);

  const handleClaim = async (id: string) => {
    setBusyId(id);
    try {
      await taskService.claim(id);
      toast.success('Task claimed successfully');
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to claim task');
    } finally {
      setBusyId(null);
    }
  };

  const handleReview = async () => {
    if (!reviewTask) return;
    setBusyId(reviewTask.id);
    try {
      await taskService.review(reviewTask.id, reviewVote, reviewVote ? undefined : reviewReason || undefined);
      toast.success(reviewVote ? 'Task approved' : 'Task refused');
      setReviewTask(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Review failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !region.trim() || !startPeriod || !endPeriod) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await taskService.create({
        description: description.trim(),
        region: region.trim(),
        start_period: startPeriod,
        end_period: endPeriod,
      });
      toast.success('Task created');
      setDescription('');
      setRegion('');
      setStartPeriod('');
      setEndPeriod('');
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks"
        description={
          user?.address
            ? `View and create regional tasks · ${truncateAddress(user.address)}`
            : 'View and create regional tasks'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">All tasks</h2>
        <DataTable<Task>
          columns={[
            { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
            {
              key: 'description',
              label: 'Description',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'region', label: 'Region' },
            { key: 'start_period', label: 'Start', render: (r) => formatDate(r.start_period) },
            { key: 'end_period', label: 'End', render: (r) => formatDate(r.end_period) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'assigned_staff',
              label: 'Assigned',
              render: (r) => (r.assigned_staff ? truncateAddress(r.assigned_staff) : '-'),
            },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              label: 'Actions',
              className: 'whitespace-nowrap',
              render: (r) => {
                const s = r.status?.toLowerCase();
                const isAssigned = !!r.assigned_staff;
                return (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    {!isAssigned && (s === 'pending' || s === 'open') && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void handleClaim(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Hand className="h-3 w-3" /> Claim
                      </button>
                    )}
                    {(s === 'submitted' || s === 'pending_review' || s === 'completed') && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => { setReviewTask(r); setReviewVote(true); setReviewReason(''); }}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <ClipboardCheck className="h-3 w-3" /> Review
                      </button>
                    )}
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
          emptyMessage="No tasks"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create new task</h2>
        <form onSubmit={handleCreate} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="task-desc" className="mb-1 block text-xs font-medium text-slate-500">
              Description
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="task-region" className="mb-1 block text-xs font-medium text-slate-500">
              Region
            </label>
            <input
              id="task-region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start" className="mb-1 block text-xs font-medium text-slate-500">
                Start period
              </label>
              <input
                id="start"
                type="date"
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label htmlFor="end" className="mb-1 block text-xs font-medium text-slate-500">
                End period
              </label>
              <input
                id="end"
                type="date"
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </form>
      </section>

      {/* Review Modal */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Review Task</h3>
            <div className="rounded-lg bg-slate-50 p-3 mb-4 text-sm">
              <p><span className="font-medium">Task:</span> {truncateAddress(reviewTask.id, 8)}</p>
              <p className="mt-1"><span className="font-medium">Description:</span> {reviewTask.description}</p>
              <p className="mt-1"><span className="font-medium">Region:</span> {reviewTask.region}</p>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setReviewVote(true)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition ${
                  reviewVote ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'
                }`}
              >
                <ThumbsUp className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => setReviewVote(false)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition ${
                  !reviewVote ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'
                }`}
              >
                <ThumbsDown className="h-4 w-4" /> Refuse
              </button>
            </div>

            {!reviewVote && (
              <textarea
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Reason for refusal..."
                rows={2}
                className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReviewTask(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReview()}
                disabled={busyId === reviewTask.id}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  reviewVote ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {busyId === reviewTask.id ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
