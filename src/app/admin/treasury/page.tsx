'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { withdrawService } from '@/src/services/withdraw.service';
import { pendingWithdrawService } from '@/src/services/pending-withdraw.service';
import { pendingSpecialNeedsService } from '@/src/services/pending-special-needs.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type {
  PendingSpecialNeedProposal,
  PendingWithdrawProposal,
  WithdrawProposal,
} from '@/src/types/api.types';

const PAGE_SIZE = 10;

type TabId = 'proposals' | 'pending' | 'special';

export default function AdminTreasuryPage() {
  const { execute } = useExecuteTransaction();
  const [tab, setTab] = useState<TabId>('proposals');
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [minAmount, setMinAmount] = useState<number | undefined>();
  const [maxAmount, setMaxAmount] = useState<number | undefined>();

  const [pageProposals, setPageProposals] = useState(0);
  const [pagePending, setPagePending] = useState(0);
  const [pageSpecial, setPageSpecial] = useState(0);

  const [proposals, setProposals] = useState<WithdrawProposal[]>([]);
  const [pendingList, setPendingList] = useState<PendingWithdrawProposal[]>([]);
  const [specialList, setSpecialList] = useState<PendingSpecialNeedProposal[]>([]);

  const [totalPagesProposals, setTotalPagesProposals] = useState(1);
  const [totalPagesPending, setTotalPagesPending] = useState(1);
  const [totalPagesSpecial, setTotalPagesSpecial] = useState(1);

  const [loading, setLoading] = useState(true);

  const applyAmountFilter = () => {
    const min = minInput.trim() === '' ? undefined : Number(minInput);
    const max = maxInput.trim() === '' ? undefined : Number(maxInput);
    if (minInput.trim() !== '' && Number.isNaN(min!)) {
      toast.error('Minimum amount must be a number');
      return;
    }
    if (maxInput.trim() !== '' && Number.isNaN(max!)) {
      toast.error('Maximum amount must be a number');
      return;
    }
    setMinAmount(min);
    setMaxAmount(max);
    setPageProposals(0);
    setPagePending(0);
    setPageSpecial(0);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'proposals') {
        const res = await withdrawService.list({
          page: pageProposals,
          page_size: PAGE_SIZE,
          min_amount: minAmount,
          max_amount: maxAmount,
        });
        setProposals(res.data.data ?? []);
        setTotalPagesProposals(Math.max(1, res.data.total_pages ?? 1));
      } else if (tab === 'pending') {
        const res = await pendingWithdrawService.list({
          page: pagePending,
          page_size: PAGE_SIZE,
          min_amount: minAmount,
          max_amount: maxAmount,
        });
        setPendingList(res.data.data ?? []);
        setTotalPagesPending(Math.max(1, res.data.total_pages ?? 1));
      } else {
        const res = await pendingSpecialNeedsService.list({
          page: pageSpecial,
          page_size: PAGE_SIZE,
          min_amount: minAmount,
          max_amount: maxAmount,
        });
        setSpecialList(res.data.data ?? []);
        setTotalPagesSpecial(Math.max(1, res.data.total_pages ?? 1));
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load treasury data');
      if (tab === 'proposals') setProposals([]);
      if (tab === 'pending') setPendingList([]);
      if (tab === 'special') setSpecialList([]);
    } finally {
      setLoading(false);
    }
  }, [tab, pageProposals, pagePending, pageSpecial, minAmount, maxAmount]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => void load();

  const handleVote = async (id: string, isVoteYes: boolean) => {
    if (!isVoteYes) {
      setRefuseModal({ id });
      setRefuseReason('');
      return;
    }
    const ok = await execute(
      () => withdrawService.vote(id, true),
      { successMessage: 'Vote recorded & executed' },
    );
    if (ok) refresh();
  };

  const submitRefuseVote = async () => {
    if (!refuseModal) return;
    if (!refuseReason.trim()) {
      toast.error('Refuse reason is required');
      return;
    }
    const ok = await execute(
      () => withdrawService.vote(refuseModal.id, false, refuseReason.trim()),
      { successMessage: 'Vote recorded (refuse) & executed' },
    );
    if (ok) {
      setRefuseModal(null);
      refresh();
    }
  };

  const handleConfirm = async (id: string) => {
    const ok = await execute(
      () => withdrawService.confirm(id) as Promise<any>,
      { successMessage: 'Proposal confirmed & executed' },
    );
    if (ok) refresh();
  };

  const handlePendingApprove = async (id: string) => {
    const ok = await execute(
      () => pendingWithdrawService.approve(id),
      { successMessage: 'Pending withdrawal approved & executed' },
    );
    if (ok) refresh();
  };

  const handlePendingRefuse = async (id: string) => {
    const ok = await execute(
      () => pendingWithdrawService.refuse(id),
      { successMessage: 'Pending withdrawal refused' },
    );
    if (ok) refresh();
  };

  const handleSpecialApprove = async (id: string) => {
    const ok = await execute(
      () => pendingSpecialNeedsService.approve(id),
      { successMessage: 'Special need proposal approved & executed' },
    );
    if (ok) refresh();
  };

  const handleSpecialRefuse = async (id: string) => {
    const ok = await execute(
      () => pendingSpecialNeedsService.refuse(id),
      { successMessage: 'Special need proposal refused' },
    );
    if (ok) refresh();
  };

  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(id);
      }}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        tab === id
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  const actionBtn = (label: string, onClick: () => void, variant: 'primary' | 'danger' | 'muted' = 'primary') => {
    const styles =
      variant === 'danger'
        ? 'border-red-200 text-red-700 hover:bg-red-50'
        : variant === 'muted'
          ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50';
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`rounded-lg border px-2 py-1 text-xs font-medium ${styles}`}
      >
        {label}
      </button>
    );
  };

  const filterBar: ReactNode = (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Min amount (VND)</label>
        <input
          type="number"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Any"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Max amount (VND)</label>
        <input
          type="number"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Any"
        />
      </div>
      <button
        type="button"
        onClick={applyAmountFilter}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Apply filter
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Treasury"
        description="Withdrawal proposals, pending withdrawals, and pending special needs"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabBtn('proposals', 'Withdrawal Proposals')}
        {tabBtn('pending', 'Pending Withdrawals')}
        {tabBtn('special', 'Pending Special Needs')}
      </div>

      {filterBar}

      <div className="mt-4">
        {tab === 'proposals' && (
          <DataTable<WithdrawProposal>
            loading={loading}
            data={proposals}
            page={pageProposals}
            totalPages={totalPagesProposals}
            onPageChange={setPageProposals}
            emptyMessage="No withdrawal proposals match your filters"
            columns={[
              { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
              { key: 'creator', label: 'Creator', render: (r) => truncateAddress(r.creator) },
              { key: 'description', label: 'Description', render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span> },
              { key: 'pool_name', label: 'Pool' },
              {
                key: 'withdraw_amount',
                label: 'Amount',
                render: (r) => formatVND(r.withdraw_amount),
              },
              { key: 'approve_weight', label: 'Approve W.' },
              { key: 'refuse_weight', label: 'Refuse W.' },
              {
                key: 'is_executed',
                label: 'Executed',
                render: (r) => <StatusBadge status={r.is_executed ? 'executed' : 'pending'} />,
              },
              { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
              {
                key: 'actions',
                label: 'Actions',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {actionBtn('Vote yes', () => void handleVote(r.id, true))}
                    {actionBtn('Vote no', () => void handleVote(r.id, false), 'danger')}
                    {!r.is_executed && actionBtn('Confirm', () => void handleConfirm(r.id), 'muted')}
                  </div>
                ),
              },
            ]}
          />
        )}

        {tab === 'pending' && (
          <DataTable<PendingWithdrawProposal>
            loading={loading}
            data={pendingList}
            page={pagePending}
            totalPages={totalPagesPending}
            onPageChange={setPagePending}
            emptyMessage="No pending withdrawals match your filters"
            columns={[
              { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
              { key: 'poolName', label: 'Pool' },
              { key: 'creator', label: 'Creator', render: (r) => truncateAddress(r.creator) },
              { key: 'description', label: 'Description', render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span> },
              {
                key: 'withdrawAmount',
                label: 'Amount',
                render: (r) => formatVND(r.withdrawAmount),
              },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'createdAt', label: 'Created', render: (r) => formatDate(r.createdAt) },
              {
                key: 'actions',
                label: 'Actions',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {actionBtn('Approve', () => void handlePendingApprove(r.id))}
                    {actionBtn('Refuse', () => void handlePendingRefuse(r.id), 'danger')}
                  </div>
                ),
              },
            ]}
          />
        )}

        {tab === 'special' && (
          <DataTable<PendingSpecialNeedProposal>
            loading={loading}
            data={specialList}
            page={pageSpecial}
            totalPages={totalPagesSpecial}
            onPageChange={setPageSpecial}
            emptyMessage="No pending special needs match your filters"
            columns={[
              { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
              { key: 'child_id', label: 'Child', render: (r) => truncateAddress(r.child_id, 4) },
              { key: 'description', label: 'Description', render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span> },
              { key: 'target', label: 'Target', render: (r) => formatVND(r.target) },
              { key: 'region', label: 'Region' },
              { key: 'ai_evaluation', label: 'AI eval.', render: (r) => <span className="max-w-[200px] truncate text-xs">{r.ai_evaluation || '-'}</span> },
              { key: 'review_status', label: 'Review', render: (r) => <StatusBadge status={r.review_status} /> },
              { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
              {
                key: 'actions',
                label: 'Actions',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {actionBtn('Approve', () => void handleSpecialApprove(r.id))}
                    {actionBtn('Refuse', () => void handleSpecialRefuse(r.id), 'danger')}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Refuse reason modal */}
      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse vote</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Please provide a reason for refusing this proposal.</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
              placeholder="Reason for refusal…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRefuseVote()}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Submit refusal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
