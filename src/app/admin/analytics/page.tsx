'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { transactionService } from '@/src/services/transaction.service';
import type { TransactionRecord } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'donate', label: 'Donate' },
  { value: 'withdraw', label: 'Withdraw' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'vote', label: 'Vote' },
  { value: 'approve', label: 'Approve' },
  { value: 'refuse', label: 'Refuse' },
  { value: 'create', label: 'Create' },
  { value: 'execute', label: 'Execute' },
  { value: 'confirm', label: 'Confirm' },
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
      toast.error('Failed to load transactions');
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
      <PageHeader title="Transaction records" description="On-chain and platform transaction history" />

      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Action type</label>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(0);
            }}
            className="min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Actor address</label>
          <input
            type="text"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyActorFilter()}
            placeholder="Search by wallet / actor"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={applyActorFilter}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Search actor
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-600">
        Total matching records: <span className="font-semibold text-emerald-700">{totalCount}</span>
      </p>

      <DataTable<TransactionRecord>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No transactions match your filters"
        columns={[
          { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
          {
            key: 'actor_address',
            label: 'Actor',
            render: (r) => <span title={r.actor_address}>{truncateAddress(r.actor_address)}</span>,
          },
          { key: 'action_type', label: 'Action' },
          {
            key: 'amount',
            label: 'Amount',
            render: (r) => (r.amount != null ? formatVND(r.amount) : '-'),
          },
          { key: 'coin_type', label: 'Coin' },
          { key: 'pool_name', label: 'Pool', render: (r) => r.pool_name || '-' },
          { key: 'message', label: 'Message', render: (r) => <span className="max-w-xs truncate">{r.message || '-'}</span> },
          { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          {
            key: 'details',
            label: 'Details',
            render: (r) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailId(r.id);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Details
              </button>
            ),
          },
        ]}
      />

      <DetailModal
        title="Transaction"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailRow && (
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs break-all">{detailRow.id}</p>
            <p>
              <span className="text-slate-500">Actor:</span> {truncateAddress(detailRow.actor_address)}
            </p>
            <p>
              <span className="text-slate-500">Action:</span> {detailRow.action_type}
            </p>
            <p>
              <span className="text-slate-500">Amount:</span>{' '}
              {detailRow.amount != null ? formatVND(detailRow.amount) : '—'}
            </p>
            <p>
              <span className="text-slate-500">Pool:</span> {detailRow.pool_name || '—'}
            </p>
            <p>
              <span className="text-slate-500">Message:</span> {detailRow.message || '—'}
            </p>
            <p>
              <span className="text-slate-500">Created:</span> {formatDate(detailRow.created_at)}
            </p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
