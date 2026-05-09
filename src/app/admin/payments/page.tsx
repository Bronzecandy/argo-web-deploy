'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, CreditCard, X } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
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
        title="Payments"
        description="Review payment records. Approving may execute an on-chain transaction; refusing closes the payment without one."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
            <CreditCard className="h-3.5 w-3.5" />
            Admin
          </span>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Success">Success</option>
            <option value="Cancel">Cancel</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1 sm:max-w-md">
          <label className="mb-1 block text-xs font-medium text-slate-500">Keyword</label>
          <input
            type="search"
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setKeyword(keywordDraft), setPage(0))}
            placeholder="Search…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setKeyword(keywordDraft);
            setPage(0);
          }}
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
        >
          Search
        </button>
      </div>

      <DataTable<Payment>
        columns={[
          { key: 'actor', label: 'Actor', render: (p) => <CopyableTruncated value={p.actor} chars={6} /> },
          {
            key: 'amount',
            label: 'Amount',
            render: (p) => (
              <span className="font-semibold text-slate-900">
                {typeof p.amount === 'number' ? formatVND(p.amount) : '—'}
              </span>
            ),
          },
          { key: 'currency', label: 'Currency', render: (p) => p.currency || '—' },
          { key: 'method', label: 'Method', render: (p) => p.method || '—' },
          { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status || '—'} /> },
          {
            key: 'review_status',
            label: 'Review',
            render: (p) =>
              p.review_status ? <StatusBadge status={p.review_status} /> : <span className="text-slate-400">—</span>,
          },
          { key: 'created_at', label: 'Ngày tạo', render: (p) => formatDateTime(p.created_at || '') },
          {
            key: 'detail_btn',
            label: 'Chi tiết',
            className: 'whitespace-nowrap',
            render: (p) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailId(p.id);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Details
              </button>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            className: 'whitespace-nowrap',
            render: (p) => {
              const done = isPaymentFinalized(p);
              return (
                <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={done || busyId === p.id}
                    onClick={() => void handleApprove(p.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={done || busyId === p.id}
                    onClick={() => setRefuseConfirm(p)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                    Refuse
                  </button>
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
        emptyMessage="No payments match your filters."
      />

      <DetailModal
        title="Payment detail"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailPayment && (
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs break-all">{detailPayment.id}</p>
            <p>
              <span className="text-slate-500">Actor:</span> <CopyableTruncated value={detailPayment.actor} chars={6} />
            </p>
            <p>
              <span className="text-slate-500">Amount:</span>{' '}
              {typeof detailPayment.amount === 'number' ? formatVND(detailPayment.amount) : '—'}
            </p>
            <p>
              <span className="text-slate-500">Status:</span> <StatusBadge status={detailPayment.status || '—'} />
            </p>
            <p>
              <span className="text-slate-500">Method:</span> {detailPayment.method || '—'}
            </p>
            {detailPayment.proof_blob_id && (
              <div>
                <p className="mb-1 text-xs text-slate-500">Proof</p>
                <BlobImage blobId={detailPayment.proof_blob_id} source="api" className="max-h-48 rounded-lg border" />
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {refuseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Refuse payment?</h3>
            <p className="mb-4 text-sm text-slate-600">
              This will refuse the payment record. Amount:{' '}
              {typeof refuseConfirm.amount === 'number' ? formatVND(refuseConfirm.amount) : '—'}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseConfirm(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === refuseConfirm.id}
                onClick={() => void handleRefuse(refuseConfirm.id)}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm refuse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
