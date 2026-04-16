'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import { formatVND, truncateAddress } from '@/src/lib/formatters';
import { donorService } from '@/src/services/donor.service';
import type { Donor } from '@/src/types/api.types';
import { HandCoins, Search, X } from 'lucide-react';

const PAGE_SIZE = 10;

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
      toast.error('Failed to load donors');
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
      toast.error('Failed to load donor detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (d: Donor) => <span className="font-mono text-xs">{truncateAddress(d.id, 6)}</span>,
    },
    {
      key: 'name',
      label: 'Name',
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
      label: 'Phone',
      render: (d: Donor) => d.phone_number || '-',
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (d: Donor) => <span className="capitalize">{d.gender || '-'}</span>,
    },
    {
      key: 'total_donation',
      label: 'Total Donated',
      render: (d: Donor) => (
        <span className="font-semibold text-emerald-700">{formatVND(d.total_donation)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Detail',
      render: (d: Donor) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void handleViewDetail(d.id); }}
          className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donors"
        description="View all registered donors and their contribution history"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <HandCoins className="h-3.5 w-3.5" />
            {totalAmount.toLocaleString('vi-VN')} total
          </span>
        }
      />

      <div className="mb-4 flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search donors..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
        emptyMessage="No donors found"
      />

      {/* Detail Modal */}
      {(selectedDonor || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Donor Detail</h3>
              <button onClick={() => setSelectedDonor(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              </div>
            ) : selectedDonor ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Name</p>
                    <p className="font-medium">{selectedDonor.first_name} {selectedDonor.last_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Gender</p>
                    <p className="capitalize">{selectedDonor.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p>{selectedDonor.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p>{selectedDonor.phone_number || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Total Donated</p>
                    <p className="text-xl font-bold text-emerald-700">{formatVND(selectedDonor.total_donation)}</p>
                  </div>
                </div>

                {selectedDonor.contributions?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Recent Contributions</h4>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {selectedDonor.contributions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs">
                          <div>
                            <span className="font-medium capitalize">{tx.action_type?.replace(/_/g, ' ')}</span>
                            <span className="ml-2 text-slate-400">{tx.pool_name}</span>
                          </div>
                          <span className="font-semibold text-emerald-700">{formatVND(tx.amount)}</span>
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
