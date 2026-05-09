'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import PayOSPaymentDialog from '@/src/components/ui/PayOSPaymentDialog';
import {
  formatDate,
  formatDateTimeSeconds,
  formatVND,
  getWithdrawProposalUiStatus,
  truncateAddress,
} from '@/src/lib/formatters';
import { withdrawService } from '@/src/services/withdraw.service';
import { pendingWithdrawService } from '@/src/services/pending-withdraw.service';
import { pendingSpecialNeedsService } from '@/src/services/pending-special-needs.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import { useWithdrawProposalConfirm } from '@/src/hooks/useWithdrawProposalConfirm';
import type {
  PendingSpecialNeedProposal,
  PendingWithdrawProposal,
  WithdrawProposal,
} from '@/src/types/api.types';

const PAGE_SIZE = 20;

type TabId = 'proposals' | 'pending' | 'special';

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function TreasuryPageContent() {
  const searchParams = useSearchParams();
  const { execute } = useExecuteTransaction();
  const { busy, payOS, closePayOS, runConfirmWithProof, runMainPoolConfirm } = useWithdrawProposalConfirm();

  const [tab, setTab] = useState<TabId>('proposals');
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

  const [withdrawDetail, setWithdrawDetail] = useState<{
    open: boolean;
    id: string | null;
    row?: WithdrawProposal | null;
  }>({ open: false, id: null });
  const [withdrawDetailLoading, setWithdrawDetailLoading] = useState(false);
  const [withdrawDetailData, setWithdrawDetailData] = useState<WithdrawProposal | null>(null);
  const [withdrawDetailErr, setWithdrawDetailErr] = useState<string | null>(null);
  const [withdrawConfirmModal, setWithdrawConfirmModal] = useState<{ open: boolean; proposalId: string | null }>({
    open: false,
    proposalId: null,
  });
  const [withdrawConfirmProofBlob, setWithdrawConfirmProofBlob] = useState('');
  const [mainPoolBlobId, setMainPoolBlobId] = useState('');

  const [pendingDetail, setPendingDetail] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [pendingDetailLoading, setPendingDetailLoading] = useState(false);
  const [pendingDetailData, setPendingDetailData] = useState<PendingWithdrawProposal | null>(null);
  const [pendingDetailErr, setPendingDetailErr] = useState<string | null>(null);

  const [specialDetail, setSpecialDetail] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [specialDetailLoading, setSpecialDetailLoading] = useState(false);
  const [specialDetailData, setSpecialDetailData] = useState<PendingSpecialNeedProposal | null>(null);
  const [specialDetailErr, setSpecialDetailErr] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'local-withdrawals' || q === 'local' || q === 'proposals' || q === 'withdraw') {
      setTab('proposals');
    } else if (q === 'pending') setTab('pending');
    else if (q === 'special') setTab('special');
  }, [searchParams]);

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

  useEffect(() => {
    if (!withdrawDetail.open || !withdrawDetail.id) {
      setWithdrawDetailData(null);
      setWithdrawDetailErr(null);
      return;
    }
    const id = withdrawDetail.id;
    setWithdrawDetailLoading(true);
    setWithdrawDetailErr(null);
    void withdrawService
      .getById(id)
      .then((res) => {
        setWithdrawDetailData(res.data);
      })
      .catch((e: unknown) => {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : 'Failed to load';
        setWithdrawDetailErr(msg);
        setWithdrawDetailData(withdrawDetail.row ?? null);
      })
      .finally(() => setWithdrawDetailLoading(false));
  }, [withdrawDetail.open, withdrawDetail.id, withdrawDetail.row]);

  useEffect(() => {
    if (!pendingDetail.open || !pendingDetail.id) {
      setPendingDetailData(null);
      setPendingDetailErr(null);
      return;
    }
    const id = pendingDetail.id;
    setPendingDetailLoading(true);
    setPendingDetailErr(null);
    void pendingWithdrawService
      .getById(id)
      .then((res) => setPendingDetailData(res.data))
      .catch((e: unknown) => {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : 'Failed to load';
        setPendingDetailErr(msg);
        setPendingDetailData(null);
      })
      .finally(() => setPendingDetailLoading(false));
  }, [pendingDetail.open, pendingDetail.id]);

  useEffect(() => {
    if (!specialDetail.open || !specialDetail.id) {
      setSpecialDetailData(null);
      setSpecialDetailErr(null);
      return;
    }
    const id = specialDetail.id;
    setSpecialDetailLoading(true);
    setSpecialDetailErr(null);
    void pendingSpecialNeedsService
      .getById(id)
      .then((res) => setSpecialDetailData(res.data))
      .catch((e: unknown) => {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : 'Failed to load';
        setSpecialDetailErr(msg);
        setSpecialDetailData(null);
      })
      .finally(() => setSpecialDetailLoading(false));
  }, [specialDetail.open, specialDetail.id]);

  const openWithdrawConfirmModal = (id: string) => {
    setWithdrawConfirmProofBlob('');
    setWithdrawConfirmModal({ open: true, proposalId: id });
  };

  const closeWithdrawConfirmModal = () => {
    if (busy) return;
    setWithdrawConfirmModal({ open: false, proposalId: null });
    setWithdrawConfirmProofBlob('');
  };

  const handleWithdrawConfirmModalSubmit = async () => {
    const id = withdrawConfirmModal.proposalId;
    if (!id) return;
    const ok = await runConfirmWithProof(id, withdrawConfirmProofBlob.trim(), {
      successMessage: 'Proposal confirmed & executed',
    });
    if (ok) {
      refresh();
      closeWithdrawConfirmModal();
      setWithdrawDetail((d) => (d.id === id ? { ...d, open: false } : d));
    }
  };

  const handleMainPoolSubmit = async () => {
    const id = withdrawDetail.id;
    if (!id || !mainPoolBlobId.trim()) {
      toast.error('Upload proof image (blob ID) for manual transfer confirmation');
      return;
    }
    const ok = await runMainPoolConfirm(id, mainPoolBlobId.trim(), {
      successMessage: 'Main pool transfer recorded',
    });
    if (ok) {
      setMainPoolBlobId('');
      refresh();
      setWithdrawDetail({ open: false, id: null });
    }
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
      onClick={() => setTab(id)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        tab === id ? 'bg-blue-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          : 'border-blue-200 text-blue-900 hover:bg-blue-50';
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
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          placeholder="Any"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Max amount (VND)</label>
        <input
          type="number"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          placeholder="Any"
        />
      </div>
      <button
        type="button"
        onClick={applyAmountFilter}
        className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
      >
        Apply filter
      </button>
    </div>
  );

  const proposalColumns = (showLocalBadge: boolean) =>
    [
      {
        key: 'id',
        label: 'ID',
        render: (r: WithdrawProposal) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span>,
      },
      ...(showLocalBadge
        ? [
            {
              key: 'local',
              label: 'Source',
              render: (r: WithdrawProposal) =>
                r.is_from_local_pool ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Local leader
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                ),
            },
          ]
        : []),
      {
        key: 'creator',
        label: 'Creator',
        render: (r: WithdrawProposal) => truncateAddress(r.creator),
      },
      {
        key: 'description',
        label: 'Description',
        render: (r: WithdrawProposal) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
      },
      { key: 'pool_name', label: 'Pool' },
      {
        key: 'withdraw_amount',
        label: 'Amount',
        render: (r: WithdrawProposal) => formatVND(r.withdraw_amount),
      },
      { key: 'approve_weight', label: 'Approve W.' },
      { key: 'refuse_weight', label: 'Refuse W.' },
      {
        key: 'status_ui',
        label: 'Status',
        render: (r: WithdrawProposal) => (
          <StatusBadge status={getWithdrawProposalUiStatus(r)} />
        ),
      },
      {
        key: 'closed_at',
        label: 'Vote closes',
        render: (r: WithdrawProposal) => (
          <span className="whitespace-nowrap text-xs">{formatDateTimeSeconds(r.closed_at)}</span>
        ),
      },
      { key: 'created_at', label: 'Created', render: (r: WithdrawProposal) => formatDate(r.created_at) },
      {
        key: 'actions',
        label: 'Actions',
        className: 'whitespace-nowrap',
        render: (r: WithdrawProposal) => (
          <div className="flex flex-wrap gap-1">
            {actionBtn('Details', () =>
              setWithdrawDetail({ open: true, id: r.id, row: r }),
            )}
            {!r.is_executed && actionBtn('Confirm', () => openWithdrawConfirmModal(r.id), 'muted')}
          </div>
        ),
      },
    ] as const;

  const wd = withdrawDetailData || withdrawDetail.row;

  return (
    <div>
      <PageHeader
        title="Treasury"
        description="Withdraw proposals (all sources), pending withdrawals, and pending special needs"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabBtn('proposals', 'Withdraw Proposal')}
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
            columns={proposalColumns(true) as any}
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
              {
                key: 'id',
                label: 'ID',
                render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span>,
              },
              { key: 'poolName', label: 'Pool' },
              { key: 'creator', label: 'Creator', render: (r) => truncateAddress(r.creator) },
              {
                key: 'description',
                label: 'Description',
                render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
              },
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
                    {actionBtn('Details', () => setPendingDetail({ open: true, id: r.id }))}
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
              {
                key: 'id',
                label: 'ID',
                render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span>,
              },
              { key: 'child_id', label: 'Child', render: (r) => truncateAddress(r.child_id, 4) },
              {
                key: 'description',
                label: 'Description',
                render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
              },
              { key: 'target', label: 'Target', render: (r) => formatVND(r.target) },
              { key: 'region', label: 'Region' },
              {
                key: 'ai_evaluation',
                label: 'AI eval.',
                render: (r) => <span className="max-w-[200px] truncate text-xs">{r.ai_evaluation || '-'}</span>,
              },
              {
                key: 'review_status',
                label: 'Review',
                render: (r) => <StatusBadge status={r.review_status} />,
              },
              { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
              {
                key: 'actions',
                label: 'Actions',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {actionBtn('Details', () => setSpecialDetail({ open: true, id: r.id }))}
                    {actionBtn('Approve', () => void handleSpecialApprove(r.id))}
                    {actionBtn('Refuse', () => void handleSpecialRefuse(r.id), 'danger')}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <DetailModal
        title="Withdrawal proposal"
        open={withdrawDetail.open}
        onClose={() => {
          setWithdrawDetail({ open: false, id: null });
          setMainPoolBlobId('');
          setWithdrawConfirmModal({ open: false, proposalId: null });
          setWithdrawConfirmProofBlob('');
        }}
        loading={withdrawDetailLoading}
        error={withdrawDetailErr}
        wide
      >
        {wd && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{wd.id}</span>)}
            {detailField('Creator', truncateAddress(wd.creator))}
            {detailField('Pool', wd.pool_name)}
            {detailField('Amount', formatVND(wd.withdraw_amount))}
            {detailField('Description', wd.description || '—')}
            {detailField(
              'Local leader pool',
              wd.is_from_local_pool ? (
                <span className="text-amber-700">Yes</span>
              ) : (
                <span className="text-slate-600">No</span>
              ),
            )}
            {detailField('Status', <StatusBadge status={getWithdrawProposalUiStatus(wd)} />)}
            {detailField('Vote closes', formatDateTimeSeconds(wd.closed_at))}
            {detailField('Created', formatDate(wd.created_at))}
            {wd.proof_blob_id &&
              detailField(
                'Proof',
                <div className="mt-1">
                  <BlobImage blobId={wd.proof_blob_id} className="max-h-64 rounded-lg border border-slate-200 object-contain" />
                </div>,
              )}
            {!wd.is_executed && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-600">Confirm transfer</p>
                <p className="text-xs text-slate-500">
                  PayOS / on-chain: opens payment or executes tx. Manual (non-PayOS) bank: after confirm, your proof
                  image is sent to the server <code className="rounded bg-slate-100 px-0.5 text-[10px]">payment_callback</code>.
                  Main pool manual path below uses a separate API.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => wd.id && openWithdrawConfirmModal(wd.id)}
                    className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    {busy ? 'Working…' : 'Confirm transfer…'}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-700">Manual transfer (main pool)</p>
                  <FileUploadInput
                    label="Proof image (Walrus blob)"
                    value={mainPoolBlobId}
                    onChange={setMainPoolBlobId}
                  />
                  <button
                    type="button"
                    disabled={busy || !mainPoolBlobId.trim()}
                    onClick={() => void handleMainPoolSubmit()}
                    className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white disabled:opacity-50"
                  >
                    Submit proof & confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal
        title="Pending withdrawal"
        open={pendingDetail.open}
        onClose={() => setPendingDetail({ open: false, id: null })}
        loading={pendingDetailLoading}
        error={pendingDetailErr}
        wide
      >
        {pendingDetailData && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{pendingDetailData.id}</span>)}
            {detailField('Pool', pendingDetailData.poolName)}
            {detailField('Creator', truncateAddress(pendingDetailData.creator))}
            {detailField('Description', pendingDetailData.description || '—')}
            {detailField('Amount', formatVND(pendingDetailData.withdrawAmount))}
            {detailField('Status', pendingDetailData.status)}
            {pendingDetailData.proofBlobID &&
              detailField(
                'Proof',
                <BlobImage
                  blobId={pendingDetailData.proofBlobID}
                  className="max-h-64 rounded-lg border border-slate-200 object-contain"
                />,
              )}
            {detailField('Created', formatDate(pendingDetailData.createdAt))}
          </div>
        )}
      </DetailModal>

      <DetailModal
        title="Pending special need"
        open={specialDetail.open}
        onClose={() => setSpecialDetail({ open: false, id: null })}
        loading={specialDetailLoading}
        error={specialDetailErr}
        wide
      >
        {specialDetailData && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{specialDetailData.id}</span>)}
            {detailField('Child', truncateAddress(specialDetailData.child_id))}
            {detailField('Region', specialDetailData.region)}
            {detailField('Description', specialDetailData.description || '—')}
            {detailField('Target', formatVND(specialDetailData.target))}
            {detailField('AI evaluation', specialDetailData.ai_evaluation || '—')}
            {detailField('Review', specialDetailData.review_status)}
            {specialDetailData.proof_blob_id &&
              detailField(
                'Proof',
                <BlobImage
                  blobId={specialDetailData.proof_blob_id}
                  className="max-h-64 rounded-lg border border-slate-200 object-contain"
                />,
              )}
            {detailField('Created', formatDate(specialDetailData.created_at))}
          </div>
        )}
      </DetailModal>

      {withdrawConfirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm withdrawal</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Bước 1: <code className="rounded bg-slate-100 px-1 text-[11px]">POST /withdraw-proposals/{'{id}'}/confirm</code>.
              Bước 2 (ngân hàng không PayOS): server trả <code className="rounded bg-slate-100 px-1 text-[11px]">payment_callback</code>{' '}
              — ảnh chứng từ sẽ được gửi kèm <code className="rounded bg-slate-100 px-1 text-[11px]">blob_id</code> tới URL đó.
              Luồng PayOS / on-chain không bắt buộc ảnh; có thể để trống nếu bạn chắc chắn.
            </p>
            <div className="mt-4">
              <FileUploadInput
                label="Proof image (Walrus blob)"
                value={withdrawConfirmProofBlob}
                onChange={setWithdrawConfirmProofBlob}
                accept="image/*"
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={closeWithdrawConfirmModal}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleWithdrawConfirmModalSubmit()}
                className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {busy ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PayOSPaymentDialog
        state={payOS}
        onClose={closePayOS}
        onPaymentSuccess={() => refresh()}
      />
    </div>
  );
}

export default function AdminTreasuryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading…</div>
      }
    >
      <TreasuryPageContent />
    </Suspense>
  );
}
