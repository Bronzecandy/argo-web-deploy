'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import { formatInteger, formatVND, formatDateTime } from '@/src/lib/formatters';
import { donorService } from '@/src/services/donor.service';
import type { Donor } from '@/src/types/api.types';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import ExpandableImage from '@/src/components/ui/ExpandableImage';
import { HandCoins, Search, X, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 20;

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [keyword, setKeyword] = useState('');

  // Detail modal
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
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
    setDetailLoading(true);
    try {
      const res = await donorService.getById(id);
      setSelectedDonor(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Không tải được chi tiết nhà hảo tâm');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Họ tên',
      render: (d: Donor) => (
        <span className="font-medium">{d.first_name} {d.last_name}</span>
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void handleViewDetail(d.id); }}
          className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50"
        >
          Xem
        </button>
      ),
    },
  ];

  return (
    <div>
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

      <div className="mb-4 flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm nhà hảo tâm…"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={donors}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Không tìm thấy nhà hảo tâm"
      />

      {/* Detail Modal */}
      {(selectedDonor || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Chi tiết nhà hảo tâm</h3>
              <button onClick={() => setSelectedDonor(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
              </div>
            ) : selectedDonor ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  {selectedDonor.url ? (
                    <ExpandableImage
                      src={selectedDonor.url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : null}
                  <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <p className="text-slate-500">Tên hiển thị / NFT</p>
                      <p className="font-medium">
                        {selectedDonor.name?.trim() || `${selectedDonor.first_name} ${selectedDonor.last_name}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Họ tên</p>
                      <p className="font-medium">
                        {selectedDonor.first_name} {selectedDonor.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Giới tính</p>
                      <p className="capitalize">{selectedDonor.gender || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="break-all">{selectedDonor.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Điện thoại</p>
                      <p>{selectedDonor.phone_number || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500">ID nhà hảo tâm (on-chain)</p>
                      <CopyableTruncated value={selectedDonor.id} chars={8} />
                    </div>
                    {selectedDonor.owner?.trim() ? (
                      <div className="col-span-2 space-y-2">
                        <p className="text-slate-500">Ví chủ sở hữu (owner)</p>
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
                    ) : null}
                    <div className="col-span-2">
                      <p className="text-slate-500">Tổng đã quyên góp</p>
                      <p className="text-xl font-bold text-blue-900">{formatVND(selectedDonor.total_donation)}</p>
                    </div>
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
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
