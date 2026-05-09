'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import RegisterCenterModal from '@/src/components/leader/RegisterCenterModal';
import { collectBlobIdEntries } from '@/src/lib/blobFields';
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

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function LeaderCentersPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { refetch: refetchLeaderCenter } = useLeaderCenter();
  const [createOpen, setCreateOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<SupportCenter[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [centerDetailOpen, setCenterDetailOpen] = useState(false);
  const [centerDetailRow, setCenterDetailRow] = useState<SupportCenter | null>(null);

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
      toast.error(getErrorMessage(e, 'Không tải được danh sách trung tâm'));
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
    { key: 'region', label: 'Vùng' },
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
    {
      key: 'actions',
      label: 'Actions',
      className: 'whitespace-nowrap',
      render: (row: SupportCenter) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCenterDetailRow(row);
            setCenterDetailOpen(true);
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Details
        </button>
      ),
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

      <DetailModal
        title="Support center"
        open={centerDetailOpen}
        onClose={() => {
          setCenterDetailOpen(false);
          setCenterDetailRow(null);
        }}
        wide
      >
        {centerDetailRow &&
          (() => {
            const c = centerDetailRow;
            const blobs = collectBlobIdEntries(c);
            return (
              <div className="space-y-1">
                {detailField('ID', <span className="font-mono text-xs break-all">{c.id}</span>)}
                {detailField('Vùng', c.region)}
                {detailField('Address', c.center_address)}
                {detailField('Phone', c.center_phone_number)}
                {detailField('Uploaded', formatDate(c.uploaded_at))}
                {detailField('Updated', formatDate(c.updated_at))}
                {blobs.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 text-xs font-medium text-slate-600">Images</div>
                    <div className="flex flex-wrap gap-4">
                      {blobs.map(({ key, blobId }) => (
                        <div key={key} className="text-center">
                          <EntityBlobThumb blobId={blobId} source="walrus" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                          <div className="mt-1 text-[10px] text-slate-500">{key}</div>
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
