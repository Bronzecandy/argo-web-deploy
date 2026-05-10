'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { formatDate, formatVND } from '@/src/lib/formatters';
import { transactionService } from '@/src/services/transaction.service';
import type { TransactionRecord } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'donate', label: 'Quyên góp' },
  { value: 'withdraw', label: 'Rút tiền' },
  { value: 'transfer', label: 'Chuyển' },
  { value: 'vote', label: 'Bỏ phiếu' },
  { value: 'approve', label: 'Phê duyệt' },
  { value: 'refuse', label: 'Từ chối' },
  { value: 'create', label: 'Tạo mới' },
  { value: 'execute', label: 'Thực thi' },
  { value: 'confirm', label: 'Xác nhận' },
];

export default function AdminAnalyticsPage() {
  const [page, setPage] = useState(0);
  const [actionType, setActionType] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [appliedActor, setAppliedActor] = useState('');
  const [rows, setRows] = useState<TransactionRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<TransactionRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const applyActorFilter = () => {
    setAppliedActor(actorSearch.trim());
    setPage(0);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionService.list({
        page,
        page_size: PAGE_SIZE,
        action_type: actionType || undefined,
        actor: appliedActor || undefined,
        sort_order: 'desc',
      });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      setTotalCount(res.data.amount ?? 0);
    } catch (e) {
      console.error(e);
      toast.error('Không tải được giao dịch');
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, actionType, appliedActor]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailId) {
      setDetailRow(null);
      return;
    }
    setDetailLoading(true);
    void transactionService
      .getById(detailId)
      .then((res) => setDetailRow(res.data))
      .catch(() => setDetailRow(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  return (
    <div>
      <PageHeader title="Lịch sử giao dịch" description="Giao dịch trên chuỗi và lịch sử trên nền tảng" />

      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Loại hành động</label>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(0);
            }}
            className="min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Địa chỉ người thực hiện</label>
          <input
            type="text"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyActorFilter()}
            placeholder="Tìm theo ví hoặc người thực hiện"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
        </div>
        <button
          type="button"
          onClick={applyActorFilter}
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          Tìm
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-600">
        Tổng số bản ghi khớp bộ lọc: <span className="font-semibold text-blue-900">{totalCount}</span>
      </p>

      <DataTable<TransactionRecord>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Không có giao dịch phù hợp bộ lọc"
        columns={[
          {
            key: 'actor_address',
            label: 'Người thực hiện',
            render: (r) => <CopyableTruncated value={r.actor_address} />,
          },
          { key: 'action_type', label: 'Hành động' },
          {
            key: 'amount',
            label: 'Số tiền',
            render: (r) => (r.amount != null ? formatVND(r.amount) : '-'),
          },
          { key: 'coin_type', label: 'Loại coin' },
          { key: 'pool_name', label: 'Quỹ', render: (r) => r.pool_name || '-' },
          { key: 'message', label: 'Ghi chú', render: (r) => <span className="max-w-xs truncate">{r.message || '-'}</span> },
          { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
          {
            key: 'details',
            label: 'Chi tiết',
            render: (r) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailId(r.id);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Chi tiết
              </button>
            ),
          },
        ]}
      />

      <DetailModal
        title="Giao dịch"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailRow && (
          <div className="space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Mã:</span> <CopyableTruncated value={detailRow.id} chars={4} />
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Người thực hiện:</span> <CopyableTruncated value={detailRow.actor_address} />
            </p>
            <p>
              <span className="text-slate-500">Hành động:</span> {detailRow.action_type}
            </p>
            <p>
              <span className="text-slate-500">Số tiền:</span>{' '}
              {detailRow.amount != null ? formatVND(detailRow.amount) : '—'}
            </p>
            <p>
              <span className="text-slate-500">Quỹ:</span> {detailRow.pool_name || '—'}
            </p>
            <p>
              <span className="text-slate-500">Ghi chú:</span> {detailRow.message || '—'}
            </p>
            <p>
              <span className="text-slate-500">Ngày tạo:</span> {formatDate(detailRow.created_at)}
            </p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
