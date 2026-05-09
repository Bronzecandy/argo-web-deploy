'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
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
      toast.error('Failed to load tasks');
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
      toast.success('Task claimed successfully');
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to claim task');
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
      toast.error('Select task and upload proof image');
      return;
    }
    setProofSubmitting(true);
    try {
      await taskProofService.submit(proofTaskId, proofBlob.trim());
      toast.success('Proof submitted');
      setProofOpen(false);
      setProofTaskId(null);
      setProofBlob('');
      refresh();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Submit failed');
    } finally {
      setProofSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Tasks"
        description="Claim open tasks and submit welfare proofs for assignments (mobile Update flow)"
      />

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">My assignments</h2>
        <p className="mb-3 text-sm text-slate-600">
          Tasks assigned to your wallet — submit photo proof when you complete a visit. Full history and manual task-ID
          entry:{' '}
          <Link href="/volunteer/task-proofs" className="font-medium text-blue-800 hover:underline">
            Task proofs
          </Link>
          .
        </p>
        <DataTable<Task>
          columns={[
            { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
            {
              key: 'description',
              label: 'Description',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
            },
            { key: 'region', label: 'Region' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'end_period', label: 'Due', render: (r) => formatDate(r.end_period) },
            {
              key: 'proof',
              label: 'Proof',
              render: (r) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProof(r.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900"
                >
                  <Camera className="h-3 w-3" /> Submit proof
                </button>
              ),
            },
          ]}
          data={mine}
          loading={mineLoading}
          page={0}
          totalPages={1}
          onPageChange={() => {}}
          emptyMessage={user?.address ? 'No tasks assigned to you yet. Claim one below.' : 'Sign in to see assignments.'}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Browse &amp; claim</h2>
        <DataTable<Task>
        columns={[
          { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 4)}</span> },
          {
            key: 'description',
            label: 'Description',
            render: (r) => <span className="line-clamp-2 max-w-xs">{r.description}</span>,
          },
          { key: 'region', label: 'Region' },
          { key: 'start_period', label: 'Start', render: (r) => formatDate(r.start_period) },
          { key: 'end_period', label: 'End', render: (r) => formatDate(r.end_period) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'assigned_staff',
            label: 'Assigned',
            render: (r) => (r.assigned_staff ? truncateAddress(r.assigned_staff) : <span className="text-slate-400">Unassigned</span>),
          },
          { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          {
            key: 'actions',
            label: 'Actions',
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
                  <Hand className="h-3 w-3" /> Claim
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
        emptyMessage="No tasks available"
      />
      </section>

      {proofOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Submit task proof</h3>
              <button
                type="button"
                onClick={() => setProofOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Task: <span className="font-mono">{proofTaskId ? truncateAddress(proofTaskId, 8) : '—'}</span>
            </p>
            <FileUploadInput label="Proof image (Walrus blob)" value={proofBlob} onChange={setProofBlob} accept="image/*" />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProofOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={proofSubmitting || !proofBlob.trim()}
                onClick={() => void submitProof()}
                className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {proofSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
