'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate } from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { centerService } from '@/src/services/center.service';
import type { CenterRequest, CreateCenterRequest } from '@/src/types/api.types';

type Tab = 'mine' | 'register';

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

function normalizeCenterList(body: { data?: unknown }): CenterRequest[] {
  const raw = body.data;
  if (Array.isArray(raw)) return raw as CenterRequest[];
  if (raw && typeof raw === 'object') return [raw as CenterRequest];
  return [];
}

export default function LeaderCentersPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [tab, setTab] = useState<Tab>('mine');

  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<CenterRequest[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    region: '',
    address: '',
    phone_number: '',
    image_blob_id: '',
  });

  const loadCenters = useCallback(async () => {
    const addr = user?.address;
    if (!addr) {
      setCenters([]);
      return;
    }
    setLoading(true);
    try {
      const res = await centerService.getByWallet(addr);
      setCenters(normalizeCenterList(res.data));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load centers'));
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    if (tab !== 'mine') return;
    void loadCenters();
  }, [tab, loadCenters]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim() || !form.image_blob_id.trim() || !form.phone_number.trim() || !form.region.trim()) {
      toast.error('All fields are required');
      return;
    }
    const data: CreateCenterRequest = {
      address: form.address.trim(),
      image_blob_id: form.image_blob_id.trim(),
      phone_number: form.phone_number.trim(),
      region: form.region.trim(),
    };
    setSubmitting(true);
    try {
      await centerService.create(data);
      toast.success('Center registration submitted');
      setForm({ region: '', address: '', phone_number: '', image_blob_id: '' });
      setTab('mine');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: 'region', label: 'Region' },
    { key: 'address', label: 'Address' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'image_blob_id', label: 'Image blob' },
    {
      key: 'status',
      label: 'Status',
      render: (row: CenterRequest) => <StatusBadge status={row.status || 'unknown'} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: CenterRequest) => formatDate(row.created_at),
    },
  ];

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 transition focus:border-emerald-600 focus:ring-2';

  return (
    <div>
      <PageHeader title="Centers" description="View your center registrations and submit new ones" />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'mine'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My centers
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'register'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Register new center
        </button>
      </div>

      {tab === 'mine' ? (
        !user?.address ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Connect your wallet to load your centers.
          </div>
        ) : (
          <DataTable<CenterRequest>
            columns={columns}
            data={centers}
            loading={loading}
            emptyMessage="No center registrations yet"
          />
        )
      ) : (
        <form
          onSubmit={handleRegister}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Region</label>
            <input className={inputClass} value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
            <input className={inputClass} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
            <input className={inputClass} value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Image blob ID</label>
            <input
              className={inputClass}
              value={form.image_blob_id}
              onChange={(e) => setForm((f) => ({ ...f, image_blob_id: e.target.value }))}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Register center'}
          </button>
        </form>
      )}
    </div>
  );
}
