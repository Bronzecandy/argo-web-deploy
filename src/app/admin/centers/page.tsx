'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Check, ClipboardList, MapPin, ShieldCheck, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { formatDate, formatInteger, formatVND } from '@/src/lib/formatters';
import { centerService } from '@/src/services/center.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { CenterRequest, SupportCenter } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
];

type CentersTab = 'centers' | 'requests';

/** On-chain registered support centers */
const SUPPORT_CENTER_COLUMNS = [
  { key: 'region', label: 'Vùng' },
  {
    key: 'center_address',
    label: 'Address',
    render: (c: SupportCenter) => (
      <CopyableTruncated value={c.center_address || ''} chars={14} mono={false} className="max-w-[240px] text-slate-700" />
    ),
  },
  { key: 'center_phone_number', label: 'Phone' },
  {
    key: 'uploaded_at',
    label: 'Uploaded',
    render: (c: SupportCenter) => formatDate(c.uploaded_at),
  },
  {
    key: 'updated_at',
    label: 'Updated',
    render: (c: SupportCenter) => formatDate(c.updated_at),
  },
];

/** Center registration requests from leaders */
const CENTER_REQUEST_COLUMNS = [
  { key: 'region', label: 'Vùng' },
  {
    key: 'address',
    label: 'Address',
    render: (c: CenterRequest) => (
      <CopyableTruncated value={c.address || ''} chars={14} mono={false} className="max-w-[220px] text-slate-700" />
    ),
  },
  { key: 'phone_number', label: 'Phone' },
  {
    key: 'created_by',
    label: 'Người tạo',
    render: (c: CenterRequest) => <CopyableTruncated value={c.created_by} chars={8} />,
  },
  { key: 'status', label: 'Status', render: (c: CenterRequest) => <StatusBadge status={c.status} /> },
  { key: 'created_at', label: 'Ngày tạo', render: (c: CenterRequest) => formatDate(c.created_at) },
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
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Details
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
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Details
      </button>
    ),
  };

  const requestColumns = [
    ...CENTER_REQUEST_COLUMNS,
    requestDetailsCol,
    {
      key: 'actions',
      label: 'Actions',
      className: 'whitespace-nowrap',
      render: (c: CenterRequest) => (
        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={voteBusyId === c.id}
            onClick={() => handleVote(c.id, true)}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
            title="Approve vote"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={voteBusyId === c.id}
            onClick={() => handleVote(c.id, false)}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            title="Refuse vote"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          {c.isAvailableToConfirm && (
            <button
              type="button"
              disabled={confirmBusyId === c.id}
              onClick={() => handleConfirm(c.id)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Confirm
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
            {formatInteger(headerTotal)} total
          </span>
        }
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab('centers')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'centers'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          Centers
        </button>
        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'requests'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          Yêu cầu trung tâm
        </button>
      </div>

      {tab === 'centers' ? (
        <>
          <DataTable<SupportCenter>
            columns={[...SUPPORT_CENTER_COLUMNS, centerDetailsCol]}
            data={centers}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            emptyMessage="No support centers found."
          />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <label htmlFor="req-status" className="text-sm text-slate-600">
                Status
              </label>
              <select
                id="req-status"
                value={reqStatus}
                onChange={(e) => {
                  setReqStatus(e.target.value);
                  setReqPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all-r'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-md">
              <label htmlFor="req-keyword" className="text-sm text-slate-600">
                Keyword
              </label>
              <input
                id="req-keyword"
                type="search"
                value={reqKeywordDraft}
                onChange={(e) => setReqKeywordDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setReqKeyword(reqKeywordDraft), setReqPage(0))}
                placeholder="Search…"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setReqKeyword(reqKeywordDraft);
                setReqPage(0);
              }}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
            >
              Search
            </button>
          </div>

          <DataTable<CenterRequest>
            columns={requestColumns}
            data={reqs}
            loading={reqLoading}
            page={reqPage}
            totalPages={reqTotalPages}
            onPageChange={(p) => setReqPage(p)}
            emptyMessage="No center requests match your filters."
          />
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
          <div className="space-y-3 text-sm">
            {isSupportCenter(detailFetched) ? (
              <>
                <p>
                  <span className="text-slate-500">Region:</span> {detailFetched.region}
                </p>
                <p>
                  <span className="text-slate-500">Address:</span> {detailFetched.center_address}
                </p>
                <p>
                  <span className="text-slate-500">Phone:</span> {detailFetched.center_phone_number}
                </p>
                <p>
                  <span className="text-slate-500">Uploaded:</span> {formatDate(detailFetched.uploaded_at)}
                </p>
                <p>
                  <span className="text-slate-500">Updated:</span> {formatDate(detailFetched.updated_at)}
                </p>
                <p className="font-mono text-xs break-all">
                  <span className="text-slate-500">ID:</span> {detailFetched.id}
                </p>
              </>
            ) : (
              <>
                {detailFetched.image_blob_id && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Image</p>
                    <BlobImage
                      blobId={detailFetched.image_blob_id}
                      source="api"
                      className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain"
                    />
                  </div>
                )}
                <p>
                  <span className="text-slate-500">Region:</span> {detailFetched.region}
                </p>
                <p>
                  <span className="text-slate-500">Address:</span> {detailFetched.address}
                </p>
                <p>
                  <span className="text-slate-500">Phone:</span> {detailFetched.phone_number}
                </p>
                <p>
                  <span className="text-slate-500">Status:</span> <StatusBadge status={detailFetched.status} />
                </p>
                <p className="font-mono text-xs break-all">
                  <span className="text-slate-500">ID:</span> {detailFetched.id}
                </p>
              </>
            )}
          </div>
        )}
      </DetailModal>

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse center request</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Optional reason for refusal.</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              placeholder="Reason…"
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
                disabled={voteBusyId === refuseModal.id}
                onClick={() => void submitRefuseVote()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Submit refusal
              </button>
            </div>
          </div>
        </div>
      )}

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
