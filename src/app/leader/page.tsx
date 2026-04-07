'use client';

import { useEffect, useState } from 'react';
import { Baby, Bell, Building2, Wallet } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import StatsCard from '@/src/components/ui/StatsCard';
import { formatDate } from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { childrenService } from '@/src/services/children.service';
import { withdrawService } from '@/src/services/withdraw.service';
import { centerService } from '@/src/services/center.service';
import { notificationService } from '@/src/services/notification.service';
import type { Notification } from '@/src/types/api.types';

export default function LeaderDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [childrenCount, setChildrenCount] = useState(0);
  const [myWithdrawalsCount, setMyWithdrawalsCount] = useState(0);
  const [centersCount, setCentersCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTotal, setNotificationTotal] = useState(0);

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const address = user?.address;
        const settled = await Promise.allSettled([
          childrenService.list({ page: 0, page_size: 1 }),
          address
            ? withdrawService.list({ page: 0, page_size: 1, creator: address })
            : Promise.resolve({ data: { amount: 0, data: [], page: 0, total_pages: 0 } }),
          centerService.list({ page: 0, page_size: 1 }),
          address
            ? notificationService.listByUser(address, { page: 0, page_size: 5 })
            : Promise.resolve({ data: { data: [], amount: 0, page: 0, total_pages: 0 } }),
        ]);

        const [childRes, withdrawRes, centerRes, notiRes] = settled;

        if (childRes.status === 'fulfilled') {
          setChildrenCount(childRes.value.data.amount ?? 0);
        } else {
          setChildrenCount(0);
        }

        if (withdrawRes.status === 'fulfilled') {
          setMyWithdrawalsCount(withdrawRes.value.data.amount ?? 0);
        } else {
          setMyWithdrawalsCount(0);
        }

        if (centerRes.status === 'fulfilled') {
          setCentersCount(centerRes.value.data.amount ?? 0);
        } else {
          setCentersCount(0);
        }

        if (notiRes.status === 'fulfilled') {
          const raw = notiRes.value.data.data;
          setNotifications(Array.isArray(raw) ? raw : []);
          setNotificationTotal(notiRes.value.data.amount ?? (Array.isArray(raw) ? raw.length : 0));
        } else {
          setNotifications([]);
          setNotificationTotal(0);
        }
      } catch {
        setChildrenCount(0);
        setMyWithdrawalsCount(0);
        setCentersCount(0);
        setNotifications([]);
        setNotificationTotal(0);
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, [user?.address]);

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
        title="Leader dashboard"
        description="Overview of children, your withdrawal activity, centers, and recent notifications"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total children" value={childrenCount} icon={Baby} />
        <StatsCard label="My withdrawal proposals" value={myWithdrawalsCount} icon={Wallet} />
        <StatsCard label="Center requests (platform)" value={centersCount} icon={Building2} />
        <StatsCard label="Notifications" value={notificationTotal} icon={Bell} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent notifications</h2>
          <p className="mt-0.5 text-sm text-slate-500">Latest updates for your wallet</p>
        </div>
        <div className="divide-y divide-slate-100">
          {!user?.address ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Connect your wallet to load notifications.
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No recent notifications</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{n.content}</p>
                  {n.region ? <p className="text-xs text-slate-500">{n.region}</p> : null}
                </div>
                <p className="shrink-0 text-xs text-slate-400">{formatDate(n.created_at)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
