'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { regionService } from '@/src/services/region.service';
import type { SupportedRegionSuggestion } from '@/src/types/api.types';

const PAGE_SIZE = 20;

/** Theo Swagger: status ví dụ "Pending", "Approved", "Refused" — chuẩn hóa so sánh */
function isPendingReview(status?: string) {
  const s = (status || '').toLowerCase();
  return s === '' || s === 'pending' || s === 'pending_review';
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export default function AdminRegionsPage() {
  const [page, setPage] = useState(0);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [createdByDraft, setCreatedByDraft] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [appliedCreatedBy, setAppliedCreatedBy] = useState('');
  const [rows, setRows] = useState<SupportedRegionSuggestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<SupportedRegionSuggestion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await regionService.adminListSuggestions({
        page,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
        keyword: appliedKeyword.trim() || undefined,
        created_by: appliedCreatedBy.trim() || undefined,
      });
      const raw = res.data.data;
      const list = Array.isArray(raw) ? (raw as SupportedRegionSuggestion[]) : [];
      setRows(list);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Không tải được danh sách đề xuất'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, appliedKeyword, appliedCreatedBy]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailId) {
      setDetailRow(null);
      return;
    }
    setDetailLoading(true);
    void regionService
      .getSuggestionById(detailId)
      .then((res) => setDetailRow(res.data))
      .catch(() => setDetailRow(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  const refresh = () => void load();

  const handleApprove = async (id: string) => {
    try {
      await regionService.reviewSuggestion(id, { is_vote_yes: true });
      toast.success('Đã đồng ý đề xuất');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Duyệt thất bại'));
    }
  };

  const handleRefuse = (id: string) => {
    setRefuseModal({ id });
    setRefuseReason('');
  };

  const submitRefuse = async () => {
    if (!refuseModal) return;
    if (!refuseReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await regionService.reviewSuggestion(refuseModal.id, {
        is_vote_yes: false,
        refuse_reason: refuseReason.trim(),
      });
      toast.success('Đã từ chối đề xuất');
      setRefuseModal(null);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Từ chối thất bại'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu hỗ trợ vùng"
        description="Xem và duyệt đề xuất vùng cần hỗ trợ từ cộng đồng / Local Leader"
      />

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Danh sách: <code className="rounded bg-white px-1">GET /regions/admin/supported-suggestions</code> — phản hồi phân trang gồm{' '}
        <code className="rounded bg-white px-1">data</code>, <code className="rounded bg-white px-1">amount</code>,{' '}
        <code className="rounded bg-white px-1">page</code>, <code className="rounded bg-white px-1">total_pages</code>. Duyệt:{' '}
        <code className="rounded bg-white px-1">POST /regions/supported-suggestions/{'{id}'}/review</code> với body{' '}
        <code className="rounded bg-white px-1">VoteRequest</code> (<code className="rounded bg-white px-1">is_vote_yes</code>,{' '}
        <code className="rounded bg-white px-1">refuse_reason</code>).
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Từ khóa (keyword)</label>
            <input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              placeholder="Tìm theo nội dung / vùng…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Người tạo (created_by)</label>
            <input
              value={createdByDraft}
              onChange={(e) => setCreatedByDraft(e.target.value)}
              placeholder="Địa chỉ ví đầy đủ"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAppliedKeyword(keywordDraft);
                setAppliedCreatedBy(createdByDraft);
                setPage(0);
              }}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={() => {
                setKeywordDraft('');
                setCreatedByDraft('');
                setAppliedKeyword('');
                setAppliedCreatedBy('');
                setPage(0);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      <DataTable<SupportedRegionSuggestion>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Không có đề xuất nào"
        columns={[
          { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 6)}</span> },
          { key: 'region', label: 'Vùng' },
          { key: 'content', label: 'Nội dung', render: (r) => <span className="max-w-md truncate">{r.content || '-'}</span> },
          {
            key: 'status',
            label: 'Trạng thái',
            render: (r) => <StatusBadge status={r.status || 'pending'} />,
          },
          { key: 'created_by', label: 'Người tạo', render: (r) => truncateAddress(r.created_by) },
          { key: 'reviewed_by', label: 'Người duyệt', render: (r) => (r.reviewed_by ? truncateAddress(r.reviewed_by) : '-') },
          { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
          {
            key: 'detail_btn',
            label: 'Chi tiết',
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
          {
            key: 'actions',
            label: 'Thao tác',
            className: 'whitespace-nowrap',
            render: (r) => {
              const can = isPendingReview(r.status);
              return (
                <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={!can}
                    onClick={() => void handleApprove(r.id)}
                    className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Đồng ý
                  </button>
                  <button
                    type="button"
                    disabled={!can}
                    onClick={() => handleRefuse(r.id)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Từ chối
                  </button>
                </div>
              );
            },
          },
        ]}
      />

      <DetailModal
        title="Đề xuất vùng"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailRow && (
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs break-all">{detailRow.id}</p>
            <p>
              <span className="text-slate-500">Vùng:</span> {detailRow.region}
            </p>
            <p>
              <span className="text-slate-500">Nội dung:</span> {detailRow.content}
            </p>
            <p>
              <span className="text-slate-500">Người tạo:</span> {truncateAddress(detailRow.created_by)}
            </p>
            <p>
              <span className="text-slate-500">Trạng thái:</span> <StatusBadge status={detailRow.status || 'pending'} />
            </p>
            <p>
              <span className="text-slate-500">Ngày tạo:</span> {formatDate(detailRow.created_at)}
            </p>
          </div>
        )}
      </DetailModal>

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Từ chối đề xuất</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Nhập lý do từ chối (trường refuse_reason trong VoteRequest).</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              placeholder="Lý do…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void submitRefuse()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <Check className="h-4 w-4" />
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
