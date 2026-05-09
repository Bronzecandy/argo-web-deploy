'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import BlobImage from '@/src/components/ui/BlobImage';
import DetailModal from '@/src/components/ui/DetailModal';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { centerService } from '@/src/services/center.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { CenterRequest } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function VolunteerCenterRequestsPage() {
  const { execute } = useExecuteTransaction();
  const [rows, setRows] = useState<CenterRequest[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [voteBusy, setVoteBusy] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [detail, setDetail] = useState<CenterRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await centerService.listCenterRequests({
        page,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
      });
      setRows((res.data.data ?? []) as CenterRequest[]);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch {
      toast.error('Failed to load center requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const voteYes = async (id: string) => {
    setVoteBusy(id);
    try {
      await centerService.voteCenterRequest(id, { is_vote_yes: true });
      toast.success('Vote recorded');
      void load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Vote failed');
    } finally {
      setVoteBusy(null);
    }
  };

  const submitRefuse = async () => {
    if (!refuseModal) return;
    if (!refuseReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setVoteBusy(refuseModal.id);
    try {
      await centerService.voteCenterRequest(refuseModal.id, {
        is_vote_yes: false,
        refuse_reason: refuseReason.trim(),
      });
      toast.success('Refusal recorded');
      setRefuseModal(null);
      setRefuseReason('');
      void load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Vote failed');
    } finally {
      setVoteBusy(null);
    }
  };

  const handleConfirm = async (id: string) => {
    setConfirmBusy(id);
    const ok = await execute(() => centerService.confirmCenterRequest(id), {
      successMessage: 'Center request confirmed on-chain',
    });
    if (ok) void load();
    setConfirmBusy(null);
  };

  const statusLower = (s: string) => s?.toLowerCase() ?? '';
  const canVote = (r: CenterRequest) => {
    const st = statusLower(r.status);
    return st === 'pending' || st === 'pending_review';
  };

  return (
    <div>
      <PageHeader
        title="Center requests"
        description="Vote on proposed support centers (GET /center-reqs)"
      />

      <DataTable<CenterRequest>
        loading={loading}
        data={rows}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No center requests"
        columns={[
          {
            key: 'id',
            label: 'ID',
            render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 6)}</span>,
          },
          { key: 'region', label: 'Region' },
          {
            key: 'address',
            label: 'Address',
            render: (r) => <span className="max-w-[180px] truncate">{r.address}</span>,
          },
          { key: 'phone_number', label: 'Phone' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          {
            key: 'actions',
            label: 'Actions',
            className: 'whitespace-nowrap',
            render: (r) => (
              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setDetail(r)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                >
                  Details
                </button>
                {canVote(r) && (
                  <>
                    <button
                      type="button"
                      disabled={voteBusy === r.id}
                      onClick={() => void voteYes(r.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-900 disabled:opacity-50"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={voteBusy === r.id}
                      onClick={() => {
                        setRefuseModal({ id: r.id });
                        setRefuseReason('');
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800 disabled:opacity-50"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </>
                )}
                {r.isAvailableToConfirm && (
                  <button
                    type="button"
                    disabled={confirmBusy === r.id}
                    onClick={() => void handleConfirm(r.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> Confirm
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <DetailModal
        title="Center request"
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && (
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs break-all">{detail.id}</p>
            <p><span className="text-slate-500">Region:</span> {detail.region}</p>
            <p><span className="text-slate-500">Address:</span> {detail.address}</p>
            <p><span className="text-slate-500">Phone:</span> {detail.phone_number}</p>
            <p><span className="text-slate-500">Status:</span> <StatusBadge status={detail.status} /></p>
            {detail.image_blob_id && (
              <BlobImage blobId={detail.image_blob_id} className="max-h-48 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Refuse center request</h3>
              <button type="button" onClick={() => setRefuseModal(null)} className="p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="mb-4 w-full rounded-lg border p-2 text-sm"
              rows={3}
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              placeholder="Reason…"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRefuseModal(null)} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={voteBusy === refuseModal.id}
                onClick={() => void submitRefuse()}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
