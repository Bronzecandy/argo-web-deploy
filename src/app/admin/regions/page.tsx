'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
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

  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

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

  const handleApprove = async (id: string) => {
    try {
      await regionService.reviewSuggestion(id, { is_vote_yes: true });
      toast.success('Suggestion approved');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Review failed');
    }
  };

  const handleRefuse = (id: string) => {
    setRefuseModal({ id });
    setRefuseReason('');
  };

  const submitRefuse = async () => {
    if (!refuseModal) return;
    if (!refuseReason.trim()) {
      toast.error('Refuse reason is required');
      return;
    }
    try {
      await regionService.reviewSuggestion(refuseModal.id, {
        is_vote_yes: false,
        refuse_reason: refuseReason.trim(),
      });
      toast.success('Suggestion refused');
      setRefuseModal(null);
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
                  onClick={(e) => { e.stopPropagation(); void handleApprove(r.id); }}
                  className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRefuse(r.id); }}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Refuse
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Refuse reason modal */}
      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse region suggestion</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Please provide a reason for refusing this suggestion.</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
              placeholder="Reason for refusal…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRefuse()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <Check className="h-4 w-4" />
                Submit refusal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
