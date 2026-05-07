'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate } from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { centerService } from '@/src/services/center.service';
import { regionService } from '@/src/services/region.service';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { Plus } from 'lucide-react';
import type { CenterRequest, CreateCenterRequest } from '@/src/types/api.types';

const PAGE_SIZE = 20;

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
  const [createOpen, setCreateOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<CenterRequest[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

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
      setTotalPages(1);
      return;
    }
    setLoading(true);
    try {
      const res = await centerService.getByWallet(addr, { page, page_size: PAGE_SIZE });
      setCenters(normalizeCenterList(res.data));
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load centers'));
      setCenters([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

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
      setPage(0);
      setCreateOpen(false);
      void loadCenters();
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
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 transition focus:border-blue-800 focus:ring-2';

  return (
    <div>
      <PageHeader
        title="Centers"
        description="View your center registrations and submit new ones"
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

      {!user?.address ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Connect your wallet to load your centers.
        </div>
      ) : (
        <DataTable<CenterRequest>
          columns={columns}
          data={centers}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No center registrations yet"
        />
      )}

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10"
          onClick={() => setCreateOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Register center</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Region</label>
                <select
                  className={inputClass}
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  required
                >
                  <option value="">Select region…</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                <input
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                <input
                  className={inputClass}
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                  required
                />
              </div>
              <FileUploadInput
                label="Center image"
                value={form.image_blob_id}
                onChange={(val) => setForm((f) => ({ ...f, image_blob_id: val }))}
                accept="image/*"
                placeholder="Upload center image or paste blob ID"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Register center'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
