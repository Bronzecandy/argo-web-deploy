'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { formatDate } from '@/src/lib/formatters';
import { taskProofService } from '@/src/services/task-proof.service';
import { blobService } from '@/src/services/blob.service';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import type { TaskProof } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function VolunteerTaskProofsPage() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<TaskProof[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [taskId, setTaskId] = useState('');
  const [imageBlobId, setImageBlobId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await taskProofService.list({ page: p, page_size: PAGE_SIZE, sort_order: 'desc' });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Không tải được bằng chứng nhiệm vụ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId.trim() || !imageBlobId.trim()) {
      toast.error('Vui lòng nhập ID nhiệm vụ và ảnh bằng chứng');
      return;
    }
    setSubmitting(true);
    try {
      await taskProofService.submit(taskId.trim(), imageBlobId.trim());
      toast.success('Đã gửi bằng chứng');
      setTaskId('');
      setImageBlobId('');
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không gửi được bằng chứng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bằng chứng nhiệm vụ"
        description="Gửi bằng chứng hoàn thành nhiệm vụ và theo dõi các lần gửi"
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Gửi bằng chứng mới</h2>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="vol-task-id" className="mb-1 block text-xs font-medium text-slate-500">
              ID nhiệm vụ
            </label>
            <input
              id="vol-task-id"
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
              placeholder="Nhập ID nhiệm vụ bạn đã hoàn thành"
            />
          </div>
          <FileUploadInput
            label="Ảnh bằng chứng"
            value={imageBlobId}
            onChange={setImageBlobId}
            accept="image/*"
            placeholder="Tải ảnh bằng chứng hoặc dán ID blob"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi bằng chứng'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Bằng chứng của tôi</h2>
        <DataTable<TaskProof>
          columns={[
            {
              key: 'task_id',
              label: 'Nhiệm vụ',
              render: (r) => (r.task_id ? <CopyableTruncated value={r.task_id} chars={4} /> : '-'),
            },
            {
              key: 'image_blob_id',
              label: 'Ảnh',
              render: (r) => {
                const url = blobService.getUrl(r.image_blob_id);
                if (!url) return '-';
                return (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block" onClick={(e) => e.stopPropagation()}>
                    <WalrusFallbackImg blobId={r.image_blob_id} className="h-12 w-12 rounded-md border border-slate-200 object-cover" />
                  </a>
                );
              },
            },
            { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.review_status ?? r.status ?? '—'} /> },
            {
              key: 'ai_evaluation',
              label: 'Đánh giá AI',
              render: (r) => (
                <span className="max-w-[200px] truncate text-slate-600" title={r.ai_evaluation}>
                  {r.ai_evaluation ?? '—'}
                </span>
              ),
            },
            { key: 'reviewed_by', label: 'Người duyệt', render: (r) => (r.reviewed_by ? <CopyableTruncated value={r.reviewed_by} /> : '-') },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Chưa có bằng chứng nào được gửi"
        />
      </section>
    </div>
  );
}
