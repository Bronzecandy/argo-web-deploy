'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';

import { configService } from '@/src/services/config.service';

function pickDatesPayload(raw: unknown): { start_date: string; end_date: string } {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data: unknown }).data && typeof (raw as { data: unknown }).data === 'object') {
    const inner = (raw as { data: Record<string, unknown> }).data;
    return {
      start_date: String(inner.start_date ?? ''),
      end_date: String(inner.end_date ?? ''),
    };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return {
      start_date: String(o.start_date ?? ''),
      end_date: String(o.end_date ?? ''),
    };
  }
  return { start_date: '', end_date: '' };
}

export default function AdminConfigPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [blobInfo, setBlobInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [datesRes, blobRes] = await Promise.all([configService.getEditNeedDates(), configService.getBlobStore()]);
        if (cancelled) return;
        const { start_date, end_date } = pickDatesPayload(datesRes.data);
        setStartDate(start_date ? start_date.slice(0, 10) : '');
        setEndDate(end_date ? end_date.slice(0, 10) : '');
        const blobData = blobRes.data;
        setBlobInfo(blobData && typeof blobData === 'object' ? (blobData as Record<string, unknown>) : null);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load configuration');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configService.updateEditNeedDates({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success('Edit-need dates updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save dates');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="System configuration"
        description="Child profile edit windows and blob storage settings"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Child need edit dates</h2>
          <p className="mt-1 text-sm text-slate-500">Window when guardians may update a child&apos;s needs.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-slate-700">
                End date
              </label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save dates'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Blob store</h2>
          <p className="mt-1 text-sm text-slate-500">Current blob storage configuration from the API.</p>
          <div className="mt-6">
            {!blobInfo || Object.keys(blobInfo).length === 0 ? (
              <p className="text-sm text-slate-400">No blob store details returned.</p>
            ) : (
              <dl className="space-y-3 text-sm">
                {Object.entries(blobInfo).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5 border-b border-slate-100 pb-3 last:border-0">
                    <dt className="font-medium text-slate-500">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-mono text-xs text-slate-800 break-all">
                      {value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
