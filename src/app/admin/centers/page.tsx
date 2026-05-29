'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, ClipboardList, MapPin, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import BlobImage from '@/src/components/ui/BlobImage';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import TabBar from '@/src/components/ui/TabBar';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import { btnPrimary, btnTablePrimary, inputClass, selectClass } from '@/src/lib/uiClasses';
import { formatDate, formatDateTimeSeconds, formatInteger, formatVND } from '@/src/lib/formatters';
import { centerService } from '@/src/services/center.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { CenterRequest, SupportCenter } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'refused', label: 'Đã từ chối' },
];

type CentersTab = 'centers' | 'requests';

/** On-chain registered support centers */
const SUPPORT_CENTER_COLUMNS = [
  { key: 'region', label: 'Vùng' },
  {
    key: 'center_address',
    label: 'Địa chỉ',
    render: (c: SupportCenter) => (
      <CopyableTruncated value={c.center_address || ''} chars={14} mono={false} className="max-w-[240px] text-slate-700" />
    ),
  },
  { key: 'center_phone_number', label: 'Điện thoại' },
  {
    key: 'uploaded_at',
    label: 'Ngày tải lên',
    render: (c: SupportCenter) => formatDate(c.uploaded_at),
  },
  {
    key: 'updated_at',
    label: 'Cập nhật lần cuối',
    render: (c: SupportCenter) => formatDate(c.updated_at),
  },
];

/** Center registration requests from leaders */
const CENTER_REQUEST_COLUMNS = [
  { key: 'region', label: 'Vùng' },
  {
    key: 'address',
    label: 'Địa chỉ',
    render: (c: CenterRequest) => (
      <CopyableTruncated value={c.address || ''} chars={14} mono={false} className="max-w-[220px] text-slate-700" />
    ),
  },
  { key: 'phone_number', label: 'Điện thoại' },
  {
    key: 'created_by',
    label: 'Người tạo',
    render: (c: CenterRequest) => <CopyableTruncated value={c.created_by} chars={8} />,
  },
  { key: 'status', label: 'Trạng thái', render: (c: CenterRequest) => <StatusBadge status={c.status} /> },
  { key: 'created_at', label: 'Ngày tạo', render: (c: CenterRequest) => formatDate(c.created_at) },
  {
    key: 'closed_at',
    label: 'Thời gian đóng',
    render: (c: CenterRequest) => (
      <span className="whitespace-nowrap text-xs text-slate-700">{formatDateTimeSeconds(c.closed_at)}</span>
    ),
  },
];

function isSupportCenter(row: SupportCenter | CenterRequest): row is SupportCenter {
  return 'center_address' in row;
}

export default function AdminCentersPage() {
  const { execute } = useExecuteTransaction();
  const [tab, setTab] = useState<CentersTab>('centers');

  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<SupportCenter[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);

  const [reqLoading, setReqLoading] = useState(false);
  const [reqs, setReqs] = useState<CenterRequest[]>([]);
  const [reqPage, setReqPage] = useState(0);
  const [reqTotalPages, setReqTotalPages] = useState(1);
  const [reqTotalAmount, setReqTotalAmount] = useState(0);
  const [reqStatus, setReqStatus] = useState('');
  const [reqKeywordDraft, setReqKeywordDraft] = useState('');
  const [reqKeyword, setReqKeyword] = useState('');

  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [confirmBusyId, setConfirmBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [detail, setDetail] = useState<
    { type: 'center'; row: SupportCenter } | { type: 'request'; row: CenterRequest } | null
  >(null);
  const [detailFetched, setDetailFetched] = useState<SupportCenter | CenterRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCenters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await centerService.list({
        page,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
      });
      const body = res.data;
      setCenters(Array.isArray(body.data) ? body.data : []);
      setTotalAmount(typeof body.amount === 'number' ? body.amount : 0);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Không tải được danh sách trung tâm');
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadCenterRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await centerService.listCenterRequests({
        page: reqPage,
        page_size: PAGE_SIZE,
        status: reqStatus || undefined,
        keyword: reqKeyword.trim() || undefined,
        sort_order: 'desc',
      });
      const body = res.data;
      setReqs(Array.isArray(body.data) ? body.data : []);
      setReqTotalAmount(typeof body.amount === 'number' ? body.amount : 0);
      setReqTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Không tải được yêu cầu trung tâm');
      setReqs([]);
    } finally {
      setReqLoading(false);
    }
  }, [reqPage, reqStatus, reqKeyword]);

  useEffect(() => {
    if (tab !== 'centers') return;
    void loadCenters();
  }, [tab, loadCenters]);

  useEffect(() => {
    if (tab !== 'requests') return;
    void loadCenterRequests();
  }, [tab, loadCenterRequests]);

  useEffect(() => {
    if (!detail) {
      setDetailFetched(null);
      return;
    }
    if (detail.type === 'center') {
      setDetailLoading(true);
      void centerService
        .getById(detail.row.id)
        .then((res) => setDetailFetched(res.data))
        .catch(() => setDetailFetched(detail.row))
        .finally(() => setDetailLoading(false));
      return;
    }
    setDetailLoading(true);
    void centerService
      .getCenterRequestById(detail.row.id)
      .then((res) => setDetailFetched(res.data))
      .catch(() => setDetailFetched(detail.row))
      .finally(() => setDetailLoading(false));
  }, [detail]);

  async function handleVote(id: string, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id });
      setRefuseReason('');
      return;
    }
    setVoteBusyId(id);
    try {
      await centerService.voteCenterRequest(id, { is_vote_yes: true });
      toast.success('Đã ghi nhận phiếu');
      await loadCenterRequests();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Bỏ phiếu thất bại');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function submitRefuseVote() {
    if (!refuseModal) return;
    const { id } = refuseModal;
    setVoteBusyId(id);
    try {
      await centerService.voteCenterRequest(id, {
        is_vote_yes: false,
        refuse_reason: refuseReason || undefined,
      });
      toast.success('Đã ghi nhận từ chối');
      setRefuseModal(null);
      await loadCenterRequests();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Bỏ phiếu thất bại');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function handleConfirm(id: string) {
    setConfirmBusyId(id);
    const ok = await execute(
      () => centerService.confirmCenterRequest(id),
      { successMessage: 'Đã xác nhận trung tâm và thực thi on-chain' },
    );
    if (ok) await loadCenterRequests();
    setConfirmBusyId(null);
  }

  const centerDetailsCol = {
    key: 'details' as const,
    label: 'Chi tiết',
    className: 'whitespace-nowrap',
    render: (c: SupportCenter) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDetail({ type: 'center', row: c });
        }}
        className={btnTablePrimary}
      >
        Chi tiết
      </button>
    ),
  };

  const requestDetailsCol = {
    key: 'details' as const,
    label: 'Chi tiết',
    className: 'whitespace-nowrap',
    render: (c: CenterRequest) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDetail({ type: 'request', row: c });
        }}
        className={btnTablePrimary}
      >
        Chi tiết
      </button>
    ),
  };

  const requestColumns = [
    ...CENTER_REQUEST_COLUMNS,
    requestDetailsCol,
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'whitespace-nowrap',
      render: (c: CenterRequest) => (
        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={voteBusyId === c.id}
            onClick={() => handleVote(c.id, true)}
            className={btnTablePrimary}
            title="Phiếu đồng ý"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={voteBusyId === c.id}
            onClick={() => handleVote(c.id, false)}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            title="Phiếu từ chối"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          {c.isAvailableToConfirm && (
            <button
              type="button"
              disabled={confirmBusyId === c.id}
              onClick={() => handleConfirm(c.id)}
              className={btnTablePrimary}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Xác nhận
            </button>
          )}
        </div>
      ),
    },
  ];

  const headerTotal = tab === 'centers' ? totalAmount : reqTotalAmount;

  return (
    <div className="p-6">
      <PageHeader
        title="Trung tâm hỗ trợ"
        description={
          tab === 'centers'
            ? 'Trung tâm hỗ trợ đã đăng ký trên chuỗi'
            : 'Đăng ký trung tâm mới từ trưởng vùng'
        }
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
            <Building2 className="h-3.5 w-3.5" />
            {formatInteger(headerTotal)} tổng
          </span>
        }
      />

      <TabBar<CentersTab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'centers', label: 'Trung tâm đã đăng ký', icon: <Building2 className="h-4 w-4 shrink-0" /> },
          { id: 'requests', label: 'Yêu cầu trung tâm', icon: <ClipboardList className="h-4 w-4 shrink-0" /> },
        ]}
      />

      {tab === 'centers' ? (
        <PageSection title="Trung tâm đã đăng ký" noPadding>
          <DataTable<SupportCenter>
            columns={[...SUPPORT_CENTER_COLUMNS, centerDetailsCol]}
            data={centers}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            emptyMessage="Không tìm thấy trung tâm hỗ trợ."
          />
        </PageSection>
      ) : (
        <>
          <FilterToolbar>
            <div className="flex flex-wrap items-end gap-2">
              <MapPin className="mb-2 h-4 w-4 text-slate-400" />
              <div>
                <label htmlFor="req-status" className="mb-1 block text-xs font-medium text-slate-500">
                  Trạng thái
                </label>
                <select
                  id="req-status"
                  value={reqStatus}
                  onChange={(e) => {
                    setReqStatus(e.target.value);
                    setReqPage(0);
                  }}
                  className={selectClass}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || 'all-r'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="min-w-[200px] flex-1 sm:max-w-md">
              <label htmlFor="req-keyword" className="mb-1 block text-xs font-medium text-slate-500">
                Từ khóa
              </label>
              <input
                id="req-keyword"
                type="search"
                value={reqKeywordDraft}
                onChange={(e) => setReqKeywordDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setReqKeyword(reqKeywordDraft), setReqPage(0))}
                placeholder="Tìm kiếm…"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setReqKeyword(reqKeywordDraft);
                setReqPage(0);
              }}
              className={btnPrimary}
            >
              Tìm
            </button>
          </FilterToolbar>

          <PageSection title="Yêu cầu trung tâm" noPadding>
          <DataTable<CenterRequest>
            columns={requestColumns}
            data={reqs}
            loading={reqLoading}
            page={reqPage}
            totalPages={reqTotalPages}
            onPageChange={(p) => setReqPage(p)}
            emptyMessage="Không có yêu cầu trung tâm phù hợp bộ lọc."
          />
          </PageSection>
        </>
      )}

      <DetailModal
        title={detail?.type === 'request' ? 'Yêu cầu trung tâm' : 'Trung tâm hỗ trợ'}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
        wide
      >
        {detailFetched && (
          <div>
            {isSupportCenter(detailFetched) ? (
              <>
                <DetailField label="Vùng" value={detailFetched.region} />
                <DetailField label="Địa chỉ" value={detailFetched.center_address} />
                <DetailField label="Điện thoại" value={detailFetched.center_phone_number} />
                <DetailField label="Ngày tải lên" value={formatDate(detailFetched.uploaded_at)} />
                <DetailField label="Cập nhật" value={formatDate(detailFetched.updated_at)} />
                <DetailField label="Mã" value={<span className="font-mono text-xs break-all">{detailFetched.id}</span>} />
              </>
            ) : (
              <>
                {detailFetched.image_blob_id && (
                  <div className="border-b border-slate-100 py-2.5">
                    <div className="text-xs font-medium text-slate-500">Hình ảnh</div>
                    <div className="mt-1">
                      <BlobImage
                        blobId={detailFetched.image_blob_id}
                        source="api"
                        className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain"
                      />
                    </div>
                  </div>
                )}
                <DetailField label="Vùng" value={detailFetched.region} />
                <DetailField label="Địa chỉ" value={detailFetched.address} />
                <DetailField label="Điện thoại" value={detailFetched.phone_number} />
                <DetailField label="Trạng thái" value={<StatusBadge status={detailFetched.status} />} />
                <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(detailFetched.closed_at)} />
                <DetailField label="Mã" value={<span className="font-mono text-xs break-all">{detailFetched.id}</span>} />
              </>
            )}
          </div>
        )}
      </DetailModal>

      <FormModal
        open={refuseModal !== null}
        onClose={() => setRefuseModal(null)}
        title="Từ chối yêu cầu trung tâm"
        submitLabel="Gửi từ chối"
        submitVariant="danger"
        submitDisabled={refuseModal != null && voteBusyId === refuseModal.id}
        onSubmit={() => void submitRefuseVote()}
      >
        <p className="mb-2 text-sm text-slate-600">Lý do từ chối (không bắt buộc).</p>
        <textarea
          value={refuseReason}
          onChange={(e) => setRefuseReason(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Lý do…"
        />
      </FormModal>

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
