'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
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

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

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

  const [giftDetailOpen, setGiftDetailOpen] = useState(false);
  const [giftDetailId, setGiftDetailId] = useState<string | null>(null);
  const [giftDetailRow, setGiftDetailRow] = useState<Gift | null>(null);
  const [giftDetailData, setGiftDetailData] = useState<Gift | null>(null);
  const [giftDetailLoading, setGiftDetailLoading] = useState(false);

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
      toast.error('Không tải được danh sách quà');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedChildId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!giftDetailOpen || !giftDetailId) {
      setGiftDetailData(null);
      return;
    }
    setGiftDetailLoading(true);
    setGiftDetailData(null);
    void giftService
      .getById(giftDetailId)
      .then((res) => setGiftDetailData(res.data ?? null))
      .catch(() => setGiftDetailData(null))
      .finally(() => setGiftDetailLoading(false));
  }, [giftDetailOpen, giftDetailId]);

  const applyChildId = () => {
    const id = childId.trim();
    if (!id) {
      toast.error('Nhập mã trẻ để tải quà');
      return;
    }
    setAppliedChildId(id);
    setPage(0);
  };

  const { execute } = useExecuteTransaction();

  const handleConfirmReceive = async (giftId: string) => {
    const blob = deliveredInputs[giftId]?.trim();
    if (!blob) {
      toast.error('Cần blob ID ảnh đã giao');
      return;
    }
    setConfirmingId(giftId);
    const ok = await execute(
      () => giftService.confirmReceive(giftId, blob),
      { successMessage: 'Đã xác nhận nhận quà và thực thi on-chain' },
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
        title="Quà tặng"
        description={
          user?.address
            ? `Theo dõi quà tặng theo trẻ trong vùng · ${truncateAddress(user.address)}`
            : 'Theo dõi quà tặng theo trẻ trong vùng'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Trẻ</h2>
        <p className="mb-4 text-sm text-slate-500">
          Nhập mã trẻ để xem danh sách quà (dùng mã trẻ được gán trong vận hành).
        </p>
        <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
              Mã trẻ
            </label>
            <input
              id="child_id"
              type="text"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
              placeholder="Mã trẻ on-chain hoặc hệ thống"
            />
          </div>
          <button
            type="button"
            onClick={applyChildId}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900"
          >
            Tải danh sách
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quà của trẻ</h2>
        {!appliedChildId && <p className="text-sm text-slate-500">Nhập mã trẻ phía trên để tải bảng.</p>}
        {appliedChildId ? (
          <DataTable<Gift>
            columns={[
              { key: 'category', label: 'Loại' },
              {
                key: 'description',
                label: 'Mô tả',
                render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
              },
              {
                key: 'message',
                label: 'Lời nhắn',
                render: (r) => <span className="line-clamp-2 max-w-[180px]">{r.message || '-'}</span>,
              },
              { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'carrier', label: 'Đơn vị vận chuyển', render: (r) => r.carrier || '-' },
              { key: 'tracking_code', label: 'Mã vận đơn', render: (r) => r.tracking_code || '-' },
              {
                key: 'gift_image_blob_id',
                label: 'Ảnh quà',
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
              {
                key: 'details',
                label: 'Chi tiết',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiftDetailRow(r);
                      setGiftDetailId(r.id);
                      setGiftDetailOpen(true);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Chi tiết
                  </button>
                ),
              },
              { key: 'uploaded_at', label: 'Ngày tải', render: (r) => formatDate(r.uploaded_at) },
              {
                key: 'confirm',
                label: 'Xác nhận đã nhận',
                className: 'min-w-[220px]',
                render: (r) =>
                  canConfirm(r) ? (
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <FileUploadInput
                        value={deliveredInputs[r.id] ?? ''}
                        onChange={(val) => setDeliveredInputs((prev) => ({ ...prev, [r.id]: val }))}
                        accept="image/*"
                        placeholder="Tải hoặc dán blob ID"
                      />
                      <button
                        type="button"
                        disabled={confirmingId === r.id}
                        onClick={() => void handleConfirmReceive(r.id)}
                        className="rounded-lg bg-blue-800 px-2 py-1 text-xs font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                      >
                        {confirmingId === r.id ? 'Đang xử lý…' : 'Xác nhận nhận quà'}
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
            emptyMessage="Chưa có quà cho trẻ này"
          />
        ) : null}
      </section>

      <DetailModal
        title="Quà tặng"
        open={giftDetailOpen}
        onClose={() => {
          setGiftDetailOpen(false);
          setGiftDetailId(null);
          setGiftDetailRow(null);
        }}
        loading={giftDetailLoading}
        wide
      >
        {(() => {
          const g = giftDetailData ?? giftDetailRow;
          if (!g) return null;
          const blobs = collectBlobIdEntries(g);
          return (
            <div className="space-y-1">
              {detailField('ID', <CopyableTruncated value={g.id} chars={4} />)}
              {detailField('Sender', <CopyableTruncated value={g.sender} />)}
              {detailField('Recipient', <CopyableTruncated value={g.recipient} />)}
              {detailField('Category', g.category)}
              {detailField('Description', g.description)}
              {detailField('Message', g.message || '—')}
              {detailField('Status', <StatusBadge status={g.status} />)}
              {detailField('Carrier', g.carrier || '—')}
              {detailField('Mã vận đơn', g.tracking_code || '—')}
              {detailField('For child', g.is_for_child ? 'Yes' : 'No')}
              {detailField('Confirm received by', g.confirm_recieved_by ? <CopyableTruncated value={g.confirm_recieved_by} /> : '—')}
              {detailField('Lý do hủy', g.cancel_reason ?? '—')}
              {detailField('Uploaded', formatDate(g.uploaded_at))}
              {detailField('Delivered', g.delivered_at ? formatDate(g.delivered_at) : '—')}
              {detailField('Updated', formatDate(g.updated_at))}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Images (Walrus · gift_image_blob_id / delivered_image_blob_id)</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} className="h-24 w-24 rounded-md border border-slate-200 object-cover" />
                        <div className="mt-1 text-[10px] text-slate-500">{blobFieldDisplayLabel(key)}</div>
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
