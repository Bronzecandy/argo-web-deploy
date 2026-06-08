'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { btnPrimary, inputClass } from '@/src/lib/uiClasses';
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
    <div className="space-y-6">
      <PageHeader
        title="Quà tặng"
        description={
          user?.address
            ? `Theo dõi quà tặng theo trẻ trong vùng · ${truncateAddress(user.address)}`
            : 'Theo dõi quà tặng theo trẻ trong vùng'
        }
      />

      <PageSection title="Tra cứu theo trẻ">
        <p className="mb-4 text-sm text-slate-500">
          Nhập mã trẻ để xem danh sách quà (dùng mã trẻ được gán trong vận hành).
        </p>
        <FilterToolbar className="mb-0 border-0 bg-transparent p-0 shadow-none">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
              Mã trẻ
            </label>
            <input
              id="child_id"
              type="text"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyChildId()}
              className={inputClass}
              placeholder="Nhập mã trẻ"
            />
          </div>
          <button type="button" onClick={applyChildId} className={btnPrimary}>
            Tải danh sách
          </button>
        </FilterToolbar>
      </PageSection>

      <PageSection title="Quà của trẻ" noPadding>
        {!appliedChildId && <p className="border-b border-slate-100 px-5 py-4 text-sm text-slate-500">Nhập mã trẻ phía trên để tải bảng.</p>}
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
                  <TableIconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiftDetailRow(r);
                      setGiftDetailId(r.id);
                      setGiftDetailOpen(true);
                    }}
                  >
                    Chi tiết
                  </TableIconButton>
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
                        className={`${btnPrimary} !px-2 !py-1 text-xs`}
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
      </PageSection>

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
            <div>
              <DetailField label="Mã" value={<CopyableTruncated value={g.id} chars={4} />} />
              <DetailField label="Người gửi" value={<CopyableTruncated value={g.sender} />} />
              <DetailField label="Người nhận" value={<CopyableTruncated value={g.recipient} />} />
              <DetailField label="Loại quà" value={g.category} />
              <DetailField label="Mô tả" value={g.description} />
              <DetailField label="Lời nhắn" value={g.message || '—'} />
              <DetailField label="Trạng thái" value={<StatusBadge status={g.status} />} />
              <DetailField label="Đơn vị vận chuyển" value={g.carrier || '—'} />
              <DetailField label="Mã vận đơn" value={g.tracking_code || '—'} />
              <DetailField label="Quà cho trẻ" value={g.is_for_child ? 'Có' : 'Không'} />
              <DetailField label="Người xác nhận đã nhận" value={g.confirm_recieved_by ? <CopyableTruncated value={g.confirm_recieved_by} /> : '—'} />
              <DetailField label="Lý do hủy" value={g.cancel_reason ?? '—'} />
              <DetailField label="Ngày tải lên" value={formatDate(g.uploaded_at)} />
              <DetailField label="Ngày giao" value={g.delivered_at ? formatDate(g.delivered_at) : '—'} />
              <DetailField label="Cập nhật lúc" value={formatDate(g.updated_at)} />
              <AiInsightPanel record={g} className="my-3" />
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Ảnh (Walrus)</div>
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
