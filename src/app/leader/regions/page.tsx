'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAppSelector } from '@/src/store/hooks';
import { regionService } from '@/src/services/region.service';
import type { CreateSupportedRegionSuggestionRequest, SupportedRegionSuggestion } from '@/src/types/api.types';

const PAGE_SIZE = 20;

export default function LeaderRegionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SupportedRegionSuggestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);

  useEffect(() => {
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

  const loadPage = useCallback(
    async (p: number) => {
      const addr = user?.address || '';
      if (!addr) {
        setRows([]);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await regionService.listSuggestions({
          page: p,
          page_size: PAGE_SIZE,
          created_by: addr,
          sort_order: 'desc',
        });
        const raw = res.data.data;
        setRows(Array.isArray(raw) ? (raw as SupportedRegionSuggestion[]) : []);
        setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load your supported region suggestions');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [user?.address],
  );

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim() || !content.trim()) {
      toast.error('Enter both `region` and `content` (POST /regions/supported-suggestions)');
      return;
    }
    const payload: CreateSupportedRegionSuggestionRequest = {
      region: region.trim(),
      content: content.trim(),
    };
    setSubmitting(true);
    try {
      await regionService.createSuggestion(payload);
      toast.success('Supported region suggestion created');
      setRegion('');
      setContent('');
      setProposeOpen(false);
      setPage(0);
      void loadPage(0);
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supported region suggestions"
        description={
          user?.address
            ? `POST /regions/supported-suggestions · ${truncateAddress(user.address)}`
            : 'Sign in to submit and list your suggestions (GET with created_by filter)'
        }
        actions={
          <button
            type="button"
            onClick={() => setProposeOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            New suggestion
          </button>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">My suggestions</h2>
        {!user?.address && (
          <p className="mb-4 text-sm text-amber-700">Connect your wallet to load your list.</p>
        )}
        <DataTable<SupportedRegionSuggestion>
          columns={[
            { key: 'region', label: 'region' },
            {
              key: 'content',
              label: 'content',
              render: (r) => <span className="line-clamp-2 max-w-xs">{r.content}</span>,
            },
            { key: 'status', label: 'status', render: (r) => <StatusBadge status={r.status || 'pending'} /> },
            {
              key: 'created_by',
              label: 'created_by',
              render: (r) => truncateAddress(r.created_by),
            },
            { key: 'created_at', label: 'created_at', render: (r) => formatDate(r.created_at) },
          ]}
          data={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No suggestions yet"
        />
      </section>

      {proposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create supported region suggestion</h2>
              <button
                type="button"
                onClick={() => setProposeOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Body: <code className="rounded bg-slate-100 px-1">region</code>,{' '}
              <code className="rounded bg-slate-100 px-1">content</code> — POST /regions/supported-suggestions
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="region" className="mb-1 block text-xs font-medium text-slate-500">
                  region
                </label>
                <input
                  id="region"
                  list="region-options"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                  placeholder="Pick from list or type a new region name"
                />
                <datalist id="region-options">
                  {regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="content" className="mb-1 block text-xs font-medium text-slate-500">
                  content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                  placeholder="Why this region or community should be supported…"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
