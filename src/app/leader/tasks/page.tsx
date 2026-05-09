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
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import { taskService } from '@/src/services/task.service';
import { childrenService } from '@/src/services/children.service';
import type { Task, Child } from '@/src/types/api.types';
import { Hand, ClipboardCheck, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';

const PAGE_SIZE = 20;
const CHILD_LIST_PAGE_SIZE = 50;

type TaskNeedKind = 'hk1' | 'hk2' | 'health' | '';

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function childOptionLabel(c: Child) {
  return `${c.first_name} ${c.last_name} · ${truncateAddress(c.id)}`;
}

function needIdFor(child: Child | null, kind: TaskNeedKind): string {
  if (!child || !kind) return '';
  if (kind === 'hk1') return child.books_needs?.[0]?.trim() || '';
  if (kind === 'hk2') return child.books_needs?.[1]?.trim() || '';
  return child.health_insurance_need?.trim() || '';
}

export default function LeaderTasksPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { poolName, status: poolStatus, error: poolError } = useAppSelector((state) => state.leaderPool);
  const { status: centerStatus, leaderRegion } = useLeaderCenter();

  const effectiveRegion = poolName?.trim() || leaderRegion?.trim() || '';

  const dataReady =
    centerStatus !== 'loading' && poolStatus !== 'loading' && poolStatus !== 'idle';

  const canUseRegion = dataReady && !!effectiveRegion;

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
  const [isChildTask, setIsChildTask] = useState(false);

  const [childrenLoading, setChildrenLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenPage, setChildrenPage] = useState(0);
  const [childrenTotalPages, setChildrenTotalPages] = useState(1);

  const [selectedChildId, setSelectedChildId] = useState('');
  const [childDetail, setChildDetail] = useState<Child | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [needKind, setNeedKind] = useState<TaskNeedKind>('');

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [taskDetailRow, setTaskDetailRow] = useState<Task | null>(null);
  const [taskDetailData, setTaskDetailData] = useState<Task | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);

  const loadPage = useCallback(
    async (p: number) => {
      if (!dataReady) {
        setLoading(true);
        setRows([]);
        return;
      }
      if (!canUseRegion) {
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
          region: effectiveRegion,
        });
        setRows(res.data.data ?? []);
        setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      } catch (e) {
        console.error(e);
        toast.error('Không tải được nhiệm vụ');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [effectiveRegion, dataReady, canUseRegion],
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

  const loadChildrenPage = useCallback(
    async (p: number) => {
      if (!canUseRegion || !effectiveRegion) {
        setChildren([]);
        setChildrenTotalPages(1);
        return;
      }
      setChildrenLoading(true);
      try {
        const res = await childrenService.list({
          region: effectiveRegion,
          page: p,
          page_size: CHILD_LIST_PAGE_SIZE,
          sort_order: 'desc',
        });
        const body = res.data;
        setChildren(Array.isArray(body.data) ? body.data : []);
        setChildrenTotalPages(Math.max(1, body.total_pages ?? 1));
      } catch (e) {
        console.error(e);
        toast.error('Không tải được danh sách trẻ');
        setChildren([]);
      } finally {
        setChildrenLoading(false);
      }
    },
    [canUseRegion, effectiveRegion],
  );

  useEffect(() => {
    setChildrenPage(0);
  }, [effectiveRegion, createOpen]);

  useEffect(() => {
    if (!createOpen || !isChildTask) return;
    void loadChildrenPage(childrenPage);
  }, [createOpen, isChildTask, childrenPage, loadChildrenPage]);

  useEffect(() => {
    if (!selectedChildId) {
      setChildDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void childrenService
      .getById(selectedChildId)
      .then((res) => {
        if (!cancelled) setChildDetail(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Không tải được thông tin trẻ');
          setChildDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  useEffect(() => {
    if (!createOpen) return;
    if (!isChildTask) {
      setSelectedChildId('');
      setNeedKind('');
      setChildDetail(null);
    }
  }, [createOpen, isChildTask]);

  const refresh = () => void loadPage(page);

  const handleClaim = async (id: string) => {
    setBusyId(id);
    try {
      await taskService.claim(id);
      toast.success('Đã nhận nhiệm vụ thành công');
      refresh();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Không nhận được nhiệm vụ');
    } finally {
      setBusyId(null);
    }
  };

  const handleReview = async () => {
    if (!reviewTask) return;
    setBusyId(reviewTask.id);
    try {
      await taskService.review(reviewTask.id, reviewVote, reviewVote ? undefined : reviewReason || undefined);
      toast.success(reviewVote ? 'Đã duyệt nhiệm vụ' : 'Đã từ chối nhiệm vụ');
      setReviewTask(null);
      refresh();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Duyệt thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const resolvedNeedId = needIdFor(childDetail, needKind);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseRegion || !effectiveRegion) {
      toast.error('Your region is not loaded yet. Please wait or try again later.');
      return;
    }
    if (!description.trim() || !startPeriod || !endPeriod) {
      toast.error('Description and date range are required');
      return;
    }

    if (isChildTask) {
      if (!selectedChildId) {
        toast.error('Chọn trẻ');
        return;
      }
      if (!needKind) {
        toast.error('Chọn nhu cầu');
        return;
      }
      if (!resolvedNeedId) {
        toast.error('Nhu cầu đã chọn không có mã hợp lệ trên hồ sơ trẻ');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isChildTask) {
        await taskService.create({
          description: description.trim(),
          region: effectiveRegion,
          start_period: startPeriod,
          end_period: endPeriod,
          is_child_task: true,
          child_id: selectedChildId,
          need_id: resolvedNeedId,
        });
      } else {
        await taskService.create({
          description: description.trim(),
          region: effectiveRegion,
          start_period: startPeriod,
          end_period: endPeriod,
          is_child_task: false,
        });
      }
      toast.success('Đã tạo nhiệm vụ');
      setDescription('');
      setStartPeriod('');
      setEndPeriod('');
      setIsChildTask(false);
      setSelectedChildId('');
      setNeedKind('');
      setChildDetail(null);
      setCreateOpen(false);
      setPage(0);
      setListVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
      toast.error('Không tạo được nhiệm vụ');
    } finally {
      setSubmitting(false);
    }
  };

  const hk1Ok = !!childDetail?.books_needs?.[0]?.trim();
  const hk2Ok = !!childDetail?.books_needs?.[1]?.trim();
  const healthOk = !!childDetail?.health_insurance_need?.trim();

  const childSelectDisabled = !canUseRegion || childrenLoading;
  const createDisabled =
    submitting ||
    !canUseRegion ||
    (isChildTask &&
      (!selectedChildId || !needKind || !resolvedNeedId || detailLoading));

  const emptyMsg = !dataReady
    ? 'Loading your region…'
    : !effectiveRegion
      ? poolStatus === 'failed'
        ? poolError || 'Could not resolve your region for tasks.'
        : 'Could not resolve your region for tasks.'
      : 'No tasks in your region';

  const regionHint =
    poolName?.trim() && leaderRegion?.trim() && poolName.trim() !== leaderRegion.trim()
      ? 'Pool label and center region differ — using pool name first, then center.'
      : null;

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
            { key: 'region', label: 'Vùng' },
            { key: 'start_period', label: 'Start', render: (r) => formatDate(r.start_period) },
            { key: 'end_period', label: 'End', render: (r) => formatDate(r.end_period) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'assigned_staff',
              label: 'Assigned',
              render: (r) => (r.assigned_staff ? truncateAddress(r.assigned_staff) : '-'),
            },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
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
              <span className="font-medium text-slate-900">Region</span> —{' '}
              <span className="font-semibold text-blue-900">{canUseRegion ? effectiveRegion : '…'}</span>
              {regionHint && <span className="mt-2 block text-xs text-slate-600">{regionHint}</span>}
              {!dataReady && (
                <span className="mt-2 block text-amber-800">Đang tải thông tin vùng / pool…</span>
              )}
              {dataReady && !effectiveRegion && (
                <span className="mt-2 block text-red-700">
                  Chưa có mã vùng — không thể tạo task cho tới khi pool hoặc trung tâm trả về vùng được gán.
                </span>
              )}
            </p>

            <form onSubmit={handleCreate} className="max-w-xl space-y-4">
              <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-medium text-slate-600">Loại task</legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="taskMode"
                    checked={!isChildTask}
                    onChange={() => {
                      setIsChildTask(false);
                      setSelectedChildId('');
                      setNeedKind('');
                      setChildDetail(null);
                    }}
                  />
                  <span>Task tổng (vùng)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="taskMode"
                    checked={isChildTask}
                    onChange={() => setIsChildTask(true)}
                  />
                  <span>Task theo trẻ</span>
                </label>
              </fieldset>

              {isChildTask && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Trẻ</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                      disabled={childSelectDisabled}
                      value={selectedChildId}
                      onChange={(e) => {
                        setSelectedChildId(e.target.value);
                        setNeedKind('');
                      }}
                    >
                      <option value="">{childrenLoading ? 'Đang tải…' : 'Chọn trẻ'}</option>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {childOptionLabel(c)}
                        </option>
                      ))}
                    </select>
                    {canUseRegion && !childrenLoading && childrenTotalPages > 1 && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <button
                          type="button"
                          disabled={childrenPage <= 0}
                          className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                          onClick={() => setChildrenPage((p) => Math.max(0, p - 1))}
                        >
                          Trước
                        </button>
                        <span>
                          Trang {childrenPage + 1} / {childrenTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={childrenPage >= childrenTotalPages - 1}
                          className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                          onClick={() => setChildrenPage((p) => p + 1)}
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </div>

                  {detailLoading && selectedChildId && (
                    <p className="text-sm text-slate-500">Đang tải nhu cầu trẻ…</p>
                  )}

                  {selectedChildId && childDetail && !detailLoading && (
                    <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <legend className="px-1 text-xs font-medium text-slate-600">Nhu cầu</legend>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="taskNeed"
                          checked={needKind === 'hk1'}
                          disabled={!hk1Ok}
                          onChange={() => setNeedKind('hk1')}
                        />
                        <span>Sách học kỳ 1 {!hk1Ok && <span className="text-slate-400">(chưa có mã)</span>}</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="taskNeed"
                          checked={needKind === 'hk2'}
                          disabled={!hk2Ok}
                          onChange={() => setNeedKind('hk2')}
                        />
                        <span>Sách học kỳ 2 {!hk2Ok && <span className="text-slate-400">(chưa có mã)</span>}</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="taskNeed"
                          checked={needKind === 'health'}
                          disabled={!healthOk}
                          onChange={() => setNeedKind('health')}
                        />
                        <span>Bảo hiểm {!healthOk && <span className="text-slate-400">(chưa có mã)</span>}</span>
                      </label>
                    </fieldset>
                  )}
                </>
              )}

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
                disabled={createDisabled}
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
              {detailField('Vùng', t.region)}
              {detailField('Start', formatDate(t.start_period))}
              {detailField('End', formatDate(t.end_period))}
              {detailField('Status', <StatusBadge status={t.status} />)}
              {detailField('Assigned staff', t.assigned_staff ? truncateAddress(t.assigned_staff) : '—')}
              {detailField('Reviewed by', t.reviewed_by ? truncateAddress(t.reviewed_by) : '—')}
              {detailField('Ngày tạo', formatDate(t.created_at))}
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
