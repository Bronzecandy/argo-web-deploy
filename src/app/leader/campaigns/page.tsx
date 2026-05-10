'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAppSelector } from '@/src/store/hooks';
import { pendingSpecialNeedsService } from '@/src/services/pending-special-needs.service';
import { childrenService } from '@/src/services/children.service';
import type { CreateSpecialNeedProposalRequest, PendingSpecialNeedProposal } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function LeaderCampaignsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PendingSpecialNeedProposal[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [proofBlobId, setProofBlobId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<PendingSpecialNeedProposal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await pendingSpecialNeedsService.list({
        page: p,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
      });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Không tải được chiến dịch nhu cầu đặc biệt');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  useEffect(() => {
    if (!detailId) {
      setDetailRow(null);
      return;
    }
    setDetailLoading(true);
    void pendingSpecialNeedsService
      .getById(detailId)
      .then((res) => setDetailRow(res.data))
      .catch(() => setDetailRow(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = Number(target);
    if (!childId.trim() || !description.trim() || !Number.isFinite(targetNum) || targetNum <= 0) {
      toast.error('Vui lòng nhập mã trẻ, mô tả và số tiền mục tiêu hợp lệ');
      return;
    }
    const data: CreateSpecialNeedProposalRequest = {
      child_id: childId.trim(),
      description: description.trim(),
      target: targetNum,
      ...(proofBlobId.trim() ? { proof_blob_id: proofBlobId.trim() } : {}),
    };
    setSubmitting(true);
    try {
      await childrenService.createSpecialNeedProposal(data);
      toast.success('Đã tạo đề xuất nhu cầu đặc biệt');
      setChildId('');
      setDescription('');
      setTarget('');
      setProofBlobId('');
      setCreateOpen(false);
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Không tạo được đề xuất');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chiến dịch nhu cầu đặc biệt"
        description={
          user?.address
            ? `Duyệt đề xuất đang chờ và gửi đề xuất nhu cầu đặc biệt khẩn cấp · ${truncateAddress(user.address)}`
            : 'Duyệt đề xuất đang chờ và gửi đề xuất nhu cầu đặc biệt khẩn cấp'
        }
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Tạo đề xuất
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nhu cầu đặc biệt đang chờ</h2>
        <DataTable<PendingSpecialNeedProposal>
          columns={[
            { key: 'child_id', label: 'Trẻ', render: (r) => <CopyableTruncated value={r.child_id} chars={4} /> },
            {
              key: 'description',
              label: 'Mô tả',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'target', label: 'Mục tiêu', render: (r) => formatVND(r.target) },
            { key: 'region', label: 'Vùng' },
            { key: 'review_status', label: 'Duyệt', render: (r) => <StatusBadge status={r.review_status} /> },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'details',
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
          emptyMessage="Không có nhu cầu đặc biệt đang chờ"
        />
      </section>

      <DetailModal
        title="Đề xuất nhu cầu đặc biệt"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailRow && (
          <div className="space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Mã:</span> <CopyableTruncated value={detailRow.id} chars={4} />
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Trẻ:</span> <CopyableTruncated value={detailRow.child_id} chars={4} />
            </p>
            <p>
              <span className="text-slate-500">Vùng:</span> {detailRow.region}
            </p>
            <p>
              <span className="text-slate-500">Mô tả:</span> {detailRow.description}
            </p>
            <p>
              <span className="text-slate-500">Mục tiêu:</span> {formatVND(detailRow.target)}
            </p>
            {detailRow.proof_blob_id && (
              <BlobImage blobId={detailRow.proof_blob_id} className="max-h-56 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Tạo đề xuất nhu cầu đặc biệt</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
                  Mã trẻ
                </label>
                <input
                  id="child_id"
                  type="text"
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <div>
                <label htmlFor="desc" className="mb-1 block text-xs font-medium text-slate-500">
                  Mô tả
                </label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <div>
                <label htmlFor="target" className="mb-1 block text-xs font-medium text-slate-500">
                  Mục tiêu (VND)
                </label>
                <GroupedNumericInput
                  id="target"
                  min={1}
                  value={target}
                  onChange={setTarget}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <FileUploadInput label="Ảnh chứng từ (tùy chọn)" value={proofBlobId} onChange={setProofBlobId} />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Đang gửi…' : 'Gửi đề xuất'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
