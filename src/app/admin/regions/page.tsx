'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { regionService } from '@/src/services/region.service';
import type { SupportedRegionSuggestion } from '@/src/types/api.types';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminRegionsPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<SupportedRegionSuggestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await regionService.adminListSuggestions({
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
        sort_order: 'desc',
      });
      setRows(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load region suggestions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => void load();

  const handleReview = async (id: string, isVoteYes: boolean) => {
    let refuseReason: string | undefined;
    if (!isVoteYes) {
      const reason = window.prompt('Refuse reason');
      if (reason === null) return;
      if (!reason.trim()) {
        toast.error('Refuse reason is required');
        return;
      }
      refuseReason = reason.trim();
    }
    try {
      await regionService.reviewSuggestion(id, { is_vote_yes: isVoteYes, refuse_reason: refuseReason });
      toast.success(isVoteYes ? 'Suggestion approved' : 'Suggestion refused');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Review failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Region suggestions"
        description="Review community suggestions for supported regions"
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable<SupportedRegionSuggestion>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No region suggestions match your filters"
        columns={[
          { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
          { key: 'region', label: 'Region' },
          { key: 'content', label: 'Content', render: (r) => <span className="max-w-md truncate">{r.content || '-'}</span> },
          {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusBadge status={r.status || 'pending'} />,
          },
          { key: 'created_by', label: 'Created by', render: (r) => truncateAddress(r.created_by) },
          { key: 'reviewed_by', label: 'Reviewed by', render: (r) => (r.reviewed_by ? truncateAddress(r.reviewed_by) : '-') },
          { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          {
            key: 'actions',
            label: 'Actions',
            className: 'whitespace-nowrap',
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleReview(r.id, true);
                  }}
                  className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleReview(r.id, false);
                  }}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Refuse
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
