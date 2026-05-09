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
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import PayOSPaymentDialog from '@/src/components/ui/PayOSPaymentDialog';
import {
  formatDate,
  formatDateTimeSeconds,
  formatVND,
  getWithdrawProposalUiStatus,
  parseDigitsToNumber,
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
  ManualBankTransferConfirmResponse,
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
  const {
    busy,
    payOS,
    closePayOS,
    runConfirmFirstStep,
    applyPayOSFromResult,
    runMainPoolConfirm,
    submitManualBankTransferProof,
  } = useWithdrawProposalConfirm();

  const [manualBankInfo, setManualBankInfo] = useState<ManualBankTransferConfirmResponse | null>(null);

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
    const min = minInput.trim() === '' ? undefined : parseDigitsToNumber(minInput);
    const max = maxInput.trim() === '' ? undefined : parseDigitsToNumber(maxInput);
    if (minInput.trim() !== '' && min == null) {
      toast.error('Số tiền tối thiểu không hợp lệ');
      return;
    }
    if (maxInput.trim() !== '' && max == null) {
      toast.error('Số tiền tối đa không hợp lệ');
      return;
    }
    setMinAmount(min === null ? undefined : min);
    setMaxAmount(max === null ? undefined : max);
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
      toast.error('Tải dữ liệu kho bạc thất bại');
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
            : 'Tải thất bại';
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
            : 'Tải thất bại';
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
            : 'Tải thất bại';
        setSpecialDetailErr(msg);
        setSpecialDetailData(null);
      })
      .finally(() => setSpecialDetailLoading(false));
  }, [specialDetail.open, specialDetail.id]);

  const openWithdrawConfirmModal = (id: string) => {
    setManualBankInfo(null);
    setWithdrawConfirmProofBlob('');
    setWithdrawConfirmModal({ open: true, proposalId: id });
  };

  const closeWithdrawConfirmModal = () => {
    if (busy) return;
    setManualBankInfo(null);
    setWithdrawConfirmModal({ open: false, proposalId: null });
    setWithdrawConfirmProofBlob('');
  };

  const handleWithdrawConfirmStep1 = async () => {
    const id = withdrawConfirmModal.proposalId;
    if (!id) return;
    const result = await runConfirmFirstStep(id, { successMessage: 'Đã xác nhận và thực hiện đề xuất' });
    if (result.kind === 'payos') {
      applyPayOSFromResult(result.state);
      closeWithdrawConfirmModal();
      refresh();
      setWithdrawDetail((d) => (d.id === id ? { ...d, open: false } : d));
      return;
    }
    if (result.kind === 'manual_pending') {
      setManualBankInfo(result.data);
      return;
    }
    if (result.kind === 'done' && result.ok) {
      refresh();
      closeWithdrawConfirmModal();
      setWithdrawDetail((d) => (d.id === id ? { ...d, open: false } : d));
    }
  };

  const handleWithdrawConfirmStep2 = async () => {
    if (!manualBankInfo) return;
    const ok = await submitManualBankTransferProof(
      manualBankInfo,
      withdrawConfirmProofBlob.trim(),
      'Đã xác nhận và thực hiện đề xuất',
    );
    if (ok) {
      const pid = withdrawConfirmModal.proposalId;
      refresh();
      closeWithdrawConfirmModal();
      if (pid) setWithdrawDetail((d) => (d.id === pid ? { ...d, open: false } : d));
    }
  };

  const handleMainPoolSubmit = async () => {
    const id = withdrawDetail.id;
    if (!id || !mainPoolBlobId.trim()) {
      toast.error('Tải ảnh chứng từ (blob) để xác nhận chuyển khoản thủ công');
      return;
    }
    const ok = await runMainPoolConfirm(id, mainPoolBlobId.trim(), {
      successMessage: 'Đã ghi nhận chuyển khoản quỹ chính',
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
      { successMessage: 'Đã duyệt và thực hiện yêu cầu rút chờ xử lý' },
    );
    if (ok) refresh();
  };

  const handlePendingRefuse = async (id: string) => {
    const ok = await execute(
      () => pendingWithdrawService.refuse(id),
      { successMessage: 'Đã từ chối yêu cầu rút chờ xử lý' },
    );
    if (ok) refresh();
  };

  const handleSpecialApprove = async (id: string) => {
    const ok = await execute(
      () => pendingSpecialNeedsService.approve(id),
      { successMessage: 'Đã duyệt và thực hiện đề xuất nhu cầu đặc biệt' },
    );
    if (ok) refresh();
  };

  const handleSpecialRefuse = async (id: string) => {
    const ok = await execute(
      () => pendingSpecialNeedsService.refuse(id),
      { successMessage: 'Đã từ chối đề xuất nhu cầu đặc biệt' },
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
        <label className="mb-1 block text-xs font-medium text-slate-500">Số tiền tối thiểu (VND)</label>
        <GroupedNumericInput
          value={minInput}
          onChange={setMinInput}
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          placeholder="Bất kỳ"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Số tiền tối đa (VND)</label>
        <GroupedNumericInput
          value={maxInput}
          onChange={setMaxInput}
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          placeholder="Bất kỳ"
        />
      </div>
      <button
        type="button"
        onClick={applyAmountFilter}
        className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
      >
        Áp dụng bộ lọc
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
              label: 'Nguồn',
              render: (r: WithdrawProposal) =>
                r.is_from_local_pool ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Leader địa phương
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                ),
            },
          ]
        : []),
      {
        key: 'creator',
        label: 'Người tạo',
        render: (r: WithdrawProposal) => truncateAddress(r.creator),
      },
      {
        key: 'description',
        label: 'Mô tả',
        render: (r: WithdrawProposal) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
      },
      { key: 'pool_name', label: 'Quỹ' },
      {
        key: 'withdraw_amount',
        label: 'Số tiền',
        render: (r: WithdrawProposal) => formatVND(r.withdraw_amount),
      },
      { key: 'approve_weight', label: 'Tổng duyệt' },
      { key: 'refuse_weight', label: 'Tổng từ chối' },
      {
        key: 'status_ui',
        label: 'Trạng thái',
        render: (r: WithdrawProposal) => (
          <StatusBadge status={getWithdrawProposalUiStatus(r)} />
        ),
      },
      {
        key: 'closed_at',
        label: 'Đóng bỏ phiếu',
        render: (r: WithdrawProposal) => (
          <span className="whitespace-nowrap text-xs">{formatDateTimeSeconds(r.closed_at)}</span>
        ),
      },
      { key: 'created_at', label: 'Ngày tạo', render: (r: WithdrawProposal) => formatDate(r.created_at) },
      {
        key: 'actions',
        label: 'Thao tác',
        className: 'whitespace-nowrap',
        render: (r: WithdrawProposal) => (
          <div className="flex flex-wrap gap-1">
            {actionBtn('Chi tiết', () =>
              setWithdrawDetail({ open: true, id: r.id, row: r }),
            )}
            {!r.is_executed && actionBtn('Xác nhận', () => openWithdrawConfirmModal(r.id), 'muted')}
          </div>
        ),
      },
    ] as const;

  const wd = withdrawDetailData || withdrawDetail.row;

  return (
    <div>
      <PageHeader
        title="Kho bạc"
        description="Đề xuất rút tiền, yêu cầu rút chờ xử lý, nhu cầu đặc biệt chờ duyệt"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabBtn('proposals', 'Đề xuất rút')}
        {tabBtn('pending', 'Rút tiền chờ duyệt')}
        {tabBtn('special', 'Nhu cầu đặc biệt')}
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
            emptyMessage="Không có đề xuất rút phù hợp bộ lọc"
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
            emptyMessage="Không có yêu cầu rút chờ duyệt phù hợp bộ lọc"
            columns={[
              {
                key: 'id',
                label: 'ID',
                render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span>,
              },
              { key: 'poolName', label: 'Quỹ' },
              { key: 'creator', label: 'Người tạo', render: (r) => truncateAddress(r.creator) },
              {
                key: 'description',
                label: 'Mô tả',
                render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
              },
              {
                key: 'withdrawAmount',
                label: 'Số tiền',
                render: (r) => formatVND(r.withdrawAmount),
              },
              { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'createdAt', label: 'Ngày tạo', render: (r) => formatDate(r.createdAt) },
              {
                key: 'actions',
                label: 'Thao tác',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {actionBtn('Chi tiết', () => setPendingDetail({ open: true, id: r.id }))}
                    {actionBtn('Duyệt', () => void handlePendingApprove(r.id))}
                    {actionBtn('Từ chối', () => void handlePendingRefuse(r.id), 'danger')}
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
            emptyMessage="Không có nhu cầu đặc biệt chờ duyệt phù hợp bộ lọc"
            columns={[
              {
                key: 'id',
                label: 'ID',
                render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span>,
              },
              { key: 'child_id', label: 'Trẻ', render: (r) => truncateAddress(r.child_id, 4) },
              {
                key: 'description',
                label: 'Mô tả',
                render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
              },
              { key: 'target', label: 'Mục tiêu', render: (r) => formatVND(r.target) },
              { key: 'region', label: 'Vùng' },
              {
                key: 'ai_evaluation',
                label: 'Đánh giá AI',
                render: (r) => <span className="max-w-[200px] truncate text-xs">{r.ai_evaluation || '-'}</span>,
              },
              {
                key: 'review_status',
                label: 'Duyệt',
                render: (r) => <StatusBadge status={r.review_status} />,
              },
              { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
              {
                key: 'actions',
                label: 'Thao tác',
                className: 'whitespace-nowrap',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {actionBtn('Chi tiết', () => setSpecialDetail({ open: true, id: r.id }))}
                    {actionBtn('Duyệt', () => void handleSpecialApprove(r.id))}
                    {actionBtn('Từ chối', () => void handleSpecialRefuse(r.id), 'danger')}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <DetailModal
        title="Đề xuất rút tiền"
        open={withdrawDetail.open}
        onClose={() => {
          setWithdrawDetail({ open: false, id: null });
          setMainPoolBlobId('');
          setWithdrawConfirmModal({ open: false, proposalId: null });
          setWithdrawConfirmProofBlob('');
          setManualBankInfo(null);
        }}
        loading={withdrawDetailLoading}
        error={withdrawDetailErr}
        wide
      >
        {wd && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{wd.id}</span>)}
            {detailField('Người tạo', truncateAddress(wd.creator))}
            {detailField('Quỹ', wd.pool_name)}
            {detailField('Số tiền', formatVND(wd.withdraw_amount))}
            {detailField('Mô tả', wd.description || '—')}
            {detailField(
              'Quỹ leader địa phương',
              wd.is_from_local_pool ? (
                <span className="text-amber-700">Có</span>
              ) : (
                <span className="text-slate-600">Không</span>
              ),
            )}
            {detailField('Trạng thái', <StatusBadge status={getWithdrawProposalUiStatus(wd)} />)}
            {detailField('Đóng bỏ phiếu', formatDateTimeSeconds(wd.closed_at))}
            {detailField('Ngày tạo', formatDate(wd.created_at))}
            {wd.proof_blob_id &&
              detailField(
                'Chứng từ',
                <div className="mt-1">
                  <BlobImage blobId={wd.proof_blob_id} className="max-h-64 rounded-lg border border-slate-200 object-contain" />
                </div>,
              )}
            {!wd.is_executed && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-600">Xác nhận chuyển tiền</p>
                <p className="text-xs text-slate-500">
                  PayOS hoặc on-chain sẽ mở thanh toán hoặc ký giao dịch. Chuyển khoản thủ công: sau khi xác nhận bạn sẽ thấy
                  tài khoản nhận và gửi ảnh chứng từ. Luồng quỹ chính (main pool) dùng mục riêng bên dưới.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => wd.id && openWithdrawConfirmModal(wd.id)}
                    className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    {busy ? 'Đang xử lý…' : 'Xác nhận chuyển tiền…'}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-700">Chuyển khoản thủ công (quỹ chính)</p>
                  <FileUploadInput
                    label="Ảnh chứng từ (blob Walrus)"
                    value={mainPoolBlobId}
                    onChange={setMainPoolBlobId}
                  />
                  <button
                    type="button"
                    disabled={busy || !mainPoolBlobId.trim()}
                    onClick={() => void handleMainPoolSubmit()}
                    className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white disabled:opacity-50"
                  >
                    Gửi chứng từ và xác nhận
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal
        title="Rút tiền chờ duyệt"
        open={pendingDetail.open}
        onClose={() => setPendingDetail({ open: false, id: null })}
        loading={pendingDetailLoading}
        error={pendingDetailErr}
        wide
      >
        {pendingDetailData && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{pendingDetailData.id}</span>)}
            {detailField('Quỹ', pendingDetailData.poolName)}
            {detailField('Người tạo', truncateAddress(pendingDetailData.creator))}
            {detailField('Mô tả', pendingDetailData.description || '—')}
            {detailField('Số tiền', formatVND(pendingDetailData.withdrawAmount))}
            {detailField('Trạng thái', pendingDetailData.status)}
            {pendingDetailData.proofBlobID &&
              detailField(
                'Chứng từ',
                <BlobImage
                  blobId={pendingDetailData.proofBlobID}
                  className="max-h-64 rounded-lg border border-slate-200 object-contain"
                />,
              )}
            {detailField('Ngày tạo', formatDate(pendingDetailData.createdAt))}
          </div>
        )}
      </DetailModal>

      <DetailModal
        title="Nhu cầu đặc biệt chờ duyệt"
        open={specialDetail.open}
        onClose={() => setSpecialDetail({ open: false, id: null })}
        loading={specialDetailLoading}
        error={specialDetailErr}
        wide
      >
        {specialDetailData && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{specialDetailData.id}</span>)}
            {detailField('Trẻ', truncateAddress(specialDetailData.child_id))}
            {detailField('Vùng', specialDetailData.region)}
            {detailField('Mô tả', specialDetailData.description || '—')}
            {detailField('Mục tiêu', formatVND(specialDetailData.target))}
            {detailField('Đánh giá AI', specialDetailData.ai_evaluation || '—')}
            {detailField('Duyệt', specialDetailData.review_status)}
            {specialDetailData.proof_blob_id &&
              detailField(
                'Chứng từ',
                <BlobImage
                  blobId={specialDetailData.proof_blob_id}
                  className="max-h-64 rounded-lg border border-slate-200 object-contain"
                />,
              )}
            {detailField('Ngày tạo', formatDate(specialDetailData.created_at))}
          </div>
        )}
      </DetailModal>

      {withdrawConfirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Xác nhận rút tiền</h3>
            {!manualBankInfo ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Bước 1: Lấy thông tin chuyển khoản. Với PayOS hoặc giao dịch on-chain, hệ thống sẽ mở bước tiếp theo ngay.
                  Với chuyển khoản thủ công, sau bước này bạn sẽ thấy tài khoản nhận và tải ảnh chứng từ.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeWithdrawConfirmModal}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleWithdrawConfirmStep1()}
                    className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    {busy ? 'Đang xử lý…' : 'Lấy thông tin chuyển khoản'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs font-medium text-slate-700">Thông tin chuyển khoản</p>
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500">Tên ngân hàng</span>
                    <p className="font-medium text-slate-900">{manualBankInfo.bank_org || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Số tài khoản</span>
                    <p className="font-mono font-medium text-slate-900">{manualBankInfo.bank_code || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Chủ tài khoản</span>
                    <p className="font-medium text-slate-900">{manualBankInfo.owner || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Số tiền</span>
                    <p className="font-medium text-slate-900">
                      {(() => {
                        const raw = manualBankInfo.amount?.replace(/[^\d]/g, '') ?? '';
                        const n = raw ? Number(raw) : NaN;
                        return Number.isFinite(n) ? formatVND(n) : manualBankInfo.amount || '—';
                      })()}
                    </p>
                  </div>
                  {manualBankInfo.description ? (
                    <div>
                      <span className="text-xs text-slate-500">Nội dung</span>
                      <p className="text-slate-800">{manualBankInfo.description}</p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Bước 2: Sau khi chuyển khoản, tải ảnh chứng từ (blob Walrus) và gửi xác nhận.
                </p>
                <div className="mt-4">
                  <FileUploadInput
                    label="Ảnh chứng từ (blob Walrus)"
                    value={withdrawConfirmProofBlob}
                    onChange={setWithdrawConfirmProofBlob}
                    accept="image/*"
                  />
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setManualBankInfo(null);
                      setWithdrawConfirmProofBlob('');
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={busy || !withdrawConfirmProofBlob.trim()}
                    onClick={() => void handleWithdrawConfirmStep2()}
                    className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    {busy ? 'Đang gửi…' : 'Gửi bằng chứng'}
                  </button>
                </div>
              </>
            )}
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
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Đang tải…</div>
      }
    >
      <TreasuryPageContent />
    </Suspense>
  );
}
