'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import RegisterCenterModal from '@/src/components/leader/RegisterCenterModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate } from '@/src/lib/formatters';
import { btnPrimary } from '@/src/lib/uiClasses';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import { useAppSelector } from '@/src/store/hooks';
import { centerService } from '@/src/services/center.service';
import { Plus } from 'lucide-react';
import type { SupportCenter } from '@/src/types/api.types';

const PAGE_SIZE = 20;

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

function normalizeCenterList(body: { data?: unknown }): SupportCenter[] {
  const raw = body.data;
  if (Array.isArray(raw)) return raw as SupportCenter[];
  if (raw && typeof raw === 'object') return [raw as SupportCenter];
  return [];
}

export default function LeaderCentersPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { refetch: refetchLeaderCenter } = useLeaderCenter();
  const [createOpen, setCreateOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<SupportCenter[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [centerDetailOpen, setCenterDetailOpen] = useState(false);
  const [centerDetailRow, setCenterDetailRow] = useState<SupportCenter | null>(null);

  const loadCenters = useCallback(async () => {
    const addr = user?.address;
    if (!addr) {
      setCenters([]);
      setTotalPages(1);
      return;
    }
    setLoading(true);
    try {
      const res = await centerService.getByWallet(addr, { page, page_size: PAGE_SIZE });
      setCenters(normalizeCenterList(res.data));
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Không tải được danh sách trung tâm'));
      setCenters([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  const columns = [
    { key: 'region', label: 'Vùng' },
    { key: 'center_address', label: 'Địa chỉ' },
    { key: 'center_phone_number', label: 'Điện thoại' },
    {
      key: 'uploaded_at',
      label: 'Ngày tải lên',
      render: (row: SupportCenter) => formatDate(row.uploaded_at),
    },
    {
      key: 'updated_at',
      label: 'Cập nhật',
      render: (row: SupportCenter) => formatDate(row.updated_at),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'whitespace-nowrap',
      render: (row: SupportCenter) => (
        <TableIconButton
          onClick={(e) => {
            e.stopPropagation();
            setCenterDetailRow(row);
            setCenterDetailOpen(true);
          }}
        >
          Chi tiết
        </TableIconButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trung tâm"
        description="Xem đăng ký trung tâm của bạn và gửi đăng ký mới"
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Tạo mới
          </button>
        }
      />

      {!user?.address ? (
        <PageSection>
          <p className="text-center text-sm text-slate-500">Kết nối ví để tải trung tâm của bạn.</p>
        </PageSection>
      ) : (
        <PageSection title="Danh sách trung tâm" noPadding>
          <DataTable<SupportCenter>
            columns={columns}
            data={centers}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="Chưa có đăng ký trung tâm"
          />
        </PageSection>
      )}

      <RegisterCenterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          void refetchLeaderCenter();
          void loadCenters();
        }}
      />

      <DetailModal
        title="Trung tâm hỗ trợ"
        open={centerDetailOpen}
        onClose={() => {
          setCenterDetailOpen(false);
          setCenterDetailRow(null);
        }}
        wide
      >
        {centerDetailRow &&
          (() => {
            const c = centerDetailRow;
            const blobs = collectBlobIdEntries(c);
            return (
              <div>
                <DetailField label="Mã" value={<span className="font-mono text-xs break-all">{c.id}</span>} />
                <DetailField label="Vùng" value={c.region} />
                <DetailField label="Địa chỉ" value={c.center_address} />
                <DetailField label="Điện thoại" value={c.center_phone_number} />
                <DetailField label="Ngày tải lên" value={formatDate(c.uploaded_at)} />
                <DetailField label="Cập nhật lúc" value={formatDate(c.updated_at)} />
                {blobs.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 text-xs font-medium text-slate-600">Hình ảnh</div>
                    <div className="flex flex-wrap gap-4">
                      {blobs.map(({ key, blobId }) => (
                        <div key={key} className="text-center">
                          <EntityBlobThumb blobId={blobId} source="walrus" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
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
