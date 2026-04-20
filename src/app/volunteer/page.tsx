'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { taskService } from '@/src/services/task.service';
import { taskProofService } from '@/src/services/task-proof.service';
import { notificationService } from '@/src/services/notification.service';
import { profileService } from '@/src/services/profile.service';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import StatsCard from '@/src/components/ui/StatsCard';
import { ClipboardList, ClipboardCheck, Bell, User } from 'lucide-react';
import type { Task, TaskProof, Notification } from '@/src/types/api.types';

export default function VolunteerDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [proofs, setProofs] = useState<TaskProof[]>([]);
  const [totalProofs, setTotalProofs] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profileName, setProfileName] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const [tasksRes, proofsRes, notisRes, profileRes] = await Promise.all([
        taskService.list({ page_size: 5, sort_order: 'desc' }).catch(() => null),
        taskProofService.list({ page_size: 5, sort_order: 'desc' }).catch(() => null),
        notificationService.listByUser(user.address, { page_size: 5 }).catch(() => null),
        profileService.getByWallet(user.address).catch(() => null),
      ]);

      if (tasksRes) {
        setTasks(tasksRes.data.data || []);
        setTotalTasks(tasksRes.data.amount || 0);
      }
      if (proofsRes) {
        setProofs(proofsRes.data.data || []);
        setTotalProofs(proofsRes.data.amount || 0);
      }
      if (notisRes) setNotifications(notisRes.data.data || []);
      if (profileRes) {
        const p = profileRes.data;
        setProfileName([p.first_name, p.last_name].filter(Boolean).join(' '));
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={profileName ? `Welcome, ${profileName}` : 'Volunteer Dashboard'}
        description={user?.address ? `Wallet: ${truncateAddress(user.address)}` : ''}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Available Tasks" value={totalTasks} icon={ClipboardList} />
        <StatsCard label="My Proofs" value={totalProofs} icon={ClipboardCheck} />
        <StatsCard label="Notifications" value={notifications.length} icon={Bell} />
        <StatsCard label="Role" value="Volunteer" icon={User} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Recent Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks available</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{t.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.region} &middot; {formatDate(t.start_period)} – {formatDate(t.end_period)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    t.status === 'pending' || t.status === 'open'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Notifications */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Recent Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-800">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
