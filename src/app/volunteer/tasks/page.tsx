'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { formatDate } from '@/src/lib/formatters';
import { taskService } from '@/src/services/task.service';
import { taskProofService } from '@/src/services/task-proof.service';
import { useAppSelector } from '@/src/store/hooks';
import type { Task } from '@/src/types/api.types';
import { Hand, Camera, X } from 'lucide-react';

const PAGE_SIZE = 20;

function normalizeStaffResponse(d: Task[] | import('@/src/types/api.types').PaginationResponse<Task[]>): Task[] {
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
}

export default function VolunteerTasksPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Task[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [mine, setMine] = useState<Task[]>([]);
  const [mineLoading, setMineLoading] = useState(false);

  const [proofOpen, setProofOpen] = useState(false);
  const [proofTaskId, setProofTaskId] = useState<string | null>(null);
  const [proofBlob, setProofBlob] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await taskService.list({ page: p, page_size: PAGE_SIZE, sort_order: 'desc' });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Không tải được nhiệm vụ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    const addr = user?.address?.trim();
    if (!addr) {
      setMine([]);
      return;
    }
    setMineLoading(true);
    try {
      const res = await taskService.listStaffByWallet(addr);
      setMine(normalizeStaffResponse(res.data));
    } catch {
      setMine([]);
    } finally {
      setMineLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const refresh = () => {
    void loadPage(page);
    void loadMine();
  };

  const handleClaim = async (id: string) => {
    setBusyId(id);
    try {
      await taskService.claim(id);
      toast.success('Đã nhận nhiệm vụ thành công');
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không nhận được nhiệm vụ');
    } finally {
      setBusyId(null);
    }
  };

  const openProof = (taskId: string) => {
    setProofTaskId(taskId);
    setProofBlob('');
    setProofOpen(true);
  };

  const submitProof = async () => {
    if (!proofTaskId || !proofBlob.trim()) {
      toast.error('Vui lòng chọn nhiệm vụ và tải ảnh bằng chứng');
      return;
    }
    setProofSubmitting(true);
    try {
      await taskProofService.submit(proofTaskId, proofBlob.trim());
      toast.success('Đã gửi bằng chứng');
      setProofOpen(false);
      setProofTaskId(null);
      setProofBlob('');
      refresh();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Gửi thất bại');
    } finally {
      setProofSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Nhiệm vụ"
        description="Nhận nhiệm vụ đang mở và gửi ảnh bằng chứng phúc lợi khi hoàn thành (luồng cập nhật trên mobile)"
      />

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Phân công của tôi</h2>
        <p className="mb-3 text-sm text-slate-600">
          Nhiệm vụ gán cho ví của bạn — gửi ảnh bằng chứng sau mỗi lượt thăm. Lịch sử đầy đủ và nhập ID nhiệm vụ thủ
          công:{' '}
          <Link href="/volunteer/task-proofs" className="font-medium text-blue-800 hover:underline">
            Bằng chứng nhiệm vụ
          </Link>
          .
        </p>
        <DataTable<Task>
          columns={[
            {
              key: 'description',
              label: 'Mô tả',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'region', label: 'Vùng' },
            { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'end_period', label: 'Hạn', render: (r) => formatDate(r.end_period) },
            {
              key: 'proof',
              label: 'Bằng chứng',
              render: (r) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProof(r.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900"
                >
                  <Camera className="h-3 w-3" /> Gửi bằng chứng
                </button>
              ),
            },
          ]}
          data={mine}
          loading={mineLoading}
          page={0}
          totalPages={1}
          onPageChange={() => {}}
          emptyMessage={user?.address ? 'Chưa có nhiệm vụ nào được gán cho bạn. Hãy nhận một nhiệm vụ bên dưới.' : 'Đăng nhập để xem phân công.'}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Duyệt &amp; nhận</h2>
        <DataTable<Task>
        columns={[
          {
            key: 'description',
            label: 'Mô tả',
            render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
          },
          { key: 'region', label: 'Vùng' },
          { key: 'start_period', label: 'Bắt đầu', render: (r) => formatDate(r.start_period) },
          { key: 'end_period', label: 'Kết thúc', render: (r) => formatDate(r.end_period) },
          { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'assigned_staff',
            label: 'Người được gán',
            render: (r) => (r.assigned_staff ? <CopyableTruncated value={r.assigned_staff} /> : <span className="text-slate-400">Chưa gán</span>),
          },
          { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
          {
            key: 'actions',
            label: 'Thao tác',
            render: (r) => {
              const s = r.status?.toLowerCase();
              const isAssigned = !!r.assigned_staff;
              if (isAssigned || (s !== 'pending' && s !== 'open')) {
                return <span className="text-xs text-slate-400">—</span>;
              }
              return (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={(e) => { e.stopPropagation(); void handleClaim(r.id); }}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                >
                  <Hand className="h-3 w-3" /> Nhận
                </button>
              );
            },
          },
        ]}
        data={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Chưa có nhiệm vụ"
      />
      </section>

      {proofOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Gửi bằng chứng nhiệm vụ</h3>
              <button
                type="button"
                onClick={() => setProofOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              Nhiệm vụ: {proofTaskId ? <CopyableTruncated value={proofTaskId} chars={8} /> : '—'}
            </p>
            <FileUploadInput label="Ảnh bằng chứng (blob Walrus)" value={proofBlob} onChange={setProofBlob} accept="image/*" />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProofOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={proofSubmitting || !proofBlob.trim()}
                onClick={() => void submitProof()}
                className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {proofSubmitting ? 'Đang gửi…' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
