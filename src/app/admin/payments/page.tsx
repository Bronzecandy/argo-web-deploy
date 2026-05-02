'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, CreditCard, X } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDateTime, formatVND, truncateAddress } from '@/src/lib/formatters';
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
      toast.error(getErrorMessage(e, 'Failed to load payments'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => void load();

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const ok = await execute(
      () => paymentService.approve(id),
      { successMessage: 'Payment approved & executed on-chain' },
    );
    if (ok) refresh();
    setBusyId(null);
  };

  const handleRefuse = async (id: string) => {
    setBusyId(id);
    const ok = await execute(
      () => paymentService.refuse(id),
      { successMessage: 'Payment refused' },
    );
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
        description="Review payment records; approve builds an on-chain transaction (POST /payments/{id}/approve), refuse completes without tx (POST /payments/{id}/refuse)."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
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
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
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
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setKeyword(keywordDraft);
            setPage(0);
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          Search
        </button>
      </div>

      <DataTable<Payment>
        columns={[
          { key: 'id', label: 'ID', render: (p) => <span className="font-mono text-xs">{truncateAddress(p.id, 8)}</span> },
          { key: 'actor', label: 'Actor', render: (p) => truncateAddress(p.actor || '—') },
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
          { key: 'created_at', label: 'Created', render: (p) => formatDateTime(p.created_at || '') },
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
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
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

      {refuseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Refuse payment?</h3>
            <p className="mb-4 text-sm text-slate-600">
              Calls <code className="rounded bg-slate-100 px-1 text-xs">POST /payments/{'{id}'}/refuse</code>. Amount:{' '}
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
