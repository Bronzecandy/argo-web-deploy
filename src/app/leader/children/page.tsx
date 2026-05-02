'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ListChecks, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, toDDMMYYYY, truncateAddress } from '@/src/lib/formatters';
import { childUploadService } from '@/src/services/child-upload.service';
import { childrenService } from '@/src/services/children.service';
import { regionService } from '@/src/services/region.service';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import type { Child, UploadChildRequest, UploadChildRequestEntity } from '@/src/types/api.types';

type Tab = 'upload' | 'list' | 'profiles';

/** Chỉ hiển thị dòng có review_status tương đương Approved (chuẩn hóa hoa/thường, khoảng trắng). */
function isChildUploadReviewApproved(reviewStatus?: string) {
  const s = (reviewStatus || '').trim().toLowerCase().replace(/\s+/g, '_');
  return s === 'approved';
}

const PAGE_SIZE = 20;

const GENDER_OPTIONS = [
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
  const [tab, setTab] = useState<Tab>('upload');

  const [listLoading, setListLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileReqs, setProfileReqs] = useState<UploadChildRequestEntity[]>([]);
  const [profilePage, setProfilePage] = useState(0);
  const [profileTotalPages, setProfileTotalPages] = useState(1);
  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    region: '',
    home_address: '',
    identity_code: '',
    avatar_blob_id: '',
    home_blob_id: '',
    g1_full_name: '',
    g1_phone: '',
    g1_relation: '',
    g1_id_blob: '',
    g2_full_name: '',
    g2_phone: '',
    g2_relation: '',
    g2_id_blob: '',
  });

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
    setRefuseModal({ id });
    setRefuseReason('');
  }

  async function submitRefuseVote() {
    if (!refuseModal) return;
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

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.gender || !form.date_of_birth) {
      toast.error('Please fill required child fields');
      return;
    }
    if (!form.g1_full_name.trim() || !form.g1_phone.trim() || !form.g1_relation.trim() || !form.g1_id_blob.trim()) {
      toast.error('First guardian details are required');
      return;
    }
    const data: UploadChildRequest = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gender: form.gender,
      date_of_birth: toDDMMYYYY(form.date_of_birth),
      region: form.region.trim(),
      home_address: form.home_address.trim(),
      identity_code: form.identity_code.trim(),
      avatar_blob_id: form.avatar_blob_id.trim(),
      home_blob_id: form.home_blob_id.trim(),
      first_guardian: {
        guardian_full_name: form.g1_full_name.trim(),
        guardian_phone_number: form.g1_phone.trim(),
        guardian_relation: form.g1_relation.trim(),
        identity_card_blob_id: form.g1_id_blob.trim(),
      },
    };
    if (form.g2_full_name.trim()) {
      data.second_guardian = {
        guardian_full_name: form.g2_full_name.trim(),
        guardian_phone_number: form.g2_phone.trim(),
        guardian_relation: form.g2_relation.trim(),
        identity_card_blob_id: form.g2_id_blob.trim(),
      };
    }
    setSubmitting(true);
    console.log('[ChildUpload] Sending payload:', JSON.stringify(data, null, 2));
    try {
      const res = await childUploadService.create(data);
      console.log('[ChildUpload] Success:', res.status, res.data);
      toast.success('Child upload request submitted');
      setForm({
        first_name: '',
        last_name: '',
        gender: '',
        date_of_birth: '',
        region: '',
        home_address: '',
        identity_code: '',
        avatar_blob_id: '',
        home_blob_id: '',
        g1_full_name: '',
        g1_phone: '',
        g1_relation: '',
        g1_id_blob: '',
        g2_full_name: '',
        g2_phone: '',
        g2_relation: '',
        g2_id_blob: '',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: any; headers?: any }; message?: string; code?: string; request?: any };
      console.error('[ChildUpload] Error full object:', err);
      console.error('[ChildUpload] response?.status:', ax.response?.status);
      console.error('[ChildUpload] response?.data:', ax.response?.data);
      console.error('[ChildUpload] error.message:', ax.message);
      console.error('[ChildUpload] error.code:', ax.code);
      console.error('[ChildUpload] Has request but no response:', !!ax.request && !ax.response);
      toast.error(getErrorMessage(err, 'Upload failed'));
    } finally {
      setSubmitting(false);
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

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 transition focus:border-emerald-600 focus:ring-2';

  return (
    <div>
      <PageHeader
        title="Children"
        description="Upload child requests, vote on admin-approved profiles, and browse registered children"
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex min-w-0 flex-1 items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition sm:px-3 ${
            tab === 'upload'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upload new child
        </button>
        <button
          type="button"
          onClick={() => setTab('profiles')}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-sm font-medium transition sm:px-3 ${
            tab === 'profiles'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
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
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Children list
        </button>
      </div>

      {tab === 'upload' ? (
        <form
          onSubmit={handleUpload}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <section>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Child</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">First name</label>
                <input className={inputClass} value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Last name</label>
                <input className={inputClass} value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Gender</label>
                <select
                  className={inputClass}
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Date of birth</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.date_of_birth}
                  onChange={(e) => setField('date_of_birth', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Region</label>
                <select
                  className={inputClass}
                  value={form.region}
                  onChange={(e) => setField('region', e.target.value)}
                  required
                >
                  <option value="">Select region…</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Home address</label>
                <input className={inputClass} value={form.home_address} onChange={(e) => setField('home_address', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Identity code</label>
                <input className={inputClass} value={form.identity_code} onChange={(e) => setField('identity_code', e.target.value)} />
              </div>
              <FileUploadInput
                label="Avatar image"
                value={form.avatar_blob_id}
                onChange={(val) => setField('avatar_blob_id', val)}
                accept="image/*"
                placeholder="Upload avatar or paste blob ID"
              />
              <FileUploadInput
                label="Home image"
                value={form.home_blob_id}
                onChange={(val) => setField('home_blob_id', val)}
                accept="image/*"
                placeholder="Upload home photo or paste blob ID"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">First guardian</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                <input className={inputClass} value={form.g1_full_name} onChange={(e) => setField('g1_full_name', e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                <input className={inputClass} value={form.g1_phone} onChange={(e) => setField('g1_phone', e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Relation</label>
                <select className={inputClass} value={form.g1_relation} onChange={(e) => setField('g1_relation', e.target.value)} required>
                  <option value="">Select…</option>
                  <option value="Cha">Cha</option>
                  <option value="Mẹ">Mẹ</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <FileUploadInput
                  label="Identity card image"
                  value={form.g1_id_blob}
                  onChange={(val) => setField('g1_id_blob', val)}
                  accept="image/*"
                  placeholder="Upload ID card or paste blob ID"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Second guardian (optional)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                <input className={inputClass} value={form.g2_full_name} onChange={(e) => setField('g2_full_name', e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                <input className={inputClass} value={form.g2_phone} onChange={(e) => setField('g2_phone', e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Relation</label>
                <select className={inputClass} value={form.g2_relation} onChange={(e) => setField('g2_relation', e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Cha">Cha</option>
                  <option value="Mẹ">Mẹ</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <FileUploadInput
                  label="Identity card image"
                  value={form.g2_id_blob}
                  onChange={(val) => setField('g2_id_blob', val)}
                  accept="image/*"
                  placeholder="Upload ID card or paste blob ID"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit upload request'}
          </button>
        </form>
      ) : tab === 'profiles' ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Giao diện chỉ liệt kê các dòng có <code className="rounded bg-white px-1">review_status</code> tương đương{' '}
            <code className="rounded bg-white px-1">Approved</code>. Vote:{' '}
            <code className="rounded bg-white px-1">POST /child-upload-reqs/{'{id}'}/vote</code>.
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
                      className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
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
            emptyMessage="No admin-approved child upload requests to vote on."
          />
        </div>
      ) : (
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
              <h3 className="text-lg font-semibold text-slate-900">Vote no</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Optional reason for refusal.</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
              placeholder="Reason…"
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
                disabled={voteBusyId === refuseModal.id}
                onClick={() => void submitRefuseVote()}
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
