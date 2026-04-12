'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { transactionService } from '@/src/services/transaction.service';
import { formatVND, formatDateTime } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import type { TransactionRecord } from '@/src/types/api.types';
import { History, Download } from 'lucide-react';

const ACTION_TYPES = ['', 'donate', 'withdraw', 'support_meal', 'support_books', 'support_health', 'gift'];

export default function DonorTransactionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionType, setActionType] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const loadTransactions = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const res = await transactionService.list({
        page,
        page_size: 15,
        actor: user.address,
        action_type: actionType || undefined,
        sort_order: sortOrder,
      });
      setTransactions(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.address, page, actionType, sortOrder]);

  useEffect(() => {
    setPage(0);
  }, [actionType, sortOrder]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const columns = [
    {
      key: 'action_type',
      label: 'Type',
      render: (item: TransactionRecord) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
          {item.action_type?.replace(/_/g, ' ') || '-'}
        </span>
      ),
    },
    {
      key: 'pool_name',
      label: 'Pool',
      render: (item: TransactionRecord) => <span className="font-medium">{item.pool_name || '-'}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (item: TransactionRecord) => (
        <span className="font-semibold text-emerald-700">{formatVND(item.amount)}</span>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (item: TransactionRecord) => (
        <span className="max-w-[180px] truncate block text-slate-500 text-xs">{item.message || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (item: TransactionRecord) => (
        <span className="text-slate-500">{formatDateTime(item.created_at)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transaction History"
        description="View all your donation and support transactions"
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <History className="h-4 w-4" />
            {transactions.length > 0 && `${transactions.length} records`}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All types</option>
          {ACTION_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No transactions found"
      />
    </div>
  );
}
