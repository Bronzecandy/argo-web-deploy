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
import type { Child, UploadChildRequestEntity } from '@/src/types/api.types';

type Tab = 'review' | 'profiles' | 'list';

/** Chỉ hiển thị dòng có review_status tương đương Approved (chuẩn hóa hoa/thường, khoảng trắng). */
function isChildUploadReviewApproved(reviewStatus?: string) {
  const s = (reviewStatus || '').trim().toLowerCase().replace(/\s+/g, '_');
  return s === 'approved';
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
];

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
  const [tab, setTab] = useState<Tab>('review');

  const [listLoading, setListLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [uploadLoading, setUploadLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadChildRequestEntity[]>([]);
  const [uploadPage, setUploadPage] = useState(0);
  const [uploadTotalPages, setUploadTotalPages] = useState(1);
  const [uploadStatus, setUploadStatus] = useState('');
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
        status: uploadStatus || undefined,
        region: uploadRegion.trim() || undefined,
        gender: uploadGender || undefined,
      });
      const body = res.data;
      setUploads(Array.isArray(body.data) ? body.data : []);
      setUploadTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load upload requests'));
      setUploads([]);
    } finally {
      setUploadLoading(false);
    }
  }, [uploadPage, uploadStatus, uploadRegion, uploadGender]);

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

  async function runReview(id: string, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id, mode: 'review' });
      setRefuseReason('');
      return;
    }
    setBusyId(id);
    try {
      await childUploadService.review(id, { is_vote_yes: true });
      toast.success('Review recorded');
      await loadUploads();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Review failed'));
    } finally {
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
            <div className="flex flex-wrap gap-3">
              <select
                value={uploadStatus}
                onChange={(e) => {
                  setUploadStatus(e.target.value);
                  setUploadPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all-s'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
                      onClick={() => void runReview(u.id, true)}
                      className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      OK
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void runReview(u.id, false)}
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
