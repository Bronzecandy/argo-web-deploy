'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import { formatDate, toDDMMYYYY } from '@/src/lib/formatters';
import { childUploadService } from '@/src/services/child-upload.service';
import { childrenService } from '@/src/services/children.service';
import { regionService } from '@/src/services/region.service';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import type { Child, UploadChildRequest } from '@/src/types/api.types';

type Tab = 'upload' | 'list';

const PAGE_SIZE = 10;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export default function LeaderChildrenPage() {
  const [tab, setTab] = useState<Tab>('upload');

  const [listLoading, setListLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
    try {
      await childUploadService.create(data);
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
        description="Upload new child profiles and browse registered children"
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'upload'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upload new child
        </button>
        <button
          type="button"
          onClick={() => setTab('list')}
          className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
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
                <input className={inputClass} value={form.g1_relation} onChange={(e) => setField('g1_relation', e.target.value)} required />
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
                <input className={inputClass} value={form.g2_relation} onChange={(e) => setField('g2_relation', e.target.value)} />
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
    </div>
  );
}
