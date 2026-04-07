'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { taskService } from '@/src/services/task.service';
import type { Task } from '@/src/types/api.types';

const PAGE_SIZE = 10;

export default function LeaderTasksPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Task[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !region.trim() || !startPeriod || !endPeriod) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await taskService.create({
        description: description.trim(),
        region: region.trim(),
        start_period: startPeriod,
        end_period: endPeriod,
      });
      toast.success('Task created');
      setDescription('');
      setRegion('');
      setStartPeriod('');
      setEndPeriod('');
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks"
        description={
          user?.address
            ? `View and create regional tasks · ${truncateAddress(user.address)}`
            : 'View and create regional tasks'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">All tasks</h2>
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
              render: (r) => (r.assigned_staff ? truncateAddress(r.assigned_staff) : '-'),
            },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No tasks"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create new task</h2>
        <form onSubmit={handleCreate} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="task-desc" className="mb-1 block text-xs font-medium text-slate-500">
              Description
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="task-region" className="mb-1 block text-xs font-medium text-slate-500">
              Region
            </label>
            <input
              id="task-region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start" className="mb-1 block text-xs font-medium text-slate-500">
                Start period
              </label>
              <input
                id="start"
                type="date"
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label htmlFor="end" className="mb-1 block text-xs font-medium text-slate-500">
                End period
              </label>
              <input
                id="end"
                type="date"
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </form>
      </section>
    </div>
  );
}
