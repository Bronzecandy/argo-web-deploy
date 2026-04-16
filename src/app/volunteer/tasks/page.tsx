'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { taskService } from '@/src/services/task.service';
import type { Task } from '@/src/types/api.types';
import { Hand } from 'lucide-react';

const PAGE_SIZE = 10;

export default function VolunteerTasksPage() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Task[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const refresh = () => void loadPage(page);

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

  return (
    <div>
      <PageHeader
        title="Available Tasks"
        description="Browse tasks and claim ones in your region"
      />

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
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
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
    </div>
  );
}
