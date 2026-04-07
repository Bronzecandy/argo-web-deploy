'use client';

import { useEffect, useState } from 'react';
import {
  Users, Baby, Building2, Wallet, BarChart3, ClipboardCheck,
  TrendingUp, ArrowUpRight,
} from 'lucide-react';
import StatsCard from '@/src/components/ui/StatsCard';
import PageHeader from '@/src/components/ui/PageHeader';
import { registrationService } from '@/src/services/registration.service';
import { childrenService } from '@/src/services/children.service';
import { centerService } from '@/src/services/center.service';
import { withdrawService } from '@/src/services/withdraw.service';
import { staffService } from '@/src/services/staff.service';
import { transactionService } from '@/src/services/transaction.service';
import { formatVND, formatDate } from '@/src/lib/formatters';
import type { TransactionRecord } from '@/src/types/api.types';

interface DashboardStats {
  registrations: number;
  children: number;
  centers: number;
  withdrawals: number;
  staff: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    registrations: 0, children: 0, centers: 0, withdrawals: 0, staff: 0,
  });
  const [recentTx, setRecentTx] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [regRes, childRes, centerRes, withdrawRes, staffRes, txRes] = await Promise.allSettled([
          registrationService.list({ page: 0, page_size: 1 }),
          childrenService.list({ page: 0, page_size: 1 }),
          centerService.list({ page: 0, page_size: 1 }),
          withdrawService.list({ page: 0, page_size: 1 }),
          staffService.list({ page: 0, page_size: 1 }),
          transactionService.list({ page: 0, page_size: 5, sort_order: 'desc' }),
        ]);

        setStats({
          registrations: regRes.status === 'fulfilled' ? regRes.value.data.amount || 0 : 0,
          children: childRes.status === 'fulfilled' ? childRes.value.data.amount || 0 : 0,
          centers: centerRes.status === 'fulfilled' ? centerRes.value.data.amount || 0 : 0,
          withdrawals: withdrawRes.status === 'fulfilled' ? withdrawRes.value.data.amount || 0 : 0,
          staff: staffRes.status === 'fulfilled' ? staffRes.value.data.amount || 0 : 0,
        });

        if (txRes.status === 'fulfilled') {
          setRecentTx(txRes.value.data.data || []);
        }
      } catch {
        // Silently fail - stats show 0
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

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
        title="Dashboard"
        description="Overview of AgroTrust platform activity"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard label="Registration Requests" value={stats.registrations} icon={Users} />
        <StatsCard label="Children" value={stats.children} icon={Baby} />
        <StatsCard label="Center Requests" value={stats.centers} icon={Building2} />
        <StatsCard label="Withdrawal Proposals" value={stats.withdrawals} icon={Wallet} />
        <StatsCard label="Staff Members" value={stats.staff} icon={Users} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent Transactions</h2>
          <a href="/admin/analytics" className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="divide-y divide-slate-100">
          {recentTx.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No recent transactions</div>
          ) : (
            recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{tx.action_type}</p>
                  <p className="text-xs text-slate-400">{tx.pool_name || tx.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {tx.amount ? formatVND(tx.amount) : '-'}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
