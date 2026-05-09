'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import RegisterCenterModal from '@/src/components/leader/RegisterCenterModal';
import { formatDate } from '@/src/lib/formatters';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import { useAppSelector } from '@/src/store/hooks';
import { centerService } from '@/src/services/center.service';
import { Plus } from 'lucide-react';
import type { SupportCenter } from '@/src/types/api.types';

const PAGE_SIZE = 20;

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

function normalizeCenterList(body: { data?: unknown }): SupportCenter[] {
  const raw = body.data;
  if (Array.isArray(raw)) return raw as SupportCenter[];
  if (raw && typeof raw === 'object') return [raw as SupportCenter];
  return [];
}

export default function LeaderCentersPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { refetch: refetchLeaderCenter } = useLeaderCenter();
  const [createOpen, setCreateOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<SupportCenter[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  const columns = [
    { key: 'region', label: 'Region' },
    { key: 'center_address', label: 'Address' },
    { key: 'center_phone_number', label: 'Phone' },
    {
      key: 'uploaded_at',
      label: 'Uploaded',
      render: (row: SupportCenter) => formatDate(row.uploaded_at),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (row: SupportCenter) => formatDate(row.updated_at),
    },
  ];

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
        <DataTable<SupportCenter>
          columns={columns}
          data={centers}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No center registrations yet"
        />
      )}

      <RegisterCenterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          void refetchLeaderCenter();
          void loadCenters();
        }}
      />
    </div>
  );
}
