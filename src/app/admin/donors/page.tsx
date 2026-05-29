'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import ExpandableImage from '@/src/components/ui/ExpandableImage';
import { formatInteger, formatVND, formatDateTime } from '@/src/lib/formatters';
import { donorService } from '@/src/services/donor.service';
import type { Donor } from '@/src/types/api.types';
import { HandCoins, Search, ExternalLink } from 'lucide-react';
import { inputClass } from '@/src/lib/uiClasses';

const PAGE_SIZE = 20;

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [keyword, setKeyword] = useState('');

  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDonors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await donorService.list({
        page,
        page_size: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setDonors(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      setTotalAmount(res.data.amount ?? 0);
    } catch (e) {
      console.error(e);
      toast.error('Không tải được danh sách nhà hảo tâm');
      setDonors([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    void loadDonors();
  }, [loadDonors]);

  const handleViewDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedDonor(null);
    try {
      const res = await donorService.getById(id);
      setSelectedDonor(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không tải được chi tiết nhà hảo tâm');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Họ tên',
      render: (d: Donor) => (
        <span className="font-medium">
          {d.first_name} {d.last_name}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (d: Donor) => d.email || '-',
    },
    {
      key: 'phone_number',
      label: 'Điện thoại',
      render: (d: Donor) => d.phone_number || '-',
    },
    {
      key: 'gender',
      label: 'Giới tính',
      render: (d: Donor) => <span className="capitalize">{d.gender || '-'}</span>,
    },
    {
      key: 'total_donation',
      label: 'Tổng đã quyên góp',
      render: (d: Donor) => (
        <span className="font-semibold text-blue-900">{formatVND(d.total_donation)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Chi tiết',
      render: (d: Donor) => (
        <TableIconButton
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            void handleViewDetail(d.id);
          }}
        >
          Xem
        </TableIconButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhà hảo tâm"
        description="Xem tất cả nhà hảo tâm đã đăng ký và lịch sử đóng góp"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
            <HandCoins className="h-3.5 w-3.5" />
            {formatInteger(totalAmount)} tổng
          </span>
        }
      />

      <FilterToolbar>
        <div className="relative min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Tìm kiếm</label>
          <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.5rem)] h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm nhà hảo tâm…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(0);
            }}
            className={`${inputClass} pl-9`}
          />
        </div>
      </FilterToolbar>

      <PageSection title="Danh sách nhà hảo tâm" noPadding>
        <DataTable
          columns={columns}
          data={donors}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Không tìm thấy nhà hảo tâm"
        />
      </PageSection>

      <DetailModal
        title="Chi tiết nhà hảo tâm"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedDonor(null);
        }}
        loading={detailLoading}
        wide
      >
        {selectedDonor && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {selectedDonor.url ? (
                <ExpandableImage
                  src={selectedDonor.url}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <DetailField
                  label="Tên hiển thị / NFT"
                  value={
                    selectedDonor.name?.trim() ||
                    `${selectedDonor.first_name} ${selectedDonor.last_name}`
                  }
                />
                <DetailField
                  label="Họ tên"
                  value={`${selectedDonor.first_name} ${selectedDonor.last_name}`}
                />
                <DetailField label="Giới tính" value={<span className="capitalize">{selectedDonor.gender || '—'}</span>} />
                <DetailField label="Email" value={selectedDonor.email || '—'} />
                <DetailField label="Điện thoại" value={selectedDonor.phone_number || '—'} />
                <DetailField
                  label="ID nhà hảo tâm (on-chain)"
                  value={<CopyableTruncated value={selectedDonor.id} chars={8} />}
                />
                {selectedDonor.owner?.trim() ? (
                  <div className="border-b border-slate-100 py-2.5 last:border-0">
                    <div className="text-xs font-medium text-slate-500">Ví chủ sở hữu</div>
                    <div className="mt-0.5 space-y-2">
                      <CopyableTruncated value={selectedDonor.owner} chars={8} />
                      <a
                        href={`https://testnet.suivision.xyz/account/${encodeURIComponent(selectedDonor.owner.trim())}?tab=Assets`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        Kiểm tra on-chain (SuiVision)
                      </a>
                    </div>
                  </div>
                ) : null}
                <DetailField
                  label="Tổng đã quyên góp"
                  value={<span className="text-xl font-bold text-blue-900">{formatVND(selectedDonor.total_donation)}</span>}
                />
              </div>
            </div>

            {selectedDonor.supported_childs && selectedDonor.supported_childs.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  Trẻ được hỗ trợ ({selectedDonor.supported_childs.length})
                </h4>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                  {selectedDonor.supported_childs.map((childId) => (
                    <li key={childId}>
                      <CopyableTruncated value={childId} chars={10} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDonor.contributions?.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Lịch sử đóng góp gần đây</h4>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {selectedDonor.contributions.map((tx) => (
                    <div key={tx.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium capitalize">{tx.action_type?.replace(/_/g, ' ')}</span>
                            <span className="text-slate-500">{tx.pool_name}</span>
                            {tx.coin_type ? (
                              <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                {tx.coin_type}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(tx.created_at)}</p>
                          {tx.message?.trim() ? (
                            <p className="mt-1.5 text-slate-600">&quot;{tx.message}&quot;</p>
                          ) : null}
                          {tx.actor_address?.trim() ? (
                            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-slate-500">
                              <span className="shrink-0">Người thực hiện:</span>
                              <CopyableTruncated value={tx.actor_address} chars={6} />
                            </p>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                            <span>Mã giao dịch:</span>
                            <CopyableTruncated value={tx.id} chars={6} />
                          </div>
                        </div>
                        <span className="shrink-0 font-semibold text-blue-900">{formatVND(tx.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
