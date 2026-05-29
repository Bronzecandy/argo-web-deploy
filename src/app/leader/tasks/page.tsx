'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import ContextBanner from '@/src/components/ui/ContextBanner';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, toDDMMYYYY, truncateAddress } from '@/src/lib/formatters';
import { btnPrimary, btnSecondary, inputClass, selectClass } from '@/src/lib/uiClasses';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import { taskService } from '@/src/services/task.service';
import { childrenService } from '@/src/services/children.service';
import { getTaskAssignedStaff } from '@/src/lib/taskFields';
import type { Task, Child } from '@/src/types/api.types';
import { Hand, Plus } from 'lucide-react';

const PAGE_SIZE = 20;
const CHILD_LIST_PAGE_SIZE = 50;

type TaskNeedKind = 'hk1' | 'hk2' | 'health' | '';

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

  const resolvedNeedId = needIdFor(childDetail, needKind);

  const handleCreate = async () => {
    if (!canUseRegion || !effectiveRegion) {
      toast.error('Vùng của bạn chưa tải xong. Vui lòng đợi hoặc thử lại sau.');
      return;
    }
    if (!description.trim() || !startPeriod || !endPeriod) {
      toast.error('Cần có mô tả và khoảng thời gian');
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
      const startPayload = toDDMMYYYY(startPeriod);
      const endPayload = toDDMMYYYY(endPeriod);
      if (isChildTask) {
        await taskService.create({
          description: description.trim(),
          region: effectiveRegion,
          start_period: startPayload,
          end_period: endPayload,
          is_child_task: true,
          child_id: selectedChildId,
          need_id: resolvedNeedId,
        });
      } else {
        await taskService.create({
          description: description.trim(),
          region: effectiveRegion,
          start_period: startPayload,
          end_period: endPayload,
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
    ? 'Đang tải vùng của bạn…'
    : !effectiveRegion
      ? poolStatus === 'failed'
        ? poolError || 'Không xác định được vùng cho nhiệm vụ.'
        : 'Không xác định được vùng cho nhiệm vụ.'
      : 'Chưa có nhiệm vụ trong vùng của bạn.';

  const regionHint =
    poolName?.trim() && leaderRegion?.trim() && poolName.trim() !== leaderRegion.trim()
      ? 'Tên pool và vùng trung tâm khác nhau — ưu tiên tên pool, sau đó vùng trung tâm.'
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nhiệm vụ"
        description={
          user?.address
            ? `Nhiệm vụ trong vùng được giao · ${truncateAddress(user.address)}`
            : 'Nhiệm vụ trong vùng được giao'
        }
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Tạo mới
          </button>
        }
      />

      {!dataReady && (
        <ContextBanner title="Đang tải thông tin vùng / pool">Vui lòng đợi trước khi tạo hoặc lọc nhiệm vụ.</ContextBanner>
      )}
      {dataReady && !effectiveRegion && (
        <ContextBanner variant="warning" title="Chưa có mã vùng">
          {poolError || 'Không xác định được vùng cho nhiệm vụ — cần pool hoặc trung tâm trả về vùng được gán.'}
        </ContextBanner>
      )}
      {regionHint && (
        <ContextBanner variant="info">{regionHint}</ContextBanner>
      )}

      <PageSection title="Nhiệm vụ trong vùng bạn" noPadding>
        <DataTable<Task>
          columns={[
            {
              key: 'description',
              label: 'Mô tả',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'region', label: 'Vùng' },
            { key: 'start_period', label: 'Bắt đầu', render: (r) => formatDate(r.start_period) },
            { key: 'end_period', label: 'Kết thúc', render: (r) => formatDate(r.end_period) },
            {
              key: 'assigned_staff',
              label: 'ID nhân sự được giao',
              render: (r) => {
                const staff = getTaskAssignedStaff(r);
                return staff ? (
                  <CopyableTruncated value={staff} truncateDisplay={false} className="max-w-[min(100%,24rem)]" />
                ) : (
                  <span className="text-slate-400">Chưa gán</span>
                );
              },
            },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              label: 'Thao tác',
              className: 'whitespace-nowrap',
              render: (r) => {
                const s = r.status?.toLowerCase();
                const isAssigned = !!getTaskAssignedStaff(r);
                return (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    <TableIconButton
                      onClick={() => {
                        setTaskDetailRow(r);
                        setTaskDetailId(r.id);
                        setTaskDetailOpen(true);
                      }}
                    >
                      Chi tiết
                    </TableIconButton>
                    {!isAssigned && (s === 'pending' || s === 'open') && (
                      <TableIconButton
                        variant="primary"
                        disabled={busyId === r.id}
                        onClick={() => void handleClaim(r.id)}
                      >
                        <Hand className="h-3 w-3" /> Nhận
                      </TableIconButton>
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
      </PageSection>

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo nhiệm vụ mới"
        submitLabel={submitting ? 'Đang tạo…' : 'Tạo nhiệm vụ'}
        submitDisabled={createDisabled}
        onSubmit={() => void handleCreate()}
        maxWidth="xl"
      >
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Vùng</span> —{' '}
          <span className="font-semibold text-blue-900">{canUseRegion ? effectiveRegion : '…'}</span>
        </p>

        <div className="max-w-xl space-y-4">
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
                  <span>Nhiệm vụ cấp vùng</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="taskMode"
                    checked={isChildTask}
                    onChange={() => setIsChildTask(true)}
                  />
                  <span>Nhiệm vụ theo trẻ</span>
                </label>
              </fieldset>

              {isChildTask && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Trẻ</label>
                    <select
                      className={`${selectClass} w-full`}
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
                          className={`${btnSecondary} !px-2 !py-1 text-xs`}
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
                          className={`${btnSecondary} !px-2 !py-1 text-xs`}
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
                  Mô tả
                </label>
                <textarea
                  id="task-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="start" className="mb-1 block text-xs font-medium text-slate-500">
                    Ngày bắt đầu
                  </label>
                  <input
                    id="start"
                    type="date"
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="end" className="mb-1 block text-xs font-medium text-slate-500">
                    Ngày kết thúc
                  </label>
                  <input
                    id="end"
                    type="date"
                    value={endPeriod}
                    onChange={(e) => setEndPeriod(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Gửi API dạng <span className="font-medium">DD/MM/YYYY</span> (chuyển tự động từ ngày đã chọn).
              </p>
        </div>
      </FormModal>

      <DetailModal
        title="Nhiệm vụ"
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
            <div>
              <DetailField label="Mã" value={<CopyableTruncated value={t.id} chars={4} />} />
              <DetailField label="Mô tả" value={t.description} />
              <DetailField label="Vùng" value={t.region} />
              <DetailField label="Bắt đầu" value={formatDate(t.start_period)} />
              <DetailField label="Kết thúc" value={formatDate(t.end_period)} />
              <DetailField label="Trạng thái" value={<StatusBadge status={t.status} />} />
              <DetailField label="Nhân sự được giao" value={t.assigned_staff ? <CopyableTruncated value={t.assigned_staff} /> : '—'} />
              <DetailField label="Người duyệt" value={t.reviewed_by ? <CopyableTruncated value={t.reviewed_by} /> : '—'} />
              <DetailField label="Ngày tạo" value={formatDate(t.created_at)} />
              <DetailField label="Cập nhật lúc" value={formatDate(t.updated_at)} />
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Hình ảnh</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
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
