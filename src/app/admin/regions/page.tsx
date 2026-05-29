'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { btnPrimary, btnSecondary, inputClass } from '@/src/lib/uiClasses';
import { formatDate } from '@/src/lib/formatters';
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
        title="Đề xuất vùng được hỗ trợ (quản trị)"
        description="Xem đề xuất từ trưởng vùng — phê duyệt hoặc từ chối (có thể kèm lý do)."
      />

      <FilterToolbar>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Từ khóa</label>
          <input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            placeholder="Tìm vùng hoặc nội dung…"
            className={inputClass}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Người tạo (địa chỉ ví)</label>
          <input
            value={createdByDraft}
            onChange={(e) => setCreatedByDraft(e.target.value)}
            placeholder="Địa chỉ ví"
            className={`${inputClass} font-mono text-xs`}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAppliedKeyword(keywordDraft);
              setAppliedCreatedBy(createdByDraft);
              setPage(0);
            }}
            className={btnPrimary}
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
            className={btnSecondary}
          >
            Xóa bộ lọc
          </button>
        </div>
      </FilterToolbar>

      <PageSection title="Danh sách đề xuất" noPadding>
      <DataTable<SupportedRegionSuggestion>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Không có đề xuất"
        columns={[
          { key: 'region', label: 'Vùng' },
          { key: 'content', label: 'Nội dung', render: (r) => <span className="max-w-md truncate">{r.content || '-'}</span> },
          {
            key: 'status',
            label: 'Trạng thái',
            render: (r) => <StatusBadge status={r.status || 'pending'} />,
          },
          { key: 'created_by', label: 'Người tạo', render: (r) => <CopyableTruncated value={r.created_by} chars={6} /> },
          {
            key: 'reviewed_by',
            label: 'Người duyệt',
            render: (r) => (r.reviewed_by ? <CopyableTruncated value={r.reviewed_by} chars={6} /> : <span className="text-slate-400">—</span>),
          },
          { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
          {
            key: 'detail_btn',
            label: 'Chi tiết',
            render: (r) => (
              <TableIconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailId(r.id);
                }}
              >
                Chi tiết
              </TableIconButton>
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
                  <TableIconButton variant="primary" disabled={!can} onClick={() => void handleApprove(r.id)}>
                    Phê duyệt
                  </TableIconButton>
                  <TableIconButton variant="danger" disabled={!can} onClick={() => handleRefuse(r.id)}>
                    Từ chối
                  </TableIconButton>
                </div>
              );
            },
          },
        ]}
      />
      </PageSection>

      <DetailModal
        title="Đề xuất vùng được hỗ trợ"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {(() => {
          const r = detailRow ?? (detailId ? (rows.find((x) => x.id === detailId) ?? null) : null);
          if (!r) return null;
          return (
            <div>
              <DetailField label="Mã" value={<CopyableTruncated value={r.id} chars={6} />} />
              <DetailField label="Vùng" value={r.region} />
              <DetailField label="Nội dung" value={r.content} />
              <DetailField label="Người tạo" value={<CopyableTruncated value={r.created_by} chars={6} />} />
              <DetailField label="Trạng thái" value={<StatusBadge status={r.status || 'pending'} />} />
              <DetailField label="Ngày tạo" value={formatDate(r.created_at)} />
            </div>
          );
        })()}
      </DetailModal>

      <FormModal
        open={refuseModal !== null}
        onClose={() => setRefuseModal(null)}
        title="Từ chối đề xuất"
        submitLabel="Xác nhận từ chối"
        submitVariant="danger"
        onSubmit={() => void submitRefuse()}
      >
        <p className="mb-2 text-sm text-slate-600">Khi từ chối, bạn cần nhập lý do.</p>
        <textarea
          value={refuseReason}
          onChange={(e) => setRefuseReason(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Lý do…"
        />
      </FormModal>
    </div>
  );
}
