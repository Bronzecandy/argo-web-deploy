'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
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
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import AiEvaluationBadge from '@/src/components/ui/AiEvaluationBadge';
import DetailField from '@/src/components/ui/DetailField';
import TabBar from '@/src/components/ui/TabBar';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import EmptyState from '@/src/components/ui/EmptyState';
import ListPagination from '@/src/components/ui/ListPagination';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import WithdrawProposalCard from '@/src/components/leader/WithdrawProposalCard';
import { btnPrimary, btnSecondary } from '@/src/lib/uiClasses';
import {
  formatDate,
  formatDateTimeSeconds,
  formatVND,
  getWithdrawProposalUiStatus,
  parseDigitsToNumber,
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
import {
  clearWithdrawConfirmPayloads,
  clearWithdrawManualPayload,
  clearWithdrawPayosPayload,
  loadWithdrawManualPayload,
  loadWithdrawPayosPayload,
  saveWithdrawManualPayload,
  saveWithdrawPayosPayload,
} from '@/src/lib/withdrawConfirmStorage';

const PAGE_SIZE = 20;

type TabId = 'proposals' | 'pending' | 'special';

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
      toast.error('Tải dữ liệu đề xuất rút tiền thất bại');
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
    setWithdrawConfirmProofBlob('');
    const cachedManual = loadWithdrawManualPayload(id);
    const cachedPayos = loadWithdrawPayosPayload(id);
    if (cachedPayos?.url && !cachedManual) {
      applyPayOSFromResult({
        open: true,
        url: cachedPayos.url,
        paymentId: cachedPayos.paymentId,
        title: cachedPayos.title ?? 'Thanh toán PayOS',
        proposalId: id,
      });
      toast.message('Tiếp tục phiên PayOS — hoàn tất thanh toán hoặc dùng «Kiểm tra thanh toán».');
      return;
    }
    setManualBankInfo(cachedManual);
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

    const storedManual = loadWithdrawManualPayload(id);
    if (storedManual) {
      setManualBankInfo(storedManual);
      toast.message('Hiển thị lại thông tin chuyển khoản (đã lấy trước đó — không gọi lại API).');
      return;
    }

    const result = await runConfirmFirstStep(id, { successMessage: 'Đã xác nhận và thực hiện đề xuất' });
    if (result.kind === 'payos') {
      saveWithdrawPayosPayload(id, {
        url: result.state.url,
        paymentId: result.state.paymentId,
        title: result.state.title,
      });
      applyPayOSFromResult({
        ...result.state,
        proposalId: id,
      });
      closeWithdrawConfirmModal();
      refresh();
      setWithdrawDetail((d) => (d.id === id ? { ...d, open: false } : d));
      return;
    }
    if (result.kind === 'manual_pending') {
      saveWithdrawManualPayload(id, result.data);
      setManualBankInfo(result.data);
      return;
    }
    if (result.kind === 'done' && result.ok) {
      clearWithdrawConfirmPayloads(id);
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
      if (pid) {
        clearWithdrawManualPayload(pid);
        clearWithdrawPayosPayload(pid);
      }
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

  const actionBtn = (label: string, onClick: () => void, variant: 'primary' | 'danger' | 'muted' = 'primary') => (
    <TableIconButton
      variant={variant === 'danger' ? 'danger' : variant === 'primary' ? 'primary' : 'default'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </TableIconButton>
  );

  const wd = withdrawDetailData || withdrawDetail.row;

  return (
    <div>
      <PageHeader
        title="Rút tiền"
        description="Đề xuất rút tiền, yêu cầu rút chờ xử lý, nhu cầu đặc biệt chờ duyệt"
      />

      <TabBar<TabId>
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'proposals', label: 'Đề xuất rút' },
          { id: 'pending', label: 'Rút tiền chờ duyệt' },
          { id: 'special', label: 'Nhu cầu đặc biệt' },
        ]}
      />

      <FilterToolbar>
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
        <button type="button" onClick={applyAmountFilter} className={btnPrimary}>
          Áp dụng bộ lọc
        </button>
      </FilterToolbar>

      <div className="mt-4">
        {tab === 'proposals' && (
          <PageSection title="Đề xuất rút tiền" noPadding>
            {loading ? (
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-5">
                    <div className="mb-3 h-6 w-24 rounded bg-slate-100" />
                    <div className="mb-2 h-5 w-full rounded bg-slate-100" />
                    <div className="mb-4 h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <EmptyState message="Không có đề xuất rút phù hợp bộ lọc" />
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                {proposals.map((row) => (
                  <WithdrawProposalCard
                    key={row.id}
                    proposal={row}
                    showSourceBadge
                    onDetail={() => setWithdrawDetail({ open: true, id: row.id, row })}
                  />
                ))}
              </div>
            )}
            {!loading && proposals.length > 0 && (
              <ListPagination
                page={pageProposals}
                totalPages={totalPagesProposals}
                onPageChange={setPageProposals}
              />
            )}
          </PageSection>
        )}

        {tab === 'pending' && (
          <PageSection title="Rút tiền chờ duyệt" noPadding>
          <DataTable<PendingWithdrawProposal>
            loading={loading}
            data={pendingList}
            page={pagePending}
            totalPages={totalPagesPending}
            onPageChange={setPagePending}
            emptyMessage="Không có yêu cầu rút chờ duyệt phù hợp bộ lọc"
            columns={[
              { key: 'poolName', label: 'Quỹ' },
              { key: 'creator', label: 'Người tạo', render: (r) => <CopyableTruncated value={r.creator} chars={6} /> },
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
              {
                key: 'ai',
                label: 'AI',
                render: (r) => <AiEvaluationBadge record={r} />,
              },
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
          </PageSection>
        )}

        {tab === 'special' && (
          <PageSection title="Nhu cầu đặc biệt" noPadding>
          <DataTable<PendingSpecialNeedProposal>
            loading={loading}
            data={specialList}
            page={pageSpecial}
            totalPages={totalPagesSpecial}
            onPageChange={setPageSpecial}
            emptyMessage="Không có nhu cầu đặc biệt chờ duyệt phù hợp bộ lọc"
            columns={[
              { key: 'child_id', label: 'Trẻ', render: (r) => <CopyableTruncated value={r.child_id} chars={4} /> },
              {
                key: 'description',
                label: 'Mô tả',
                render: (r) => <span className="max-w-xs truncate">{r.description || '-'}</span>,
              },
              { key: 'target', label: 'Mục tiêu', render: (r) => formatVND(r.target) },
              { key: 'region', label: 'Vùng' },
              {
                key: 'review_status',
                label: 'Duyệt',
                render: (r) => <StatusBadge status={r.review_status} />,
              },
              {
                key: 'ai_evaluation',
                label: 'AI',
                render: (r) => <AiEvaluationBadge record={r} />,
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
          </PageSection>
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
          <div>
            <DetailField label="ID" value={<span className="font-mono text-xs break-all">{wd.id}</span>} />
            <DetailField label="Người tạo" value={<CopyableTruncated value={wd.creator} chars={6} />} />
            <DetailField label="Quỹ" value={wd.pool_name} />
            <DetailField label="Số tiền" value={formatVND(wd.withdraw_amount)} />
            <DetailField label="Mô tả" value={wd.description || '—'} />
            <DetailField
              label="Quỹ leader địa phương"
              value={
                wd.is_from_local_pool ? (
                  <span className="text-amber-700">Có</span>
                ) : (
                  <span className="text-slate-600">Không</span>
                )
              }
            />
            <DetailField label="Trạng thái" value={<StatusBadge status={getWithdrawProposalUiStatus(wd)} />} />
            <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(wd.closed_at)} />
            <DetailField label="Ngày tạo" value={formatDate(wd.created_at)} />
            {wd.proof_blob_id && (
              <div className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="text-xs font-medium text-slate-500">Chứng từ</div>
                <div className="mt-1">
                  <BlobImage blobId={wd.proof_blob_id} className="max-h-64 rounded-lg border border-slate-200 object-contain" />
                </div>
              </div>
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
                    className={`${btnPrimary} disabled:opacity-50`}
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
                    className={`${btnSecondary} mt-2 disabled:opacity-50`}
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
          <div>
            <DetailField label="ID" value={<span className="font-mono text-xs break-all">{pendingDetailData.id}</span>} />
            <DetailField label="Quỹ" value={pendingDetailData.poolName} />
            <DetailField label="Người tạo" value={<CopyableTruncated value={pendingDetailData.creator} chars={6} />} />
            <DetailField label="Mô tả" value={pendingDetailData.description || '—'} />
            <DetailField label="Số tiền" value={formatVND(pendingDetailData.withdrawAmount)} />
            <DetailField label="Trạng thái" value={pendingDetailData.status} />
            {pendingDetailData.proofBlobID && (
              <div className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="text-xs font-medium text-slate-500">Chứng từ</div>
                <div className="mt-1">
                  <BlobImage
                    blobId={pendingDetailData.proofBlobID}
                    className="max-h-64 rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              </div>
            )}
            <AiInsightPanel record={pendingDetailData} className="mt-4" />
            <DetailField label="Ngày tạo" value={formatDate(pendingDetailData.createdAt)} />
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
          <div>
            <DetailField label="ID" value={<span className="font-mono text-xs break-all">{specialDetailData.id}</span>} />
            <DetailField label="Trẻ" value={<CopyableTruncated value={specialDetailData.child_id} chars={4} />} />
            <DetailField label="Vùng" value={specialDetailData.region} />
            <DetailField label="Mô tả" value={specialDetailData.description || '—'} />
            <DetailField label="Mục tiêu" value={formatVND(specialDetailData.target)} />
            <DetailField label="Duyệt" value={specialDetailData.review_status} />
            <AiInsightPanel record={specialDetailData} className="my-4" />
            {specialDetailData.proof_blob_id && (
              <div className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="text-xs font-medium text-slate-500">Chứng từ</div>
                <div className="mt-1">
                  <BlobImage
                    blobId={specialDetailData.proof_blob_id}
                    className="max-h-64 rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              </div>
            )}
            <DetailField label="Ngày tạo" value={formatDate(specialDetailData.created_at)} />
          </div>
        )}
      </DetailModal>

      <FormModal
        open={withdrawConfirmModal.open}
        onClose={closeWithdrawConfirmModal}
        title="Xác nhận rút tiền"
        hideFooter
        maxWidth="md"
      >
        {!manualBankInfo ? (
          <>
            <p className="text-xs leading-relaxed text-slate-600">
              Bước 1: Lấy thông tin chuyển khoản. Với PayOS hoặc giao dịch on-chain, hệ thống sẽ mở bước tiếp theo ngay.
              Với chuyển khoản thủ công, sau bước này bạn sẽ thấy tài khoản nhận và tải ảnh chứng từ.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={busy} onClick={closeWithdrawConfirmModal} className={btnSecondary}>
                Hủy
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleWithdrawConfirmStep1()}
                className={btnPrimary}
              >
                {busy ? 'Đang xử lý…' : 'Lấy thông tin chuyển khoản'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-700">Thông tin chuyển khoản</p>
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <DetailField label="Tên ngân hàng" value={manualBankInfo.bank_org || '—'} />
              <DetailField label="Số tài khoản" value={<span className="font-mono">{manualBankInfo.bank_code || '—'}</span>} />
              <DetailField label="Chủ tài khoản" value={manualBankInfo.owner || '—'} />
              <DetailField
                label="Số tiền"
                value={(() => {
                  const raw = manualBankInfo.amount?.replace(/[^\d]/g, '') ?? '';
                  const n = raw ? Number(raw) : NaN;
                  return Number.isFinite(n) ? formatVND(n) : manualBankInfo.amount || '—';
                })()}
              />
              {manualBankInfo.description ? (
                <DetailField label="Nội dung" value={manualBankInfo.description} />
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
                className={btnSecondary}
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy || !withdrawConfirmProofBlob.trim()}
                onClick={() => void handleWithdrawConfirmStep2()}
                className={btnPrimary}
              >
                {busy ? 'Đang gửi…' : 'Gửi bằng chứng'}
              </button>
            </div>
          </>
        )}
      </FormModal>

      <PayOSPaymentDialog
        state={payOS}
        onClose={closePayOS}
        onPaymentSuccess={() => {
          const pid = payOS.proposalId?.trim();
          if (pid) clearWithdrawConfirmPayloads(pid);
          refresh();
        }}
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
