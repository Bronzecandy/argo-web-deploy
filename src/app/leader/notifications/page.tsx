'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import DetailModal from '@/src/components/ui/DetailModal';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { notificationService } from '@/src/services/notification.service';
import type { Notification } from '@/src/types/api.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function LeaderNotificationsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Notification | null>(null);

  const load = useCallback(async () => {
    const addr = user?.address || '';
    if (!addr) {
      setItems([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await notificationService.listByUser(addr, { page, page_size: PAGE_SIZE });
      setItems((res.data.data as Notification[]) ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch (e) {
      console.error(e);
      toast.error('Không tải được thông báo');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, user?.address]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Thông báo"
        description={
          user?.address
            ? `Updates for your leader account · ${truncateAddress(user.address)}`
            : 'Sign in to see your notifications'
        }
      />

      <div className="relative min-h-[120px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
          </div>
        ) : !user?.address ? (
          <p className="text-center text-sm text-amber-700">Connect your wallet to load notifications.</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Chưa có thông báo.</p>
        ) : (
          <ul className="relative space-y-0">
            <div className="absolute bottom-0 left-[11px] top-2 w-px bg-blue-200" aria-hidden />
            {items.map((n, i) => (
              <li key={n.id || i} className="relative flex gap-4 pb-8 pl-8 last:pb-0">
                <span className="absolute left-0 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-800 bg-white ring-4 ring-white">
                  <span className="h-2 w-2 rounded-full bg-blue-800" />
                </span>
                <article className="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm transition hover:border-blue-100 hover:bg-white">
                  <p className="text-sm leading-relaxed text-slate-800">{n.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-900">{n.region || '—'}</span>
                    <span>{formatDate(n.created_at)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailItem(n);
                        setDetailOpen(true);
                      }}
                      className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Chi tiết
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        {user?.address && !loading && items.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">
              Trang {page + 1} / {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.max(1, totalPages) - 1, p + 1))}
                disabled={page >= Math.max(1, totalPages) - 1 || loading}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <DetailModal
        title="Thông báo"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
        }}
        wide
      >
        {detailItem && (
          <div className="space-y-1">
            {detailField('ID', <span className="font-mono text-xs break-all">{detailItem.id}</span>)}
            {detailField('Content', detailItem.content)}
            {detailField('Vùng', detailItem.region || '—')}
            {detailField('Ngày tạo', formatDate(detailItem.created_at))}
            {detailField('Updated', formatDate(detailItem.updated_at))}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
