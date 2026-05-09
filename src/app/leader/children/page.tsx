'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check, ClipboardCheck, ListChecks, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate } from '@/src/lib/formatters';
import { childUploadService } from '@/src/services/child-upload.service';
import { childrenService } from '@/src/services/children.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { Child, UploadChildRequestEntity } from '@/src/types/api.types';

type Tab = 'review' | 'profiles' | 'list';

/** Rows where `review_status` normalizes to `approved` (case/spacing insensitive). */
function isChildUploadReviewApproved(reviewStatus?: string) {
  const s = (reviewStatus || '').trim().toLowerCase().replace(/\s+/g, '_');
  return s === 'approved';
}

function normalizeChildUploadListStatus(status?: string) {
  return (status || '').trim().toLowerCase().replace(/\s+/g, '_');
}

const PAGE_SIZE = 20;

const GENDER_OPTIONS = [
  { value: '', label: 'Tất cả giới tính' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object') {
    const axErr = e as { response?: { data?: { message?: string }; status?: number }; message?: string; code?: string };
    if (axErr.response?.data?.message) {
      return `${axErr.response.status ?? ''} ${axErr.response.data.message}`.trim();
    }
    if (axErr.code === 'ECONNABORTED') {
      return 'Request timed out – server may be starting up, please try again';
    }
    if (axErr.code === 'ERR_NETWORK') {
      return 'Network error – the server may be blocking CORS or is unreachable';
    }
    if (axErr.message) return axErr.message;
  }
  return fallback;
}

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

/** Use API-served image for avatar field; other blob fields use Walrus URLs. */
function childBlobThumbSource(key: string): 'api' | 'walrus' {
  if (key === 'avatar_blob_id') return 'api';
  return 'walrus';
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
  const [tab, setTab] = useState<Tab>('review');

  const [listLoading, setListLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [uploadLoading, setUploadLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadChildRequestEntity[]>([]);
  const [uploadPage, setUploadPage] = useState(0);
  const [uploadTotalPages, setUploadTotalPages] = useState(1);
  const [uploadRegion, setUploadRegion] = useState('');
  const [uploadGender, setUploadGender] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileReqs, setProfileReqs] = useState<UploadChildRequestEntity[]>([]);
  const [profilePage, setProfilePage] = useState(0);
  const [profileTotalPages, setProfileTotalPages] = useState(1);
  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string; mode: 'review' | 'vote' } | null>(null);
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

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await childrenService.list({ page, page_size: PAGE_SIZE });
      const body = res.data;
      setChildren(Array.isArray(body.data) ? body.data : []);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không tải được danh sách trẻ'));
      setChildren([]);
    } finally {
      setListLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (tab !== 'list') return;
    void loadList();
  }, [tab, loadList]);

  const loadUploads = useCallback(async () => {
    setUploadLoading(true);
    try {
      const res = await childUploadService.list({
        page: uploadPage,
        page_size: PAGE_SIZE,
        status: 'pending',
        region: uploadRegion.trim() || undefined,
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
  }, [uploadPage, uploadRegion, uploadGender]);

  useEffect(() => {
    if (tab !== 'review') return;
    void loadUploads();
  }, [tab, loadUploads]);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const res = await childUploadService.list({
        page: profilePage,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
        review_status: 'approved',
      });
      const body = res.data;
      const raw = Array.isArray(body.data) ? body.data : [];
      setProfileReqs(raw.filter((u) => isChildUploadReviewApproved(u.review_status)));
      setProfileTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không tải được yêu cầu tải lên hồ sơ trẻ'));
      setProfileReqs([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [profilePage]);

  useEffect(() => {
    if (tab !== 'profiles') return;
    void loadProfiles();
  }, [tab, loadProfiles]);

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

  function runReview(row: UploadChildRequestEntity, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id: row.id, mode: 'review' });
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
      toast.error('Missing identity code on this upload request');
      return;
    }

    if (!needMeal && !needBooks && !needHealth) {
      toast.error('Select at least one need type');
      return;
    }
    const mOk = !needMeal || (Number(mealValue) > 0 && Number.isFinite(Number(mealValue)));
    const bOk = !needBooks || (Number(booksValue) > 0 && Number.isFinite(Number(booksValue)));
    const hOk = !needHealth || (Number(healthValue) > 0 && Number.isFinite(Number(healthValue)));
    if (!mOk || !bOk || !hOk) {
      toast.error('Enter a valid positive amount (VND) for each selected need');
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
        toast.error('Không tìm thấy child với mã định danh này trong danh sách trẻ');
        return;
      }
      const childId = child.id.trim();
      if (!childId) {
        toast.error('Resolved child record has no id');
        return;
      }

      const booksNeeds = (child.books_needs || []).map((id) => id.trim());
      if (needBooks && (!booksNeeds[0] || !booksNeeds[1])) {
        toast.error(
          'Books: hồ sơ trẻ cần đủ books_needs[0] và books_needs[1] sau khi duyệt — hiện thiếu một hoặc cả hai need_id',
        );
        return;
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
        if (!ok) return;
      }
      if (needBooks && booksNeeds[0] && booksNeeds[1]) {
        const amount = Number(booksValue);
        for (const need_id of [booksNeeds[0], booksNeeds[1]] as const) {
          const ok = await execute(
            () => childrenService.updateBooksNeed({ child_id: childId, need_id, value: amount }),
            { quiet: true },
          );
          if (!ok) return;
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
        if (!ok) return;
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
    if (!refuseModal || refuseModal.mode !== 'review') return;
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

  async function handleVoteYes(id: string) {
    setVoteBusyId(id);
    try {
      await childUploadService.vote(id, { is_vote_yes: true });
      toast.success('Đã ghi nhận phiếu');
      await loadProfiles();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Bỏ phiếu thất bại'));
    } finally {
      setVoteBusyId(null);
    }
  }

  function handleVoteNo(id: string) {
    setRefuseModal({ id, mode: 'vote' });
    setRefuseReason('');
  }

  async function submitRefuseVote() {
    if (!refuseModal || refuseModal.mode !== 'vote') return;
    const { id } = refuseModal;
    setVoteBusyId(id);
    try {
      await childUploadService.vote(id, {
        is_vote_yes: false,
        refuse_reason: refuseReason.trim() || undefined,
      });
      toast.success('Đã ghi nhận phiếu');
      setRefuseModal(null);
      await loadProfiles();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Bỏ phiếu thất bại'));
    } finally {
      setVoteBusyId(null);
    }
  }

  const listColumns = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'gender', label: 'Gender' },
    { key: 'region', label: 'Vùng' },
    {
      key: 'date_of_birth',
      label: 'Ngày sinh',
      render: (row: Child) => formatDate(row.date_of_birth),
    },
    { key: 'identity_code', label: 'Identity code', render: (row: Child) => <CopyableTruncated value={row.identity_code} /> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'whitespace-nowrap',
      render: (row: Child) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setChildDetailRow(row);
            setChildDetailId(row.id);
            setChildDetailOpen(true);
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Details
        </button>
      ),
    },
  ];

  const refuseModalTitle = refuseModal?.mode === 'review' ? 'Refuse review' : 'Vote no';
  const busyRefuseId = refuseModal?.mode === 'review' ? busyId : voteBusyId;

  const approveInputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:border-blue-800 focus:ring-2';

  return (
    <div>
      <PageHeader
        title="Children"
        description="Review child upload requests, vote on approved profiles, and browse registered children"
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setTab('review')}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-sm font-medium transition sm:px-3 ${
            tab === 'review'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="hidden h-4 w-4 shrink-0 sm:inline" />
          <span className="truncate">Upload requests</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('profiles')}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-sm font-medium transition sm:px-3 ${
            tab === 'profiles'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListChecks className="hidden h-4 w-4 shrink-0 sm:inline" />
          <span className="truncate">Child profiles</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('list')}
          className={`flex min-w-0 flex-1 items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition sm:px-3 ${
            tab === 'list'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Children list
        </button>
      </div>

      {tab === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Pending requests only
              </span>
              <input
                type="text"
                placeholder="Region"
                value={uploadRegion}
                onChange={(e) => {
                  setUploadRegion(e.target.value);
                  setUploadPage(0);
                }}
                className="min-w-[140px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              />
              <select
                value={uploadGender}
                onChange={(e) => {
                  setUploadGender(e.target.value);
                  setUploadPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value || 'all-g'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable<UploadChildRequestEntity>
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (u) => (
                  <span>
                    {u.first_name} {u.last_name}
                  </span>
                ),
              },
              { key: 'gender', label: 'Gender', render: (u) => <span className="capitalize">{u.gender}</span> },
              { key: 'region', label: 'Vùng' },
              { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
              {
                key: 'review_status',
                label: 'Review',
                render: (u) => (u.review_status ? <StatusBadge status={u.review_status} /> : <span className="text-slate-400">—</span>),
              },
              {
                key: 'ai_evaluation',
                label: 'AI note',
                render: (u) => (
                  <span className="max-w-[200px] truncate text-slate-600" title={u.ai_evaluation}>
                    {u.ai_evaluation ?? '—'}
                  </span>
                ),
              },
              { key: 'created_at', label: 'Ngày tạo', render: (u) => formatDate(u.created_at) },
              {
                key: 'actions',
                label: 'Review',
                className: 'min-w-[120px]',
                render: (u) => (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadDetailRow(u);
                        setUploadDetailOpen(true);
                      }}
                      className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => runReview(u, true)}
                      className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => runReview(u, false)}
                      className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Refuse
                    </button>
                  </div>
                ),
              },
            ]}
            data={uploads}
            loading={uploadLoading}
            page={uploadPage}
            totalPages={uploadTotalPages}
            onPageChange={(p) => setUploadPage(p)}
            emptyMessage="No upload requests match your filters."
          />
        </div>
      )}

      {tab === 'profiles' && (
        <div className="space-y-4">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Upload requests that leaders have already approved for <code className="rounded bg-white px-1">review_status</code> appear
            here for your on-chain vote.
          </p>
          <DataTable<UploadChildRequestEntity>
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (u) => (
                  <span>
                    {u.first_name} {u.last_name}
                  </span>
                ),
              },
              { key: 'gender', label: 'Gender', render: (u) => <span className="capitalize">{u.gender}</span> },
              { key: 'region', label: 'Vùng' },
              {
                key: 'review_status',
                label: 'Review',
                render: (u) => (u.review_status ? <StatusBadge status={u.review_status} /> : <span className="text-slate-400">—</span>),
              },
              { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
              { key: 'created_at', label: 'Ngày tạo', render: (u) => formatDate(u.created_at) },
              {
                key: 'actions',
                label: 'Vote',
                className: 'whitespace-nowrap',
                render: (u) => (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadDetailRow(u);
                        setUploadDetailOpen(true);
                      }}
                      className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      disabled={voteBusyId === u.id}
                      onClick={() => void handleVoteYes(u.id)}
                      className="inline-flex items-center gap-0.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                      title="Vote yes"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={voteBusyId === u.id}
                      onClick={() => handleVoteNo(u.id)}
                      className="inline-flex items-center gap-0.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                      title="Vote no"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={profileReqs}
            loading={profilesLoading}
            page={profilePage}
            totalPages={profileTotalPages}
            onPageChange={(p) => setProfilePage(p)}
            emptyMessage="No leader-approved child upload requests to vote on."
          />
        </div>
      )}

      {tab === 'list' && (
        <DataTable<Child>
          columns={listColumns}
          data={children}
          loading={listLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Không tìm thấy trẻ em"
        />
      )}

      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Approve upload &amp; configure needs</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {approveModal.first_name} {approveModal.last_name} · {approveModal.region}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  identity_code: {approveModal.identity_code || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !approveSubmitting && !executing && setApproveModal(null)}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-slate-700">
              Chọn nhu cầu và nhập <strong>số tiền (VND)</strong>. Khi xác nhận: hệ thống có thể ghi nhận review (nếu cần), rồi cập nhật
              nhu cầu trẻ. <strong>Sách:</strong> một ô tiền áp dụng cho <strong>cả hai</strong> học kỳ (
              <code className="rounded bg-white px-1">books_needs[0]</code> và <code className="rounded bg-white px-1">books_needs[1]</code>)
              sau khi duyệt. <code className="rounded bg-white px-1">child_id</code> được tra theo <code className="rounded bg-white px-1">identity_code</code> trên hồ sơ trẻ.
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
                  <span className="font-medium text-slate-900">Meal need</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Amount basis: per month (VND/month)</span>
                  {needMeal && (
                    <GroupedNumericInput
                      min={1}
                      className={`${approveInputClass} mt-2`}
                      placeholder="e.g. 500000"
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
                  <span className="font-medium text-slate-900">Books need</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Một mức tiền (VND/kì). Sau khi review, hệ thống áp dụng cùng mức cho cả hai mã need sách (
                    <code className="rounded bg-slate-100 px-0.5">books_needs[0]</code>,{' '}
                    <code className="rounded bg-slate-100 px-0.5">books_needs[1]</code>).
                  </span>
                  {needBooks && (
                    <GroupedNumericInput
                      min={1}
                      className={`${approveInputClass} mt-2`}
                      placeholder="e.g. 800000"
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
                  <span className="font-medium text-slate-900">Health insurance need</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Amount basis: per year (VND/year)</span>
                  {needHealth && (
                    <GroupedNumericInput
                      min={1}
                      className={`${approveInputClass} mt-2`}
                      placeholder="e.g. 1200000"
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

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => !approveSubmitting && !executing && setApproveModal(null)}
                disabled={approveSubmitting || executing}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approveSubmitting || executing}
                onClick={() => void submitApproveWithNeeds()}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {approveSubmitting || executing ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{refuseModalTitle}</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              placeholder="Optional reason…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyRefuseId === refuseModal.id}
                onClick={() =>
                  void (refuseModal.mode === 'review' ? submitRefuseReview() : submitRefuseVote())
                }
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailModal
        title="Child profile"
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
            <div className="space-y-1">
              {detailField('ID', <CopyableTruncated value={c.id} chars={8} />)}
              {detailField('Name', `${c.first_name} ${c.last_name}`)}
              {detailField('Gender', <span className="capitalize">{c.gender}</span>)}
              {detailField('Vùng', c.region)}
              {detailField('Ngày sinh', formatDate(c.date_of_birth))}
              {detailField('Mã định danh', <CopyableTruncated value={c.identity_code} />)}
              {detailField('Địa chỉ nhà', c.home_address || '—')}
              {detailField('Meal need', c.meal_need ? <CopyableTruncated value={c.meal_need} /> : '—')}
              {detailField('Health insurance need', c.health_insurance_need ? <CopyableTruncated value={c.health_insurance_need} /> : '—')}
              {detailField(
                'Books needs',
                c.books_needs?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {c.books_needs.map((bid) => (
                      <CopyableTruncated key={bid} value={bid} />
                    ))}
                  </div>
                ) : '—',
              )}
              {detailField('Uploaded by', c.uploaded_by ? <CopyableTruncated value={c.uploaded_by} /> : '—')}
              {detailField('Uploaded', formatDate(c.uploaded_at))}
              {detailField('Updated', formatDate(c.updated_at))}
              {gallery.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Gallery (API)</div>
                  <div className="flex flex-wrap gap-4">
                    {gallery.map((blobId) => (
                      <EntityBlobThumb key={blobId} blobId={blobId} source="api" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>
              )}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Blob images</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} source={childBlobThumbSource(key)} className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
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
        title="Child upload request"
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
              <div className="space-y-1">
                {detailField('ID', <CopyableTruncated value={u.id} chars={8} />)}
                {detailField('Profile ID', <CopyableTruncated value={u.profile_id} chars={8} />)}
                {detailField('Name', `${u.first_name} ${u.last_name}`)}
                {detailField('Gender', <span className="capitalize">{u.gender}</span>)}
                {detailField('Vùng', u.region)}
                {detailField('Mã định danh', <CopyableTruncated value={u.identity_code} />)}
                {detailField('Ngày sinh', formatDate(u.date_of_birth))}
                {detailField('Địa chỉ nhà', u.home_address ?? '—')}
                {detailField('Status', <StatusBadge status={u.status} />)}
                {detailField('Review status', u.review_status ? <StatusBadge status={u.review_status} /> : <span className="text-slate-400">—</span>)}
                {detailField('Reviewed by', u.reviewed_by ? <CopyableTruncated value={u.reviewed_by} /> : '—')}
                {detailField('AI note', u.ai_evaluation ?? '—')}
                {detailField('Người tạo', <CopyableTruncated value={u.created_by} />)}
                {detailField('Ngày tạo', formatDate(u.created_at))}
                {detailField('Updated', formatDate(u.updated_at))}
                {detailField('Closed', formatDate(u.closed_at))}
                {detailField('Confirm upload', u.is_confirm_upload ? 'Yes' : 'No')}
                {u.first_guardian_profile && (
                  <div className="border-t border-slate-100 py-2">
                    <div className="text-xs font-medium text-slate-500">First guardian</div>
                    <div className="mt-1 text-sm text-slate-800">
                      {u.first_guardian_profile.full_name} · {u.first_guardian_profile.relation} · {u.first_guardian_profile.phone_number}
                    </div>
                  </div>
                )}
                {u.second_guardian_profile && (
                  <div className="border-t border-slate-100 py-2">
                    <div className="text-xs font-medium text-slate-500">Second guardian</div>
                    <div className="mt-1 text-sm text-slate-800">
                      {u.second_guardian_profile.full_name} · {u.second_guardian_profile.relation} · {u.second_guardian_profile.phone_number}
                    </div>
                  </div>
                )}
                {blobs.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 text-xs font-medium text-slate-600">Images</div>
                    <div className="flex flex-wrap gap-4">
                      {blobs.map(({ key, blobId }) => (
                        <div key={key} className="text-center">
                          <EntityBlobThumb
                            blobId={blobId}
                            source={key.includes('avatar') ? 'api' : 'walrus'}
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
