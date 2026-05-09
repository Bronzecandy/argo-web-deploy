'use client';

import { useEffect, useState } from 'react';
import { Baby, Bell, Building2, Coins, ListChecks, MapPin, UserPlus, Wallet } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import StatsCard from '@/src/components/ui/StatsCard';
import { formatDate, formatVND } from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { childrenService } from '@/src/services/children.service';
import { withdrawService } from '@/src/services/withdraw.service';
import { centerService } from '@/src/services/center.service';
import { notificationService } from '@/src/services/notification.service';
import { taskService } from '@/src/services/task.service';
import { registrationService } from '@/src/services/registration.service';
import type { Notification } from '@/src/types/api.types';

export default function LeaderDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { poolName, totalDonation, status: poolStatus } = useAppSelector((state) => state.leaderPool);

  const [loading, setLoading] = useState(true);
  const [childrenCount, setChildrenCount] = useState(0);
  const [myWithdrawalsCount, setMyWithdrawalsCount] = useState(0);
  const [centersCount, setCentersCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [tasksInRegion, setTasksInRegion] = useState(0);
  const [volunteersPending, setVolunteersPending] = useState(0);
  const [regionExtrasLoading, setRegionExtrasLoading] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const address = user?.address;
        const region = poolStatus === 'succeeded' && poolName ? poolName : undefined;

        const settled = await Promise.allSettled([
          childrenService.list({ page: 0, page_size: 1, ...(region ? { region } : {}) }),
          address
            ? withdrawService.list({ page: 0, page_size: 1, creator: address })
            : Promise.resolve({ data: { amount: 0, data: [], page: 0, total_pages: 0 } }),
          centerService.list({ page: 0, page_size: 1 }),
          address
            ? notificationService.listByUser(address, { page: 0, page_size: 20 })
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
  }, [user?.address, poolName, poolStatus]);

  useEffect(() => {
    if (poolStatus !== 'succeeded' || !poolName) {
      setTasksInRegion(0);
      setVolunteersPending(0);
      setRegionExtrasLoading(false);
      return;
    }

    let cancelled = false;
    setRegionExtrasLoading(true);

    (async () => {
      const [taskRes, regRes] = await Promise.allSettled([
        taskService.list({ page: 0, page_size: 1, region: poolName, sort_order: 'desc' }),
        registrationService.list({
          page: 0,
          page_size: 1,
          register_role: 'Volunteer',
          region: poolName,
          status: 'pending',
        }),
      ]);

      if (cancelled) return;

      setTasksInRegion(taskRes.status === 'fulfilled' ? taskRes.value.data.amount ?? 0 : 0);
      setVolunteersPending(regRes.status === 'fulfilled' ? regRes.value.data.amount ?? 0 : 0);
      setRegionExtrasLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [poolName, poolStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  const poolValue =
    poolStatus === 'loading' || poolStatus === 'idle'
      ? '…'
      : poolStatus === 'succeeded'
        ? formatVND(totalDonation)
        : '—';

  const regionValue =
    poolStatus === 'loading' || poolStatus === 'idle' ? '…' : poolStatus === 'succeeded' ? poolName || '—' : '—';

  const tasksValue = regionExtrasLoading ? '…' : tasksInRegion;
  const volValue = regionExtrasLoading ? '…' : volunteersPending;

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển trưởng vùng"
        description="Quỹ vùng, hoạt động địa phương và thông báo — theo khu vực khi đã tải được dữ liệu quỹ"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Tổng quỹ vùng" value={poolValue} icon={Coins} />
        <StatsCard label="Vùng của bạn" value={regionValue} icon={MapPin} />
        <StatsCard label="Nhiệm vụ trong vùng" value={tasksValue} icon={ListChecks} />
        <StatsCard label="Tình nguyện viên chờ duyệt" value={volValue} icon={UserPlus} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={poolName ? 'Trẻ em trong vùng' : 'Tổng trẻ (toàn hệ thống)'}
          value={childrenCount}
          icon={Baby}
        />
        <StatsCard label="Đề xuất rút của tôi" value={myWithdrawalsCount} icon={Wallet} />
        <StatsCard label="Yêu cầu trung tâm (nền tảng)" value={centersCount} icon={Building2} />
        <StatsCard label="Thông báo" value={notificationTotal} icon={Bell} />
      </div>

      {poolStatus === 'failed' && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Chỉ số theo vùng có thể chưa đầy đủ cho đến khi quỹ trưởng vùng tải thành công.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Thông báo gần đây</h2>
          <p className="mt-0.5 text-sm text-slate-500">Cập nhật mới cho ví của bạn</p>
        </div>
        <div className="divide-y divide-slate-100">
          {!user?.address ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Kết nối ví để tải thông báo.
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Chưa có thông báo gần đây</div>
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
