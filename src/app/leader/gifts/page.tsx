'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { giftService } from '@/src/services/gift.service';
import { blobService } from '@/src/services/blob.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import type { Gift } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function LeaderGiftsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [childId, setChildId] = useState('');
  const [appliedChildId, setAppliedChildId] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Gift[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deliveredInputs, setDeliveredInputs] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appliedChildId.trim()) {
      setRows([]);
      setTotalPages(1);
      return;
    }
    setLoading(true);
    try {
      const res = await giftService.listByChild(appliedChildId.trim(), { page, page_size: PAGE_SIZE, sort_order: 'desc' });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load gifts');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedChildId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyChildId = () => {
    const id = childId.trim();
    if (!id) {
      toast.error('Enter a child ID to load gifts');
      return;
    }
    setAppliedChildId(id);
    setPage(0);
  };

  const { execute } = useExecuteTransaction();

  const handleConfirmReceive = async (giftId: string) => {
    const blob = deliveredInputs[giftId]?.trim();
    if (!blob) {
      toast.error('Delivered image blob ID is required');
      return;
    }
    setConfirmingId(giftId);
    const ok = await execute(
      () => giftService.confirmReceive(giftId, blob),
      { successMessage: 'Receive confirmed & executed on-chain' },
    );
    if (ok) {
      setDeliveredInputs((prev) => ({ ...prev, [giftId]: '' }));
      void load();
    }
    setConfirmingId(null);
  };

  const canConfirm = (g: Gift) => {
    const s = g.status?.toLowerCase();
    return s === 'shipped' || s === 'in_transit' || s === 'delivering' || s === 'pending_receive';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gifts"
        description={
          user?.address
            ? `Track gifts for a child in your region · ${truncateAddress(user.address)}`
            : 'Track gifts for a child in your region'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Child</h2>
        <p className="mb-4 text-sm text-slate-500">
          Enter a child ID to list their gifts (use your assigned default child ID from operations).
        </p>
        <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
              Child ID
            </label>
            <input
              id="child_id"
              type="text"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="Child on-chain or system ID"
            />
          </div>
          <button
            type="button"
            onClick={applyChildId}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Load gifts
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Gifts for child</h2>
        {!appliedChildId && <p className="text-sm text-slate-500">Enter a child ID above to load the table.</p>}
        {appliedChildId ? (
          <DataTable<Gift>
            columns={[
              { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
              { key: 'category', label: 'Category' },
              {
                key: 'description',
                label: 'Description',
                render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
              },
              {
                key: 'message',
                label: 'Message',
                render: (r) => <span className="line-clamp-2 max-w-[180px]">{r.message || '-'}</span>,
              },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'carrier', label: 'Carrier', render: (r) => r.carrier || '-' },
              { key: 'tracking_code', label: 'Tracking', render: (r) => r.tracking_code || '-' },
              {
                key: 'gift_image_blob_id',
                label: 'Gift image',
                render: (r) => {
                  const url = blobService.getUrl(r.gift_image_blob_id);
                  if (!url) return '-';
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block" onClick={(e) => e.stopPropagation()}>
                      <WalrusFallbackImg blobId={r.gift_image_blob_id} className="h-12 w-12 rounded-md border border-slate-200 object-cover" />
                    </a>
                  );
                },
              },
              { key: 'uploaded_at', label: 'Uploaded', render: (r) => formatDate(r.uploaded_at) },
              {
                key: 'confirm',
                label: 'Confirm receive',
                className: 'min-w-[220px]',
                render: (r) =>
                  canConfirm(r) ? (
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <FileUploadInput
                        value={deliveredInputs[r.id] ?? ''}
                        onChange={(val) => setDeliveredInputs((prev) => ({ ...prev, [r.id]: val }))}
                        accept="image/*"
                        placeholder="Upload or paste blob ID"
                      />
                      <button
                        type="button"
                        disabled={confirmingId === r.id}
                        onClick={() => void handleConfirmReceive(r.id)}
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {confirmingId === r.id ? 'Confirming…' : 'Confirm receive'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  ),
              },
            ]}
            data={rows}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No gifts for this child"
          />
        ) : null}
      </section>
    </div>
  );
}
