'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import ContextBanner from '@/src/components/ui/ContextBanner';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TabBar from '@/src/components/ui/TabBar';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { inputClass, selectClass } from '@/src/lib/uiClasses';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import AiEvaluationBadge from '@/src/components/ui/AiEvaluationBadge';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, formatDateTimeSeconds } from '@/src/lib/formatters';
import { childUploadService } from '@/src/services/child-upload.service';
import { childrenService } from '@/src/services/children.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import type { Child, UploadChildRequestEntity } from '@/src/types/api.types';

type Tab = 'review' | 'list';

/** Rows where `review_status` normalizes to `approved` (case/spacing insensitive). */
function isChildUploadReviewApproved(reviewStatus?: string) {
  const s = (reviewStatus || '').trim().toLowerCase().replace(/\s+/g, '_');
  return s === 'approved';
}

function normalizeChildUploadListStatus(status?: string) {
  return (status || '').trim().toLowerCase().replace(/\s+/g, '_');
}

const PAGE_SIZE = 20;

/** Selected need amounts must be strictly greater than this (VND). */
const MIN_NEED_VND = 9999;

const GENDER_OPTIONS = [
  { value: '', label: 'Tất cả giới tính' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object') {
    const axErr = e as { response?: { data?: { message?: string }; status?: number }; message?: string; code?: string };
    if (axErr.response?.data?.message) {
      return `${axErr.response.status ?? ''} ${axErr.response.data.message}`.trim();
    }
    if (axErr.code === 'ECONNABORTED') {
      return 'Hết thời gian chờ phản hồi — máy chủ có thể đang khởi động, vui lòng thử lại';
    }
    if (axErr.code === 'ERR_NETWORK') {
      return 'Lỗi mạng — máy chủ có thể chặn CORS hoặc không truy cập được';
    }
    if (axErr.message) return axErr.message;
  }
  return fallback;
}

function validateNeedAmounts(
  needMeal: boolean,
  needBooks: boolean,
  needHealth: boolean,
  mealValue: string,
  booksValue: string,
  healthValue: string,
): string | null {
  if (!needMeal && !needBooks && !needHealth) {
    return 'Chọn ít nhất một loại nhu cầu';
  }
  const mealOk = !needMeal || (Number.isFinite(Number(mealValue)) && Number(mealValue) > MIN_NEED_VND);
  const booksOk = !needBooks || (Number.isFinite(Number(booksValue)) && Number(booksValue) > MIN_NEED_VND);
  const healthOk = !needHealth || (Number.isFinite(Number(healthValue)) && Number(healthValue) > MIN_NEED_VND);
  if (!mealOk || !booksOk || !healthOk) {
    return `Mỗi nhu cầu đã chọn phải có số tiền lớn hơn ${MIN_NEED_VND.toLocaleString('vi-VN')} ₫`;
  }
  return null;
}

function uploadBlobEntries(u: UploadChildRequestEntity): { key: string; blobId: string }[] {
  const parts: { key: string; blobId: string }[] = [...collectBlobIdEntries(u)];
  if (u.first_guardian_profile) {
    for (const e of collectBlobIdEntries(u.first_guardian_profile)) {
      parts.push({ key: `first_guardian.${e.key}`, blobId: e.blobId });
    }
  }
  if (u.second_guardian_profile) {
    for (const e of collectBlobIdEntries(u.second_guardian_profile)) {
      parts.push({ key: `second_guardian.${e.key}`, blobId: e.blobId });
    }
  }
  return parts;
}

export default function LeaderChildrenPage() {
  const { execute, executing } = useExecuteTransaction();
  const { status: centerStatus, leaderRegion, errorMessage: centerError } = useLeaderCenter();
  const canLoad = centerStatus !== 'loading' && !!leaderRegion;

  const [tab, setTab] = useState<Tab>('review');

  const [listLoading, setListLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploads, setUploads] = useState<UploadChildRequestEntity[]>([]);
  const [uploadPage, setUploadPage] = useState(0);
  const [uploadTotalPages, setUploadTotalPages] = useState(1);
  const [uploadGender, setUploadGender] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [childDetailOpen, setChildDetailOpen] = useState(false);
  const [childDetailId, setChildDetailId] = useState<string | null>(null);
  const [childDetailRow, setChildDetailRow] = useState<Child | null>(null);
  const [childDetailData, setChildDetailData] = useState<Child | null>(null);
  const [childDetailLoading, setChildDetailLoading] = useState(false);

  const [uploadDetailOpen, setUploadDetailOpen] = useState(false);
  const [uploadDetailRow, setUploadDetailRow] = useState<UploadChildRequestEntity | null>(null);

  /** Approve path: optional review, then update child needs on-chain. */
  const [approveModal, setApproveModal] = useState<UploadChildRequestEntity | null>(null);
  const [needMeal, setNeedMeal] = useState(false);
  const [needBooks, setNeedBooks] = useState(false);
  const [needHealth, setNeedHealth] = useState(false);
  const [mealValue, setMealValue] = useState('');
  const [booksValue, setBooksValue] = useState('');
  const [healthValue, setHealthValue] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  /** Configure needs only (no upload review) — opened from Children list. */
  const [needsConfigChild, setNeedsConfigChild] = useState<Child | null>(null);
  const [cfgNeedMeal, setCfgNeedMeal] = useState(false);
  const [cfgNeedBooks, setCfgNeedBooks] = useState(false);
  const [cfgNeedHealth, setCfgNeedHealth] = useState(false);
  const [cfgMealValue, setCfgMealValue] = useState('');
  const [cfgBooksValue, setCfgBooksValue] = useState('');
  const [cfgHealthValue, setCfgHealthValue] = useState('');
  const [configNeedsSubmitting, setConfigNeedsSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    if (!canLoad || !leaderRegion) {
      setChildren([]);
      setTotalPages(1);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const res = await childrenService.list({ page, page_size: PAGE_SIZE, region: leaderRegion });
      const body = res.data;
      setChildren(Array.isArray(body.data) ? body.data : []);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không tải được danh sách trẻ'));
      setChildren([]);
    } finally {
      setListLoading(false);
    }
  }, [page, leaderRegion, canLoad]);

  useEffect(() => {
    if (tab !== 'list') return;
    void loadList();
  }, [tab, loadList]);

  const loadUploads = useCallback(async () => {
    if (!canLoad || !leaderRegion) {
      setUploads([]);
      setUploadTotalPages(1);
      setUploadLoading(false);
      return;
    }
    setUploadLoading(true);
    try {
      const res = await childUploadService.list({
        page: uploadPage,
        page_size: PAGE_SIZE,
        status: 'pending',
        region: leaderRegion,
        gender: uploadGender || undefined,
      });
      const body = res.data;
      const raw = Array.isArray(body.data) ? body.data : [];
      setUploads(raw.filter((u) => normalizeChildUploadListStatus(u.status) === 'pending'));
      setUploadTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không tải được yêu cầu tải lên'));
      setUploads([]);
    } finally {
      setUploadLoading(false);
    }
  }, [uploadPage, uploadGender, leaderRegion, canLoad]);

  useEffect(() => {
    if (tab !== 'review') return;
    void loadUploads();
  }, [tab, loadUploads]);

  useEffect(() => {
    if (!childDetailOpen || !childDetailId) {
      setChildDetailData(null);
      return;
    }
    setChildDetailLoading(true);
    setChildDetailData(null);
    void childrenService
      .getById(childDetailId)
      .then((res) => setChildDetailData(res.data ?? null))
      .catch(() => setChildDetailData(null))
      .finally(() => setChildDetailLoading(false));
  }, [childDetailOpen, childDetailId]);

  const applyNeedUpdatesToChild = useCallback(
    async (
      child: Child,
      opts: {
        needMeal: boolean;
        needBooks: boolean;
        needHealth: boolean;
        mealValue: string;
        booksValue: string;
        healthValue: string;
      },
    ): Promise<boolean> => {
      const { needMeal, needBooks, needHealth, mealValue, booksValue, healthValue } = opts;
      const childId = child.id.trim();
      if (!childId) {
        toast.error('Bản ghi trẻ đã giải quyết không có mã');
        return false;
      }

      const booksNeeds = (child.books_needs || []).map((id) => id.trim());
      if (needBooks && (!booksNeeds[0] || !booksNeeds[1])) {
        toast.error(
          'Books: hồ sơ trẻ cần đủ books_needs[0] và books_needs[1] sau khi duyệt — hiện thiếu một hoặc cả hai need_id',
        );
        return false;
      }

      if (needMeal) {
        const ok = await execute(
          () =>
            childrenService.updateMealNeed({
              child_id: childId,
              need_id: (child.meal_need || '').trim(),
              value: Number(mealValue),
            }),
          { quiet: true },
        );
        if (!ok) return false;
      }
      if (needBooks && booksNeeds[0] && booksNeeds[1]) {
        const amount = Number(booksValue);
        for (const need_id of [booksNeeds[0], booksNeeds[1]] as const) {
          const ok = await execute(
            () => childrenService.updateBooksNeed({ child_id: childId, need_id, value: amount }),
            { quiet: true },
          );
          if (!ok) return false;
        }
      }
      if (needHealth) {
        const ok = await execute(
          () =>
            childrenService.updateHealthInsuranceNeed({
              child_id: childId,
              need_id: (child.health_insurance_need || '').trim(),
              value: Number(healthValue),
            }),
          { quiet: true },
        );
        if (!ok) return false;
      }
      return true;
    },
    [execute],
  );

  function runReview(row: UploadChildRequestEntity, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id: row.id });
      setRefuseReason('');
      return;
    }
    setApproveModal(row);
    setNeedMeal(false);
    setNeedBooks(false);
    setNeedHealth(false);
    setMealValue('');
    setBooksValue('');
    setHealthValue('');
  }

  async function submitApproveWithNeeds() {
    if (!approveModal) return;
    const identityCode = (approveModal.identity_code || '').trim();
    if (!identityCode) {
      toast.error('Thiếu mã định danh trong yêu cầu tải lên này');
      return;
    }

    const msg = validateNeedAmounts(needMeal, needBooks, needHealth, mealValue, booksValue, healthValue);
    if (msg) {
      toast.error(msg);
      return;
    }

    setApproveSubmitting(true);
    setBusyId(approveModal.id);
    try {
      if (!isChildUploadReviewApproved(approveModal.review_status)) {
        await childUploadService.review(approveModal.id, { is_vote_yes: true });
      }

      const child = await childrenService.findChildByIdentityCode(identityCode, {
        first_name: approveModal.first_name,
        last_name: approveModal.last_name,
        region: approveModal.region,
      });
      if (!child) {
        toast.error('Không tìm thấy trẻ với mã định danh này trong danh sách trẻ');
        return;
      }

      const okApply = await applyNeedUpdatesToChild(child, {
        needMeal,
        needBooks,
        needHealth,
        mealValue,
        booksValue,
        healthValue,
      });
      if (!okApply) {
        toast.error(
          'Cập nhật nhu cầu chưa hoàn tất. Vào tab «Danh sách trẻ» → «Cấu hình nhu cầu» để thử lại (mỗi mức phải > 10.000 ₫).',
        );
        return;
      }

      toast.success('Đã lưu duyệt và cập nhật nhu cầu trẻ');
      setApproveModal(null);
      await loadUploads();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Thao tác thất bại'));
    } finally {
      setApproveSubmitting(false);
      setBusyId(null);
    }
  }

  async function submitRefuseReview() {
    if (!refuseModal) return;
    const { id } = refuseModal;
    setBusyId(id);
    try {
      await childUploadService.review(id, { is_vote_yes: false, refuse_reason: refuseReason || undefined });
      toast.success('Đã ghi nhận từ chối duyệt');
      setRefuseModal(null);
      await loadUploads();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Duyệt thất bại'));
    } finally {
      setBusyId(null);
    }
  }

  function openNeedsConfigFromList(row: Child) {
    setNeedsConfigChild(row);
    setCfgNeedMeal(false);
    setCfgNeedBooks(false);
    setCfgNeedHealth(false);
    setCfgMealValue('');
    setCfgBooksValue('');
    setCfgHealthValue('');
  }

  async function submitNeedsConfig() {
    if (!needsConfigChild) return;
    const msg = validateNeedAmounts(
      cfgNeedMeal,
      cfgNeedBooks,
      cfgNeedHealth,
      cfgMealValue,
      cfgBooksValue,
      cfgHealthValue,
    );
    if (msg) {
      toast.error(msg);
      return;
    }
    setConfigNeedsSubmitting(true);
    try {
      const res = await childrenService.getById(needsConfigChild.id);
      const child = res.data ?? null;
      if (!child) {
        toast.error('Không tải được hồ sơ trẻ — thử lại sau');
        return;
      }
      const okApply = await applyNeedUpdatesToChild(child, {
        needMeal: cfgNeedMeal,
        needBooks: cfgNeedBooks,
        needHealth: cfgNeedHealth,
        mealValue: cfgMealValue,
        booksValue: cfgBooksValue,
        healthValue: cfgHealthValue,
      });
      if (!okApply) return;
      toast.success('Đã cập nhật nhu cầu trẻ');
      setNeedsConfigChild(null);
      await loadList();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không cập nhật được nhu cầu'));
    } finally {
      setConfigNeedsSubmitting(false);
    }
  }

  const listColumns = [
    { key: 'first_name', label: 'Tên' },
    { key: 'last_name', label: 'Họ' },
    { key: 'gender', label: 'Giới tính' },
    { key: 'region', label: 'Vùng' },
    {
      key: 'date_of_birth',
      label: 'Ngày sinh',
      render: (row: Child) => formatDate(row.date_of_birth),
    },
    { key: 'identity_code', label: 'Mã định danh', render: (row: Child) => <CopyableTruncated value={row.identity_code} /> },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'whitespace-nowrap',
      render: (row: Child) => (
        <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <TableIconButton
            variant="primary"
            onClick={() => openNeedsConfigFromList(row)}
            title="Cấu hình bữa ăn / sách / bảo hiểm (chỉ cập nhật nhu cầu, không duyệt tải lên)"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Cấu hình nhu cầu
          </TableIconButton>
          <TableIconButton
            onClick={() => {
              setChildDetailRow(row);
              setChildDetailId(row.id);
              setChildDetailOpen(true);
            }}
          >
            Chi tiết
          </TableIconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trẻ em"
        description={`Duyệt yêu cầu tải lên và quản lý trẻ theo vùng${leaderRegion ? `: ${leaderRegion}` : ''}`}
      />

      {centerStatus === 'loading' && (
        <ContextBanner title="Đang tải trung tâm trưởng vùng">
          Vùng từ GET /centers/leader…
        </ContextBanner>
      )}
      {centerStatus === 'error' && centerError && (
        <ContextBanner variant="warning" title="Không tải được trung tâm trưởng vùng">
          {centerError}. Các danh sách bên dưới cần vùng từ API này.
        </ContextBanner>
      )}
      {centerStatus !== 'loading' && !leaderRegion && (
        <ContextBanner variant="warning" title="Thiếu vùng từ API">
          Không có trường <code className="rounded bg-white px-1">region</code> từ GET /centers/leader — không lọc được yêu cầu và trẻ theo vùng.
        </ContextBanner>
      )}

      <TabBar
        className="mb-6"
        items={[
          { id: 'review' as const, label: 'Yêu cầu tải lên', icon: <ClipboardCheck className="hidden h-4 w-4 shrink-0 sm:inline" /> },
          { id: 'list' as const, label: 'Danh sách trẻ' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'review' && (
        <div className="space-y-4">
          <FilterToolbar>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              Vùng (trưởng): <strong className="text-slate-900">{leaderRegion ?? '—'}</strong>
            </span>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Giới tính</label>
              <select
                value={uploadGender}
                onChange={(e) => {
                  setUploadGender(e.target.value);
                  setUploadPage(0);
                }}
                disabled={!canLoad}
                className={selectClass}
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value || 'all-g'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </FilterToolbar>

          <PageSection title="Yêu cầu tải lên đang chờ" noPadding>
          <DataTable<UploadChildRequestEntity>
            columns={[
              {
                key: 'name',
                label: 'Tên',
                render: (u) => (
                  <span>
                    {u.first_name} {u.last_name}
                  </span>
                ),
              },
              { key: 'gender', label: 'Giới tính', render: (u) => <span className="capitalize">{u.gender}</span> },
              { key: 'region', label: 'Vùng' },
              { key: 'status', label: 'Trạng thái', render: (u) => <StatusBadge status={u.status} /> },
              {
                key: 'ai_evaluation',
                label: 'AI',
                render: (u) => <AiEvaluationBadge record={u} />,
              },
              { key: 'created_at', label: 'Ngày tạo', render: (u) => formatDate(u.created_at) },
              {
                key: 'actions',
                label: 'Thao tác',
                className: 'min-w-[120px]',
                render: (u) => (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    <TableIconButton
                      onClick={() => {
                        setUploadDetailRow(u);
                        setUploadDetailOpen(true);
                      }}
                    >
                      Chi tiết
                    </TableIconButton>
                    <TableIconButton
                      variant="primary"
                      disabled={busyId === u.id}
                      onClick={() => runReview(u, true)}
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      Duyệt
                    </TableIconButton>
                    <TableIconButton
                      variant="danger"
                      disabled={busyId === u.id}
                      onClick={() => runReview(u, false)}
                    >
                      Từ chối
                    </TableIconButton>
                  </div>
                ),
              },
            ]}
            data={uploads}
            loading={uploadLoading}
            page={uploadPage}
            totalPages={uploadTotalPages}
            onPageChange={(p) => setUploadPage(p)}
            emptyMessage={
              canLoad
                ? 'Không có yêu cầu tải lên nào khớp bộ lọc.'
                : 'Không có vùng trưởng — không tải được yêu cầu tải lên.'
            }
          />
          </PageSection>
        </div>
      )}

      {tab === 'list' && (
        <PageSection title="Danh sách trẻ" noPadding>
        <DataTable<Child>
          columns={listColumns}
          data={children}
          loading={listLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage={
            canLoad ? 'Không tìm thấy trẻ em' : 'Không có vùng trưởng — không tải được danh sách trẻ.'
          }
        />
        </PageSection>
      )}

      <FormModal
        open={approveModal !== null}
        onClose={() => !approveSubmitting && !executing && setApproveModal(null)}
        title="Duyệt tải lên & cấu hình nhu cầu"
        submitLabel={approveSubmitting || executing ? 'Đang xử lý…' : 'Xác nhận'}
        submitDisabled={approveSubmitting || executing}
        onSubmit={() => void submitApproveWithNeeds()}
        maxWidth="lg"
      >
        {approveModal && (
          <>
            <p className="mb-2 text-sm text-slate-600">
              {approveModal.first_name} {approveModal.last_name} · {approveModal.region}
            </p>
            <p className="mb-4 font-mono text-[11px] text-slate-500">
              Mã định danh: {approveModal.identity_code || '—'}
            </p>
            <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-slate-700">
              Chọn nhu cầu và nhập <strong>số tiền (VND)</strong>; <strong>mỗi nhu cầu đã chọn phải &gt; {MIN_NEED_VND.toLocaleString('vi-VN')} ₫</strong>. Khi xác nhận:
              hệ thống ghi nhận duyệt (nếu cần), rồi cập nhật nhu cầu trẻ. <strong>Sách:</strong> một ô tiền áp dụng cho <strong>cả hai</strong> học kỳ (
              <code className="rounded bg-white px-1">books_needs[0]</code> và <code className="rounded bg-white px-1">books_needs[1]</code>)
              sau khi duyệt. Mã <code className="rounded bg-white px-1">child_id</code> được tra theo <code className="rounded bg-white px-1">identity_code</code> trên hồ sơ trẻ.
            </p>

            <div className="space-y-4 text-sm">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={needMeal}
                  onChange={(e) => setNeedMeal(e.target.checked)}
                  disabled={approveSubmitting || executing}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-900">Nhu cầu bữa ăn</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Cơ sở tính: theo tháng (VND/tháng)</span>
                  {needMeal && (
                    <GroupedNumericInput
                      min={MIN_NEED_VND + 1}
                      className={`${inputClass} mt-2`}
                      placeholder={`Ví dụ: ${(MIN_NEED_VND + 50_000).toString()}`}
                      value={mealValue}
                      onChange={setMealValue}
                      disabled={approveSubmitting || executing}
                    />
                  )}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={needBooks}
                  onChange={(e) => setNeedBooks(e.target.checked)}
                  disabled={approveSubmitting || executing}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-900">Nhu cầu sách</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Một mức tiền (VND/kỳ). Sau khi duyệt, hệ thống áp dụng cùng mức cho cả hai mã nhu cầu sách (
                    <code className="rounded bg-slate-100 px-0.5">books_needs[0]</code>,{' '}
                    <code className="rounded bg-slate-100 px-0.5">books_needs[1]</code>).
                  </span>
                  {needBooks && (
                    <GroupedNumericInput
                      min={MIN_NEED_VND + 1}
                      className={`${inputClass} mt-2`}
                      placeholder={`Ví dụ: ${(MIN_NEED_VND + 800_000).toString()}`}
                      value={booksValue}
                      onChange={setBooksValue}
                      disabled={approveSubmitting || executing}
                    />
                  )}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={needHealth}
                  onChange={(e) => setNeedHealth(e.target.checked)}
                  disabled={approveSubmitting || executing}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-900">Nhu cầu bảo hiểm y tế</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Cơ sở tính: theo năm (VND/năm)</span>
                  {needHealth && (
                    <GroupedNumericInput
                      min={MIN_NEED_VND + 1}
                      className={`${inputClass} mt-2`}
                      placeholder={`Ví dụ: ${(MIN_NEED_VND + 1_200_000).toString()}`}
                      value={healthValue}
                      onChange={setHealthValue}
                      disabled={approveSubmitting || executing}
                    />
                  )}
                </span>
              </label>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Cập nhật nhu cầu dùng mã trẻ và số tiền. Bước on-chain (nếu có) sẽ được xử lý khi bạn xác nhận giao dịch trong ví.
            </p>
          </>
        )}
      </FormModal>

      <FormModal
        open={needsConfigChild !== null}
        onClose={() => !configNeedsSubmitting && !executing && setNeedsConfigChild(null)}
        title="Cấu hình nhu cầu"
        submitLabel={configNeedsSubmitting || executing ? 'Đang xử lý…' : 'Lưu nhu cầu'}
        submitDisabled={configNeedsSubmitting || executing}
        onSubmit={() => void submitNeedsConfig()}
        maxWidth="lg"
      >
        {needsConfigChild && (
          <>
            <p className="mb-2 text-sm text-slate-600">
              {needsConfigChild.first_name} {needsConfigChild.last_name} · {needsConfigChild.region}
            </p>
            <p className="mb-4 font-mono text-[11px] text-slate-500">
              Mã trẻ: {needsConfigChild.id} · mã định danh: {needsConfigChild.identity_code || '—'}
            </p>
            <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-slate-700">
              Chỉ cập nhật giá trị nhu cầu on-chain (không gọi duyệt upload).{' '}
              <strong>Mỗi nhu cầu đã chọn phải &gt; {MIN_NEED_VND.toLocaleString('vi-VN')} ₫</strong>. Dùng khi bước trước duyệt xong nhưng cập nhật need bị lỗi, hoặc
              khi cần chỉnh lại mức tiền.
            </p>

            <div className="space-y-4 text-sm">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={cfgNeedMeal}
                  onChange={(e) => setCfgNeedMeal(e.target.checked)}
                  disabled={configNeedsSubmitting || executing}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-900">Nhu cầu bữa ăn</span>
                  <span className="mt-0.5 block text-xs text-slate-500">VND / tháng</span>
                  {cfgNeedMeal && (
                    <GroupedNumericInput
                      min={MIN_NEED_VND + 1}
                      className={`${inputClass} mt-2`}
                      placeholder={`Ví dụ: ${(MIN_NEED_VND + 50_000).toString()}`}
                      value={cfgMealValue}
                      onChange={setCfgMealValue}
                      disabled={configNeedsSubmitting || executing}
                    />
                  )}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={cfgNeedBooks}
                  onChange={(e) => setCfgNeedBooks(e.target.checked)}
                  disabled={configNeedsSubmitting || executing}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-900">Nhu cầu sách</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Một mức (VND/kỳ) cho cả <code className="rounded bg-slate-100 px-0.5">books_needs[0]</code> và{' '}
                    <code className="rounded bg-slate-100 px-0.5">books_needs[1]</code>.
                  </span>
                  {cfgNeedBooks && (
                    <GroupedNumericInput
                      min={MIN_NEED_VND + 1}
                      className={`${inputClass} mt-2`}
                      placeholder={`Ví dụ: ${(MIN_NEED_VND + 800_000).toString()}`}
                      value={cfgBooksValue}
                      onChange={setCfgBooksValue}
                      disabled={configNeedsSubmitting || executing}
                    />
                  )}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={cfgNeedHealth}
                  onChange={(e) => setCfgNeedHealth(e.target.checked)}
                  disabled={configNeedsSubmitting || executing}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-900">Nhu cầu bảo hiểm y tế</span>
                  <span className="mt-0.5 block text-xs text-slate-500">VND / năm</span>
                  {cfgNeedHealth && (
                    <GroupedNumericInput
                      min={MIN_NEED_VND + 1}
                      className={`${inputClass} mt-2`}
                      placeholder={`Ví dụ: ${(MIN_NEED_VND + 1_200_000).toString()}`}
                      value={cfgHealthValue}
                      onChange={setCfgHealthValue}
                      disabled={configNeedsSubmitting || executing}
                    />
                  )}
                </span>
              </label>
            </div>

          </>
        )}
      </FormModal>

      <FormModal
        open={refuseModal !== null}
        onClose={() => setRefuseModal(null)}
        title="Từ chối duyệt"
        submitLabel="Gửi"
        submitVariant="danger"
        submitDisabled={refuseModal !== null && busyId === refuseModal.id}
        onSubmit={() => void submitRefuseReview()}
      >
        <textarea
          value={refuseReason}
          onChange={(e) => setRefuseReason(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Lý do (tùy chọn)…"
        />
      </FormModal>

      <DetailModal
        title="Hồ sơ trẻ"
        open={childDetailOpen}
        onClose={() => {
          setChildDetailOpen(false);
          setChildDetailId(null);
          setChildDetailRow(null);
        }}
        loading={childDetailLoading}
        wide
      >
        {(() => {
          const c = childDetailData ?? childDetailRow;
          if (!c) return null;
          const blobs = collectBlobIdEntries(c);
          const gallery = (c.image_blob_ids ?? []).filter((id) => typeof id === 'string' && id.trim());
          return (
            <div>
              <DetailField label="Mã" value={<CopyableTruncated value={c.id} chars={8} />} />
              <DetailField label="Tên" value={`${c.first_name} ${c.last_name}`} />
              <DetailField label="Giới tính" value={<span className="capitalize">{c.gender}</span>} />
              <DetailField label="Vùng" value={c.region} />
              <DetailField label="Ngày sinh" value={formatDate(c.date_of_birth)} />
              <DetailField label="Mã định danh" value={<CopyableTruncated value={c.identity_code} />} />
              <DetailField label="Địa chỉ nhà" value={c.home_address || '—'} />
              <DetailField label="Nhu cầu bữa ăn" value={c.meal_need ? <CopyableTruncated value={c.meal_need} /> : '—'} />
              <DetailField label="Nhu cầu bảo hiểm y tế" value={c.health_insurance_need ? <CopyableTruncated value={c.health_insurance_need} /> : '—'} />
              <DetailField
                label="Nhu cầu sách"
                value={
                  c.books_needs?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {c.books_needs.map((bid) => (
                        <CopyableTruncated key={bid} value={bid} />
                      ))}
                    </div>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailField label="Người tải lên" value={c.uploaded_by ? <CopyableTruncated value={c.uploaded_by} /> : '—'} />
              <DetailField label="Ngày tải lên" value={formatDate(c.uploaded_at)} />
              <DetailField label="Cập nhật lúc" value={formatDate(c.updated_at)} />
              {gallery.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Thư viện ảnh (API)</div>
                  <div className="flex flex-wrap gap-4">
                    {gallery.map((blobId) => (
                      <EntityBlobThumb key={blobId} blobId={blobId} source="api" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>
              )}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Hình ảnh</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} source="walrus" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
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

      <DetailModal
        title="Yêu cầu tải hồ sơ trẻ"
        open={uploadDetailOpen}
        onClose={() => {
          setUploadDetailOpen(false);
          setUploadDetailRow(null);
        }}
        wide
      >
        {uploadDetailRow &&
          (() => {
            const u = uploadDetailRow;
            const blobs = uploadBlobEntries(u);
            return (
              <div>
                <DetailField label="Mã" value={<CopyableTruncated value={u.id} chars={8} />} />
                <DetailField label="Mã hồ sơ" value={<CopyableTruncated value={u.profile_id} chars={8} />} />
                <DetailField label="Tên" value={`${u.first_name} ${u.last_name}`} />
                <DetailField label="Giới tính" value={<span className="capitalize">{u.gender}</span>} />
                <DetailField label="Vùng" value={u.region} />
                <DetailField label="Mã định danh" value={<CopyableTruncated value={u.identity_code} />} />
                <DetailField label="Ngày sinh" value={formatDate(u.date_of_birth)} />
                <DetailField label="Địa chỉ nhà" value={u.home_address ?? '—'} />
                <DetailField label="Trạng thái" value={<StatusBadge status={u.status} />} />
                <DetailField label="Trạng thái duyệt" value={u.review_status ? <StatusBadge status={u.review_status} /> : <span className="text-slate-400">—</span>} />
                <DetailField label="Người duyệt" value={u.reviewed_by ? <CopyableTruncated value={u.reviewed_by} /> : '—'} />
                <DetailField label="Người tạo" value={<CopyableTruncated value={u.created_by} />} />
                <DetailField label="Ngày tạo" value={formatDate(u.created_at)} />
                <DetailField label="Cập nhật lúc" value={formatDate(u.updated_at)} />
                <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(u.closed_at)} />
                <DetailField label="Xác nhận tải lên" value={u.is_confirm_upload ? 'Có' : 'Không'} />
                <AiInsightPanel record={u} className="my-4" />
                {u.first_guardian_profile && (
                  <div className="border-t border-slate-100 py-2">
                    <div className="text-xs font-medium text-slate-500">Người giám hộ thứ nhất</div>
                    <div className="mt-1 text-sm text-slate-800">
                      {u.first_guardian_profile.full_name} · {u.first_guardian_profile.relation} · {u.first_guardian_profile.phone_number}
                    </div>
                  </div>
                )}
                {u.second_guardian_profile && (
                  <div className="border-t border-slate-100 py-2">
                    <div className="text-xs font-medium text-slate-500">Người giám hộ thứ hai</div>
                    <div className="mt-1 text-sm text-slate-800">
                      {u.second_guardian_profile.full_name} · {u.second_guardian_profile.relation} · {u.second_guardian_profile.phone_number}
                    </div>
                  </div>
                )}
                {blobs.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 text-xs font-medium text-slate-600">Hình ảnh</div>
                    <div className="flex flex-wrap gap-4">
                      {blobs.map(({ key, blobId }) => (
                        <div key={key} className="text-center">
                          <EntityBlobThumb
                            blobId={blobId}
                            source="walrus"
                            className="h-20 w-20 rounded-md border border-slate-200 object-cover"
                          />
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
