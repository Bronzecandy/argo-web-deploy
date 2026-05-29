'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import BlobImage from '@/src/components/ui/BlobImage';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import AiEvaluationBadge from '@/src/components/ui/AiEvaluationBadge';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { btnPrimary, inputClass } from '@/src/lib/uiClasses';
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

  const handleCreateProposal = async () => {
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
    <div className="space-y-6">
      <PageHeader
        title="Chiến dịch nhu cầu đặc biệt"
        description={
          user?.address
            ? `Duyệt đề xuất đang chờ và gửi đề xuất nhu cầu đặc biệt khẩn cấp · ${truncateAddress(user.address)}`
            : 'Duyệt đề xuất đang chờ và gửi đề xuất nhu cầu đặc biệt khẩn cấp'
        }
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Tạo đề xuất
          </button>
        }
      />

      <PageSection title="Nhu cầu đặc biệt đang chờ" noPadding>
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
            {
              key: 'ai_evaluation',
              label: 'AI',
              render: (r) => <AiEvaluationBadge record={r} />,
            },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            {
              key: 'details',
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
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Không có nhu cầu đặc biệt đang chờ"
        />
      </PageSection>

      <DetailModal
        title="Đề xuất nhu cầu đặc biệt"
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        loading={detailLoading}
        wide
      >
        {detailRow && (
          <div>
            <DetailField label="Mã" value={<CopyableTruncated value={detailRow.id} chars={4} />} />
            <DetailField label="Trẻ" value={<CopyableTruncated value={detailRow.child_id} chars={4} />} />
            <DetailField label="Vùng" value={detailRow.region} />
            <DetailField label="Mô tả" value={detailRow.description} />
            <DetailField label="Mục tiêu" value={formatVND(detailRow.target)} />
            <AiInsightPanel record={detailRow} className="my-4" />
            {detailRow.proof_blob_id && (
              <BlobImage blobId={detailRow.proof_blob_id} className="max-h-56 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo đề xuất nhu cầu đặc biệt"
        submitLabel={submitting ? 'Đang gửi…' : 'Gửi đề xuất'}
        submitDisabled={submitting}
        onSubmit={() => void handleCreateProposal()}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="child_id" className="mb-1 block text-xs font-medium text-slate-500">
              Mã trẻ
            </label>
            <input
              id="child_id"
              type="text"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className={inputClass}
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
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="target" className="mb-1 block text-xs font-medium text-slate-500">
              Mục tiêu (VND)
            </label>
            <GroupedNumericInput id="target" min={1} value={target} onChange={setTarget} className={inputClass} />
          </div>
          <FileUploadInput label="Ảnh chứng từ (tùy chọn)" value={proofBlobId} onChange={setProofBlobId} />
        </div>
      </FormModal>
    </div>
  );
}
