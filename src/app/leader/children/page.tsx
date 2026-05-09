'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCheck, ListChecks, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
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
  { value: '', label: 'All genders' },
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

  /** Approve (review OK) — configure needs before review + PUT needs (no child-upload confirm) */
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
      toast.error(getErrorMessage(e, 'Failed to load children'));
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
      toast.error(getErrorMessage(e, 'Failed to load upload requests'));
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
      toast.error(getErrorMessage(e, 'Failed to load child upload requests'));
      setProfileReqs([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [profilePage]);

  useEffect(() => {
    if (tab !== 'profiles') return;
    void loadProfiles();
  }, [tab, loadProfiles]);

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
        toast.error('Không tìm thấy child với identity_code này trong danh sách /children');
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

      toast.success('Review saved and child needs updated');
      setApproveModal(null);
      await loadUploads();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Operation failed'));
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
      toast.success('Review refusal recorded');
      setRefuseModal(null);
      await loadUploads();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Review failed'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleVoteYes(id: string) {
    setVoteBusyId(id);
    try {
      await childUploadService.vote(id, { is_vote_yes: true });
      toast.success('Vote recorded');
      await loadProfiles();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Vote failed'));
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
      toast.success('Vote recorded');
      setRefuseModal(null);
      await loadProfiles();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Vote failed'));
    } finally {
      setVoteBusyId(null);
    }
  }

  const columns = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'gender', label: 'Gender' },
    { key: 'region', label: 'Region' },
    {
      key: 'date_of_birth',
      label: 'Date of birth',
      render: (row: Child) => formatDate(row.date_of_birth),
    },
    { key: 'identity_code', label: 'Identity code' },
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
              { key: 'id', label: 'ID', render: (u) => <span className="font-mono text-xs">{truncateAddress(u.id, 8)}</span> },
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
              { key: 'region', label: 'Region' },
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
              { key: 'created_at', label: 'Created', render: (u) => formatDate(u.created_at) },
              {
                key: 'actions',
                label: 'Review',
                className: 'min-w-[120px]',
                render: (u) => (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
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
            Requests with <code className="rounded bg-white px-1">review_status</code> approved by local leaders appear here
            for on-chain voting: <code className="rounded bg-white px-1">POST /child-upload-reqs/{'{id}'}/vote</code>.
          </p>
          <DataTable<UploadChildRequestEntity>
            columns={[
              { key: 'id', label: 'ID', render: (u) => <span className="font-mono text-xs">{truncateAddress(u.id, 8)}</span> },
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
              { key: 'region', label: 'Region' },
              {
                key: 'review_status',
                label: 'Review',
                render: (u) => (u.review_status ? <StatusBadge status={u.review_status} /> : <span className="text-slate-400">—</span>),
              },
              { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
              { key: 'created_at', label: 'Created', render: (u) => formatDate(u.created_at) },
              {
                key: 'actions',
                label: 'Vote',
                className: 'whitespace-nowrap',
                render: (u) => (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
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
          columns={columns}
          data={children}
          loading={listLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No children found"
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
              Chọn nhu cầu và nhập <strong>số tiền (VND)</strong>. Khi <strong>Confirm</strong>:{' '}
              <code className="rounded bg-white px-1">POST …/child-upload-reqs/{'{id}'}/review</code> (nếu cần), rồi các{' '}
              <code className="rounded bg-white px-1">PUT</code> need; <strong>Books</strong> dùng một ô tiền nhưng gọi{' '}
              <code className="rounded bg-white px-1">PUT /children/books-need</code> <strong>hai lần</strong> (cùng số tiền) với{' '}
              <code className="rounded bg-white px-1">books_needs[0]</code> và{' '}
              <code className="rounded bg-white px-1">books_needs[1]</code> sau khi duyệt —{' '}
              <code className="rounded bg-white px-1">child_id</code> lấy qua <code className="rounded bg-white px-1">identity_code</code> +{' '}
              <code className="rounded bg-white px-1">GET /children</code>.
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
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={`${approveInputClass} mt-2`}
                      placeholder="e.g. 500000"
                      value={mealValue}
                      onChange={(e) => setMealValue(e.target.value)}
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
                    Một mức tiền (VND/kì). Sau khi review, hệ thống gửi hai lần{' '}
                    <code className="rounded bg-slate-100 px-0.5">PUT …/books-need</code> với{' '}
                    <code className="rounded bg-slate-100 px-0.5">books_needs[0]</code> và{' '}
                    <code className="rounded bg-slate-100 px-0.5">books_needs[1]</code>.
                  </span>
                  {needBooks && (
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={`${approveInputClass} mt-2`}
                      placeholder="e.g. 800000"
                      value={booksValue}
                      onChange={(e) => setBooksValue(e.target.value)}
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
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={`${approveInputClass} mt-2`}
                      placeholder="e.g. 1200000"
                      value={healthValue}
                      onChange={(e) => setHealthValue(e.target.value)}
                      disabled={approveSubmitting || executing}
                    />
                  )}
                </span>
              </label>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Request body uses <code className="rounded bg-slate-100 px-1">child_id</code> (child profile id) and{' '}
              <code className="rounded bg-slate-100 px-1">value</code>. On-chain steps use{' '}
              <code className="rounded bg-slate-100 px-1">POST /tx/execute</code> when the API returns{' '}
              <code className="rounded bg-slate-100 px-1">tx_bytes</code>.
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
    </div>
  );
}
