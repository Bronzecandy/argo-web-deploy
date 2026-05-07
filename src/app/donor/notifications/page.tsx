'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { notificationService } from '@/src/services/notification.service';
import { formatDateTime } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import type { Notification } from '@/src/types/api.types';
import { Bell, Inbox } from 'lucide-react';

export default function DonorNotificationsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const res = await notificationService.listByUser(user.address, {
        page,
        page_size: 20,
      });
      setNotifications(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay updated with platform activities"
      />

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
          <Inbox className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((noti) => (
            <div key={noti.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                <Bell className="h-5 w-5 text-blue-800" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{noti.content}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>{formatDateTime(noti.created_at)}</span>
                  {noti.region && <span>&middot; {noti.region}</span>}
                </div>
              </div>
            </div>
          ))}

          {notifications.length > 0 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {page + 1} of {Math.max(1, totalPages)}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.max(1, totalPages) - 1, p + 1))}
                disabled={page >= Math.max(1, totalPages) - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
