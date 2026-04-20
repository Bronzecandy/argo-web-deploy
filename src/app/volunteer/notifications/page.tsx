'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import { useAppSelector } from '@/src/store/hooks';
import { notificationService } from '@/src/services/notification.service';
import { formatDate } from '@/src/lib/formatters';
import type { Notification } from '@/src/types/api.types';

const PAGE_SIZE = 10;

export default function VolunteerNotificationsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [notis, setNotis] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const res = await notificationService.listByUser(user.address, {
        page,
        page_size: PAGE_SIZE,
      });
      setNotis(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load notifications');
      setNotis([]);
    } finally {
      setLoading(false);
    }
  }, [page, user?.address]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Notifications" description="Your activity notifications" />

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : notis.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          No notifications
        </div>
      ) : (
        <div className="space-y-2">
          {notis.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-800">{n.content}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
