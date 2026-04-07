'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, formatVND } from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { withdrawService } from '@/src/services/withdraw.service';
import { pendingWithdrawService } from '@/src/services/pending-withdraw.service';
import type { CreatePendingWithdrawProposalRequest, WithdrawProposal } from '@/src/types/api.types';

type Tab = 'mine' | 'create';

const PAGE_SIZE = 10;

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export default function LeaderWithdrawalsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [tab, setTab] = useState<Tab>('mine');

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState<WithdrawProposal[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    pool_id: '',
    description: '',
    withdraw_amount: '',
    proof_blob_id: '',
  });

  const loadProposals = useCallback(async () => {
    const addr = user?.address;
    if (!addr) {
      setRows([]);
      setTotalPages(1);
      return;
    }
    setListLoading(true);
    try {
      const res = await withdrawService.list({
        creator: addr,
        page,
        page_size: PAGE_SIZE,
      });
      const body = res.data;
      setRows(Array.isArray(body.data) ? body.data : []);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load proposals'));
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    if (tab !== 'mine') return;
    void loadProposals();
  }, [tab, loadProposals]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(createForm.withdraw_amount);
    if (!createForm.pool_id.trim() || !createForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Pool ID, description, and a valid withdraw amount are required');
      return;
    }
    const data: CreatePendingWithdrawProposalRequest = {
      pool_id: createForm.pool_id.trim(),
      description: createForm.description.trim(),
      withdraw_amount: amount,
      proof_blob_id: createForm.proof_blob_id.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await pendingWithdrawService.create(data);
      toast.success('Pending withdrawal proposal created');
      setCreateForm({ pool_id: '', description: '', withdraw_amount: '', proof_blob_id: '' });
      setTab('mine');
      setPage(0);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Create failed'));
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'description', label: 'Description' },
    { key: 'pool_name', label: 'Pool' },
    {
      key: 'withdraw_amount',
      label: 'Amount',
      render: (row: WithdrawProposal) => formatVND(row.withdraw_amount),
    },
    { key: 'approve_weight', label: 'Approve weight' },
    { key: 'refuse_weight', label: 'Refuse weight' },
    {
      key: 'is_executed',
      label: 'Executed',
      render: (row: WithdrawProposal) => (
        <StatusBadge status={row.is_executed ? 'executed' : 'pending'} />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: WithdrawProposal) => formatDate(row.created_at),
    },
  ];

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 transition focus:border-emerald-600 focus:ring-2';

  return (
    <div>
      <PageHeader title="Withdrawals" description="Review your proposals and create new pending withdrawals" />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'mine'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My proposals
        </button>
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'create'
              ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Create new
        </button>
      </div>

      {tab === 'mine' ? (
        !user?.address ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Connect your wallet to see your withdrawal proposals.
          </div>
        ) : (
          <DataTable<WithdrawProposal>
            columns={columns}
            data={rows}
            loading={listLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No proposals yet"
          />
        )
      ) : (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Pool ID</label>
            <input
              className={inputClass}
              value={createForm.pool_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, pool_id: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className={`${inputClass} min-h-[100px] resize-y`}
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Withdraw amount (VND)</label>
            <input
              type="number"
              min={1}
              step={1}
              className={inputClass}
              value={createForm.withdraw_amount}
              onChange={(e) => setCreateForm((f) => ({ ...f, withdraw_amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Proof blob ID (optional)</label>
            <input
              className={inputClass}
              value={createForm.proof_blob_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, proof_blob_id: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit proposal'}
          </button>
        </form>
      )}
    </div>
  );
}
