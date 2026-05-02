'use client';

import { useCallback, useEffect, useState } from 'react';
import { Baby, Check, ClipboardCheck, FileUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { childUploadService } from '@/src/services/child-upload.service';
import { childrenService } from '@/src/services/children.service';
import type { Child, UploadChildRequestEntity } from '@/src/types/api.types';

type Tab = 'uploads' | 'children';

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

export default function AdminChildrenPage() {
  const [activeTab, setActiveTab] = useState<Tab>('uploads');

  const [uploadLoading, setUploadLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadChildRequestEntity[]>([]);
  const [uploadPage, setUploadPage] = useState(0);
  const [uploadTotalPages, setUploadTotalPages] = useState(1);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadRegion, setUploadRegion] = useState('');
  const [uploadGender, setUploadGender] = useState('');

  const [childLoading, setChildLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childPage, setChildPage] = useState(0);
  const [childTotalPages, setChildTotalPages] = useState(1);
  const [childRegion, setChildRegion] = useState('');
  const [childGender, setChildGender] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string; kind: 'review' } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

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
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Failed to load upload requests');
      setUploads([]);
    } finally {
      setUploadLoading(false);
    }
  }, [uploadPage, uploadStatus, uploadRegion, uploadGender]);

  const loadChildren = useCallback(async () => {
    setChildLoading(true);
    try {
      const res = await childrenService.list({
        page: childPage,
        page_size: PAGE_SIZE,
        region: childRegion.trim() || undefined,
        gender: childGender || undefined,
      });
      const body = res.data;
      setChildren(Array.isArray(body.data) ? body.data : []);
      setChildTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Failed to load children');
      setChildren([]);
    } finally {
      setChildLoading(false);
    }
  }, [childPage, childRegion, childGender]);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  useEffect(() => {
    if (activeTab !== 'children') return;
    void loadChildren();
  }, [activeTab, loadChildren]);

  async function runReview(id: string, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id, kind: 'review' });
      setRefuseReason('');
      return;
    }
    setBusyId(id);
    try {
      await childUploadService.review(id, { is_vote_yes: true });
      toast.success('Review recorded');
      await loadUploads();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Review failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitRefuseReview() {
    if (!refuseModal) return;
    const { id } = refuseModal;
    setBusyId(id);
    try {
      await childUploadService.review(id, { is_vote_yes: false, refuse_reason: refuseReason || undefined });
      toast.success('Review refusal recorded');
      setRefuseModal(null);
      await loadUploads();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Review failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Children"
        description="Manage child upload requests and on-chain child profiles"
        actions={
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            Admin
          </span>
        }
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('uploads')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === 'uploads'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileUp className="h-4 w-4" />
          Upload requests
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('children')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === 'children'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Baby className="h-4 w-4" />
          Children list
        </button>
      </div>

      {activeTab === 'uploads' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={uploadStatus}
                onChange={(e) => {
                  setUploadStatus(e.target.value);
                  setUploadPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
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
                className="min-w-[140px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
              />
              <select
                value={uploadGender}
                onChange={(e) => {
                  setUploadGender(e.target.value);
                  setUploadPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
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
                      onClick={() => runReview(u.id, true)}
                      className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      OK
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => runReview(u.id, false)}
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

      {activeTab === 'children' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Region"
              value={childRegion}
              onChange={(e) => {
                setChildRegion(e.target.value);
                setChildPage(0);
              }}
              className="min-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
            />
            <select
              value={childGender}
              onChange={(e) => {
                setChildGender(e.target.value);
                setChildPage(0);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value || 'all-cg'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <DataTable<Child>
            columns={[
              { key: 'id', label: 'ID', render: (c) => <span className="font-mono text-xs">{truncateAddress(c.id, 8)}</span> },
              {
                key: 'name',
                label: 'Name',
                render: (c) => (
                  <span>
                    {c.first_name} {c.last_name}
                  </span>
                ),
              },
              { key: 'gender', label: 'Gender', render: (c) => <span className="capitalize">{c.gender}</span> },
              { key: 'region', label: 'Region' },
              { key: 'date_of_birth', label: 'Date of birth', render: (c) => formatDate(c.date_of_birth) },
              {
                key: 'identity_code',
                label: 'Identity',
                render: (c) => <span className="font-mono text-xs">{truncateAddress(c.identity_code, 10)}</span>,
              },
            ]}
            data={children}
            loading={childLoading}
            page={childPage}
            totalPages={childTotalPages}
            onPageChange={(p) => setChildPage(p)}
            emptyMessage="No children found for the selected filters."
          />
        </div>
      )}

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse review</h3>
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
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
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
                disabled={busyId === refuseModal.id}
                onClick={() => void submitRefuseReview()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
