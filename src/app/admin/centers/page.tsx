'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Check, MapPin, ShieldCheck, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { centerService } from '@/src/services/center.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { CenterRequest } from '@/src/types/api.types';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
];

export default function AdminCentersPage() {
  const { execute } = useExecuteTransaction();
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterRequest[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [status, setStatus] = useState('');

  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [confirmBusyId, setConfirmBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const loadCenters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await centerService.list({
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
      });
      const body = res.data;
      setCenters(Array.isArray(body.data) ? body.data : []);
      setTotalAmount(typeof body.amount === 'number' ? body.amount : 0);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Failed to load centers');
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  async function handleVote(id: string, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id });
      setRefuseReason('');
      return;
    }
    setVoteBusyId(id);
    try {
      await centerService.vote(id, { is_vote_yes: true });
      toast.success('Vote recorded');
      await loadCenters();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Vote failed');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function submitRefuseVote() {
    if (!refuseModal) return;
    const id = refuseModal.id;
    setVoteBusyId(id);
    try {
      await centerService.vote(id, { is_vote_yes: false, refuse_reason: refuseReason || undefined });
      toast.success('Refusal recorded');
      setRefuseModal(null);
      await loadCenters();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Vote failed');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function handleConfirm(id: string) {
    setConfirmBusyId(id);
    const ok = await execute(
      () => centerService.confirm(id),
      { successMessage: 'Center confirmed & executed on-chain' },
    );
    if (ok) await loadCenters();
    setConfirmBusyId(null);
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Support centers"
        description="Review and confirm regional support centers"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <Building2 className="h-3.5 w-3.5" />
            {totalAmount.toLocaleString('vi-VN')} total
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <label htmlFor="center-status" className="text-sm text-slate-600">
            Status
          </label>
          <select
            id="center-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable<CenterRequest>
        columns={[
          { key: 'id', label: 'ID', render: (c) => <span className="font-mono text-xs">{truncateAddress(c.id, 8)}</span> },
          { key: 'region', label: 'Region' },
          {
            key: 'address',
            label: 'Address',
            render: (c) => (
              <span className="max-w-[220px] truncate text-slate-700" title={c.address}>
                {truncateAddress(c.address, 14)}
              </span>
            ),
          },
          { key: 'phone_number', label: 'Phone' },
          { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
          { key: 'created_at', label: 'Created', render: (c) => formatDate(c.created_at) },
          {
            key: 'actions',
            label: 'Actions',
            className: 'whitespace-nowrap',
            render: (c) => (
              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={voteBusyId === c.id}
                  onClick={() => handleVote(c.id, true)}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  title="Approve vote"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={voteBusyId === c.id}
                  onClick={() => handleVote(c.id, false)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  title="Refuse vote"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
                {c.isAvailableToConfirm && (
                  <button
                    type="button"
                    disabled={confirmBusyId === c.id}
                    onClick={() => handleConfirm(c.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Confirm
                  </button>
                )}
              </div>
            ),
          },
        ]}
        data={centers}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        emptyMessage="No centers match the selected status."
      />

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse center request</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Optional reason for refusal.</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
              placeholder="Reason…"
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
                disabled={voteBusyId === refuseModal.id}
                onClick={() => void submitRefuseVote()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Submit refusal
              </button>
            </div>
          </div>
        </div>
      )}

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
