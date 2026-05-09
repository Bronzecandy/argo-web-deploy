'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { collectBlobIdEntries } from '@/src/lib/blobFields';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { taskService } from '@/src/services/task.service';
import type { Task } from '@/src/types/api.types';
import { Hand, ClipboardCheck, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';

const PAGE_SIZE = 20;

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function LeaderTasksPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { poolName, status: poolStatus, error: poolError } = useAppSelector((state) => state.leaderPool);

  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Task[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);

  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewVote, setReviewVote] = useState(true);
  const [reviewReason, setReviewReason] = useState('');

  const [createOpen, setCreateOpen] = useState(false);

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [taskDetailRow, setTaskDetailRow] = useState<Task | null>(null);
  const [taskDetailData, setTaskDetailData] = useState<Task | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);

  const canUsePool = poolStatus === 'succeeded' && !!poolName;

  const loadPage = useCallback(
    async (p: number) => {
      if (poolStatus === 'loading' || poolStatus === 'idle') {
        setLoading(true);
        setRows([]);
        return;
      }
      if (!canUsePool) {
        setLoading(false);
        setRows([]);
        setTotalPages(1);
        return;
      }

      setLoading(true);
      try {
        const res = await taskService.list({
          page: p,
          page_size: PAGE_SIZE,
          sort_order: 'desc',
          region: poolName,
        });
        setRows(res.data.data ?? []);
        setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load tasks');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [poolName, poolStatus, canUsePool],
  );

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage, listVersion]);

  useEffect(() => {
    if (!taskDetailOpen || !taskDetailId) {
      setTaskDetailData(null);
      return;
    }
    setTaskDetailLoading(true);
    setTaskDetailData(null);
    void taskService
      .getById(taskDetailId)
      .then((res) => setTaskDetailData(res.data ?? null))
      .catch(() => setTaskDetailData(null))
      .finally(() => setTaskDetailLoading(false));
  }, [taskDetailOpen, taskDetailId]);

  const refresh = () => void loadPage(page);

  const handleClaim = async (id: string) => {
    setBusyId(id);
    try {
      await taskService.claim(id);
      toast.success('Task claimed successfully');
      refresh();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(msg || 'Failed to claim task');
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
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(msg || 'Review failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUsePool || !poolName) {
      toast.error('Your leader region is not loaded yet. Please wait or try again later.');
      return;
    }
    if (!description.trim() || !startPeriod || !endPeriod) {
      toast.error('Description and date range are required');
      return;
    }
    setSubmitting(true);
    try {
      await taskService.create({
        description: description.trim(),
        region: poolName,
        start_period: startPeriod,
        end_period: endPeriod,
      });
      toast.success('Task created');
      setDescription('');
      setStartPeriod('');
      setEndPeriod('');
      setCreateOpen(false);
      setPage(0);
      setListVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const emptyMsg =
    poolStatus === 'failed'
      ? poolError || 'Could not resolve your region for task list.'
      : canUsePool
        ? 'No tasks in your region'
        : 'Loading your region…';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks"
        description={
          user?.address
            ? `Tasks for your assigned region · ${truncateAddress(user.address)}`
            : 'Tasks for your assigned region'
        }
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tasks in your region</h2>
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
                    <button
                      type="button"
                      onClick={() => {
                        setTaskDetailRow(r);
                        setTaskDetailId(r.id);
                        setTaskDetailOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Details
                    </button>
                    {!isAssigned && (s === 'pending' || s === 'open') && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void handleClaim(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Hand className="h-3 w-3" /> Claim
                      </button>
                    )}
                    {(s === 'submitted' || s === 'pending_review' || s === 'completed') && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => {
                          setReviewTask(r);
                          setReviewVote(true);
                          setReviewReason('');
                        }}
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
          emptyMessage={emptyMsg}
        />
      </section>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10"
          onClick={() => setCreateOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Create new task</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Region</span> is fixed to your leader pool:{' '}
              <span className="font-semibold text-blue-900">{canUsePool ? poolName : '…'}</span>
              {poolStatus === 'failed' && (
                <span className="mt-2 block text-red-700">
                  Pool failed to load — you cannot create tasks until this is fixed.
                </span>
              )}
            </p>
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || !canUsePool}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Review Task</h3>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p>
                <span className="font-medium">Task:</span> {truncateAddress(reviewTask.id, 8)}
              </p>
              <p className="mt-1">
                <span className="font-medium">Description:</span> {reviewTask.description}
              </p>
              <p className="mt-1">
                <span className="font-medium">Region:</span> {reviewTask.region}
              </p>
            </div>

            <div className="mb-4 flex gap-3">
              <button
                type="button"
                onClick={() => setReviewVote(true)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition ${
                  reviewVote ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-500'
                }`}
              >
                <ThumbsUp className="h-4 w-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => setReviewVote(false)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition ${
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
                className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
              />
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewTask(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReview()}
                disabled={busyId === reviewTask.id}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  reviewVote ? 'bg-blue-800 hover:bg-blue-900' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {busyId === reviewTask.id ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailModal
        title="Task"
        open={taskDetailOpen}
        onClose={() => {
          setTaskDetailOpen(false);
          setTaskDetailId(null);
          setTaskDetailRow(null);
        }}
        loading={taskDetailLoading}
        wide
      >
        {(() => {
          const t = taskDetailData ?? taskDetailRow;
          if (!t) return null;
          const blobs = collectBlobIdEntries(t);
          return (
            <div className="space-y-1">
              {detailField('ID', <span className="font-mono text-xs break-all">{t.id}</span>)}
              {detailField('Description', t.description)}
              {detailField('Region', t.region)}
              {detailField('Start', formatDate(t.start_period))}
              {detailField('End', formatDate(t.end_period))}
              {detailField('Status', <StatusBadge status={t.status} />)}
              {detailField('Assigned staff', t.assigned_staff ? truncateAddress(t.assigned_staff) : '—')}
              {detailField('Reviewed by', t.reviewed_by ? truncateAddress(t.reviewed_by) : '—')}
              {detailField('Created', formatDate(t.created_at))}
              {detailField('Updated', formatDate(t.updated_at))}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Images</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
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
