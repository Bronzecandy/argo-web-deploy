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

/** Pending review: empty, `pending`, or `pending_review` (case-insensitive). */
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
      toast.error(getErrorMessage(e, 'Không tải được đề xuất vùng được hỗ trợ'));
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
      .then((res) => setDetailRow(res.data ?? null))
      .catch(() => setDetailRow(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  const refresh = () => void load();

  const handleApprove = async (id: string) => {
    try {
      await regionService.reviewSuggestion(id, { is_vote_yes: true });
      toast.success('Đã phê duyệt đề xuất');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Phê duyệt thất bại'));
    }
  };

  const handleRefuse = (id: string) => {
    setRefuseModal({ id });
    setRefuseReason('');
  };

  const submitRefuse = async () => {
    if (!refuseModal) return;
    if (!refuseReason.trim()) {
      toast.error('Please enter a refuse reason');
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
        title="Supported region suggestions (admin)"
        description="Review suggestions from local leaders — approve or refuse with an optional reason."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">keyword</label>
            <input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              placeholder="Search region or content…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">created_by</label>
            <input
              value={createdByDraft}
              onChange={(e) => setCreatedByDraft(e.target.value)}
              placeholder="Wallet address"
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
              Search
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
              Clear filters
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
        emptyMessage="No suggestions"
        columns={[
          { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 6)}</span> },
          { key: 'region', label: 'region' },
          { key: 'content', label: 'content', render: (r) => <span className="max-w-md truncate">{r.content || '-'}</span> },
          {
            key: 'status',
            label: 'status',
            render: (r) => <StatusBadge status={r.status || 'pending'} />,
          },
          { key: 'created_by', label: 'created_by', render: (r) => truncateAddress(r.created_by) },
          { key: 'reviewed_by', label: 'reviewed_by', render: (r) => (r.reviewed_by ? truncateAddress(r.reviewed_by) : '-') },
          { key: 'created_at', label: 'created_at', render: (r) => formatDate(r.created_at) },
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
            label: 'Actions',
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
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!can}
                    onClick={() => handleRefuse(r.id)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Refuse
                  </button>
                </div>
              );
            },
          },
        ]}
      />

      <DetailModal
        title="Supported region suggestion"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {(() => {
          const r = detailRow ?? (detailId ? (rows.find((x) => x.id === detailId) ?? null) : null);
          if (!r) return null;
          return (
            <div className="space-y-2 text-sm">
              <p className="font-mono text-xs break-all">{r.id}</p>
              <p>
                <span className="text-slate-500">region:</span> {r.region}
              </p>
              <p>
                <span className="text-slate-500">content:</span> {r.content}
              </p>
              <p>
                <span className="text-slate-500">created_by:</span> {truncateAddress(r.created_by)}
              </p>
              <p>
                <span className="text-slate-500">status:</span> <StatusBadge status={r.status || 'pending'} />
              </p>
              <p>
                <span className="text-slate-500">created_at:</span> {formatDate(r.created_at)}
              </p>
            </div>
          );
        })()}
      </DetailModal>

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse suggestion</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">A reason is required when refusing a suggestion.</p>
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
                onClick={() => void submitRefuse()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <Check className="h-4 w-4" />
                Confirm refuse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
