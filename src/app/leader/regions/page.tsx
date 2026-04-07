'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { regionService } from '@/src/services/region.service';
import type { CreateSupportedRegionSuggestionRequest, SupportedRegionSuggestion } from '@/src/types/api.types';

const PAGE_SIZE = 10;

export default function LeaderRegionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SupportedRegionSuggestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    const addr = user?.address || '';
    if (!addr) {
      setRows([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await regionService.getUserSuggestions(addr, { page: p, page_size: PAGE_SIZE });
      setRows((res.data.data as SupportedRegionSuggestion[]) ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load your region suggestions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim() || !content.trim()) {
      toast.error('Region and content are required');
      return;
    }
    const payload: CreateSupportedRegionSuggestionRequest = {
      region: region.trim(),
      content: content.trim(),
    };
    setSubmitting(true);
    try {
      await regionService.createSuggestion(payload);
      toast.success('Suggestion submitted');
      setRegion('');
      setContent('');
      setPage(0);
      if (page === 0) void loadPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Region suggestions"
        description={
          user?.address
            ? `Propose supported regions for your local area · ${truncateAddress(user.address)}`
            : 'Propose supported regions for your local area'
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">My suggestions</h2>
        {!user?.address && (
          <p className="text-sm text-amber-700">Connect your wallet or sign in to see your suggestions.</p>
        )}
        <DataTable<SupportedRegionSuggestion>
          columns={[
            { key: 'region', label: 'Region' },
            {
              key: 'content',
              label: 'Content',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.content}</span>,
            },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status || 'pending'} /> },
            {
              key: 'created_by',
              label: 'Created by',
              render: (r) => truncateAddress(r.created_by),
            },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No suggestions yet"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create new</h2>
        <form onSubmit={handleCreate} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="region" className="mb-1 block text-xs font-medium text-slate-500">
              Region
            </label>
            <input
              id="region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="Region name or code"
            />
          </div>
          <div>
            <label htmlFor="content" className="mb-1 block text-xs font-medium text-slate-500">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="Why this region should be supported…"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit suggestion'}
          </button>
        </form>
      </section>
    </div>
  );
}
