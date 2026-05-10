'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAppSelector } from '@/src/store/hooks';
import { regionService } from '@/src/services/region.service';
import type { CreateSupportedRegionSuggestionRequest, SupportedRegionSuggestion } from '@/src/types/api.types';

const PAGE_SIZE = 20;

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function LeaderRegionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SupportedRegionSuggestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailListRow, setDetailListRow] = useState<SupportedRegionSuggestion | null>(null);
  const [detailData, setDetailData] = useState<SupportedRegionSuggestion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

  const loadPage = useCallback(
    async (p: number) => {
      const addr = user?.address || '';
      if (!addr) {
        setRows([]);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await regionService.listSuggestions({
          page: p,
          page_size: PAGE_SIZE,
          created_by: addr,
          sort_order: 'desc',
        });
        const raw = res.data.data;
        setRows(Array.isArray(raw) ? (raw as SupportedRegionSuggestion[]) : []);
        setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      } catch (e) {
        console.error(e);
        toast.error('Không tải được đề xuất vùng được hỗ trợ của bạn');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [user?.address],
  );

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  useEffect(() => {
    if (!detailOpen || !detailId) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    setDetailData(null);
    void regionService
      .getSuggestionById(detailId)
      .then((res) => setDetailData(res.data ?? null))
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  }, [detailOpen, detailId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim() || !content.trim()) {
      toast.error('Vui lòng nhập cả vùng và nội dung');
      return;
    }
    const payload: CreateSupportedRegionSuggestionRequest = {
      region: region.trim(),
      content: content.trim(),
    };
    setSubmitting(true);
    try {
      await regionService.createSuggestion(payload);
      toast.success('Đã tạo đề xuất vùng được hỗ trợ');
      setRegion('');
      setContent('');
      setProposeOpen(false);
      setPage(0);
      void loadPage(0);
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Gửi đề xuất thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đề xuất vùng được hỗ trợ"
        description={
          user?.address
            ? `Gửi và theo dõi đề xuất · ${truncateAddress(user.address)}`
            : 'Đăng nhập để gửi và xem danh sách đề xuất'
        }
        actions={
          <button
            type="button"
            onClick={() => setProposeOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Đề xuất mới
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Đề xuất của tôi</h2>
        {!user?.address && (
          <p className="mb-4 text-sm text-amber-700">Kết nối ví để tải danh sách.</p>
        )}
        <DataTable<SupportedRegionSuggestion>
          columns={[
            { key: 'region', label: 'Vùng' },
            {
              key: 'content',
              label: 'Nội dung',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.content}</span>,
            },
            { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status || 'pending'} /> },
            {
              key: 'created_by',
              label: 'Người tạo',
              render: (r) => <CopyableTruncated value={r.created_by} />,
            },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'detail',
              label: 'Chi tiết',
              className: 'whitespace-nowrap',
              render: (r) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailListRow(r);
                    setDetailId(r.id);
                    setDetailOpen(true);
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Chi tiết
                </button>
              ),
            },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Chưa có đề xuất"
        />
      </section>

      {proposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Tạo đề xuất vùng được hỗ trợ</h2>
              <button
                type="button"
                onClick={() => setProposeOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Nhập <strong>vùng</strong> và <strong>nội dung</strong> giải thích vì sao khu vực này cần được hỗ trợ.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="region" className="mb-1 block text-xs font-medium text-slate-500">
                  Vùng
                </label>
                <input
                  id="region"
                  list="region-options"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                  placeholder="Chọn từ danh sách hoặc nhập tên vùng mới"
                />
                <datalist id="region-options">
                  {regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="content" className="mb-1 block text-xs font-medium text-slate-500">
                  Nội dung
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                  placeholder="Lý do vùng hoặc cộng đồng này cần được hỗ trợ…"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Đang gửi…' : 'Gửi'}
              </button>
            </form>
          </div>
        </div>
      )}

      <DetailModal
        title="Đề xuất vùng được hỗ trợ"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
          setDetailListRow(null);
        }}
        loading={detailLoading}
        wide
      >
        {(() => {
          const r = detailData ?? detailListRow;
          if (!r) return null;
          const blobs = collectBlobIdEntries(r);
          return (
            <div className="space-y-1">
              {detailField('Mã', <CopyableTruncated value={r.id} chars={6} />)}
              {detailField('Mã hồ sơ', <CopyableTruncated value={r.profile_id} chars={6} />)}
              {detailField('Vùng', r.region)}
              {detailField('Nội dung', r.content)}
              {detailField('Trạng thái', <StatusBadge status={r.status || 'pending'} />)}
              {detailField('Người tạo', <CopyableTruncated value={r.created_by} />)}
              {detailField('Người duyệt', r.reviewed_by ? <CopyableTruncated value={r.reviewed_by} /> : '—')}
              {detailField('Ngày tạo', formatDate(r.created_at))}
              {detailField('Cập nhật', formatDate(r.updated_at))}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Hình ảnh</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                        <div className="mt-1 text-[10px] text-slate-500">{blobFieldDisplayLabel(key)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </DetailModal>
    </div>
  );
}
