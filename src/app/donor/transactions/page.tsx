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
        page_size: 20,
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
      label: 'Loại',
      render: (item: TransactionRecord) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
          {item.action_type?.replace(/_/g, ' ') || '-'}
        </span>
      ),
    },
    {
      key: 'pool_name',
      label: 'Quỹ',
      render: (item: TransactionRecord) => <span className="font-medium">{item.pool_name || '-'}</span>,
    },
    {
      key: 'amount',
      label: 'Số tiền',
      render: (item: TransactionRecord) => (
        <span className="font-semibold text-blue-900">{formatVND(item.amount)}</span>
      ),
    },
    {
      key: 'message',
      label: 'Ghi chú',
      render: (item: TransactionRecord) => (
        <span className="max-w-[180px] truncate block text-slate-500 text-xs">{item.message || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Thời gian',
      render: (item: TransactionRecord) => (
        <span className="text-slate-500">{formatDateTime(item.created_at)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lịch sử giao dịch"
        description="Xem mọi giao dịch quyên góp và hỗ trợ của bạn"
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <History className="h-4 w-4" />
            {transactions.length > 0 && `${transactions.length} bản ghi`}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="">Tất cả loại</option>
          {ACTION_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
        >
          <option value="desc">Mới nhất trước</option>
          <option value="asc">Cũ nhất trước</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Không tìm thấy giao dịch"
      />
    </div>
  );
}
