'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, CreditCard, X } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import BlobImage from '@/src/components/ui/BlobImage';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { btnPrimary, btnTablePrimary, inputClass, selectClass } from '@/src/lib/uiClasses';
import { formatDateTime, formatVND } from '@/src/lib/formatters';
import { paymentService } from '@/src/services/payment.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { Payment } from '@/src/types/api.types';

const PAGE_SIZE = 20;

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

function isPaymentFinalized(p: Payment) {
  const s = (p.status || '').toLowerCase();
  const r = (p.review_status || '').toLowerCase().replace(/\s+/g, '_');
  if (['success', 'cancel', 'cancelled'].includes(s)) return true;
  if (['approved', 'refused', 'rejected'].includes(r)) return true;
  return false;
}

export default function AdminPaymentsPage() {
  const { execute } = useExecuteTransaction();
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refuseConfirm, setRefuseConfirm] = useState<Payment | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentService.list({
        page,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
        status: statusFilter || undefined,
        keyword: keyword.trim() || undefined,
      });
      const raw = res.data.data;
      setRows(Array.isArray(raw) ? raw : []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Không tải được danh sách thanh toán'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailId) {
      setDetailPayment(null);
      return;
    }
    setDetailLoading(true);
    void paymentService
      .getById(detailId)
      .then((res) => setDetailPayment(res.data))
      .catch(() => setDetailPayment(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  const refresh = () => void load();

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const ok = await execute(() => paymentService.approve(id), { successMessage: 'Đã duyệt thanh toán và thực thi on-chain' });
    if (ok) refresh();
    setBusyId(null);
  };

  const handleRefuse = async (id: string) => {
    setBusyId(id);
    const ok = await execute(() => paymentService.refuse(id), { successMessage: 'Đã từ chối thanh toán' });
    if (ok) {
      setRefuseConfirm(null);
      refresh();
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thanh toán"
        description="Duyệt bản ghi thanh toán. Duyệt có thể thực thi giao dịch on-chain; từ chối sẽ đóng thanh toán mà không thực hiện giao dịch."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
            <CreditCard className="h-3.5 w-3.5" />
            Quản trị
          </span>
        }
      />

      <FilterToolbar>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">Tất cả</option>
            <option value="Pending">Chờ xử lý</option>
            <option value="Success">Thành công</option>
            <option value="Cancel">Hủy</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1 sm:max-w-md">
          <label className="mb-1 block text-xs font-medium text-slate-500">Từ khóa</label>
          <input
            type="search"
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setKeyword(keywordDraft), setPage(0))}
            placeholder="Tìm kiếm…"
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setKeyword(keywordDraft);
            setPage(0);
          }}
          className={btnPrimary}
        >
          Tìm
        </button>
      </FilterToolbar>

      <PageSection title="Danh sách thanh toán" noPadding>
        <DataTable<Payment>
          columns={[
            { key: 'actor', label: 'Người thực hiện', render: (p) => <CopyableTruncated value={p.actor} chars={6} /> },
            {
              key: 'amount',
              label: 'Số tiền',
              render: (p) => (
                <span className="font-semibold text-slate-900">
                  {typeof p.amount === 'number' ? formatVND(p.amount) : '—'}
                </span>
              ),
            },
            { key: 'currency', label: 'Tiền tệ', render: (p) => p.currency || '—' },
            { key: 'method', label: 'Phương thức', render: (p) => p.method || '—' },
            { key: 'status', label: 'Trạng thái', render: (p) => <StatusBadge status={p.status || '—'} /> },
            {
              key: 'review_status',
              label: 'Duyệt',
              render: (p) =>
                p.review_status ? <StatusBadge status={p.review_status} /> : <span className="text-slate-400">—</span>,
            },
            { key: 'created_at', label: 'Ngày tạo', render: (p) => formatDateTime(p.created_at || '') },
            {
              key: 'detail_btn',
              label: 'Chi tiết',
              className: 'whitespace-nowrap',
              render: (p) => (
                <TableIconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailId(p.id);
                  }}
                >
                  Chi tiết
                </TableIconButton>
              ),
            },
            {
              key: 'actions',
              label: 'Thao tác',
              className: 'whitespace-nowrap',
              render: (p) => {
                const done = isPaymentFinalized(p);
                return (
                  <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                    <TableIconButton
                      variant="primary"
                      disabled={done || busyId === p.id}
                      onClick={() => void handleApprove(p.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Duyệt
                    </TableIconButton>
                    <TableIconButton
                      variant="danger"
                      disabled={done || busyId === p.id}
                      onClick={() => setRefuseConfirm(p)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Từ chối
                    </TableIconButton>
                  </div>
                );
              },
            },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Không có thanh toán nào khớp bộ lọc."
        />
      </PageSection>

      <DetailModal
        title="Chi tiết thanh toán"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailPayment && (
          <div>
            <DetailField label="Mã" value={<span className="font-mono text-xs break-all">{detailPayment.id}</span>} />
            <DetailField
              label="Người thực hiện"
              value={<CopyableTruncated value={detailPayment.actor} chars={6} />}
            />
            <DetailField
              label="Số tiền"
              value={typeof detailPayment.amount === 'number' ? formatVND(detailPayment.amount) : '—'}
            />
            <DetailField label="Trạng thái" value={<StatusBadge status={detailPayment.status || '—'} />} />
            <DetailField label="Phương thức" value={detailPayment.method || '—'} />
            {detailPayment.proof_blob_id && (
              <div className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="text-xs font-medium text-slate-500">Chứng từ</div>
                <div className="mt-1">
                  <BlobImage blobId={detailPayment.proof_blob_id} source="api" className="max-h-48 rounded-lg border" />
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <FormModal
        open={refuseConfirm !== null}
        onClose={() => setRefuseConfirm(null)}
        title="Từ chối thanh toán?"
        submitLabel="Xác nhận từ chối"
        submitVariant="danger"
        submitDisabled={refuseConfirm != null && busyId === refuseConfirm.id}
        onSubmit={() => refuseConfirm && void handleRefuse(refuseConfirm.id)}
      >
        <p className="text-sm text-slate-600">
          Thao tác này sẽ từ chối bản ghi thanh toán. Số tiền:{' '}
          {refuseConfirm && typeof refuseConfirm.amount === 'number'
            ? formatVND(refuseConfirm.amount)
            : '—'}
          .
        </p>
      </FormModal>
    </div>
  );
}
