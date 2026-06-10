'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Users, Baby, Building2, Wallet, HandCoins, UserCheck,
  ArrowUpRight, TrendingUp, TrendingDown, Landmark,
} from 'lucide-react';
import Link from 'next/link';
import StatsCard from '@/src/components/ui/StatsCard';
import PageHeader from '@/src/components/ui/PageHeader';
import PageSection from '@/src/components/ui/PageSection';
import { btnSecondary } from '@/src/lib/uiClasses';
import { registrationService } from '@/src/services/registration.service';
import { childrenService } from '@/src/services/children.service';
import { centerService } from '@/src/services/center.service';
import { withdrawService } from '@/src/services/withdraw.service';
import { staffService } from '@/src/services/staff.service';
import { transactionService } from '@/src/services/transaction.service';
import { donorService } from '@/src/services/donor.service';
import { childUploadService } from '@/src/services/child-upload.service';
import { taskService } from '@/src/services/task.service';
import { formatVND, formatDate } from '@/src/lib/formatters';
import {
  isDonateTransaction,
  isWithdrawTransaction,
  TX_ACTION_DONATE,
  TX_ACTION_WITHDRAW,
} from '@/src/lib/txActionTypes';
import type {
  TransactionRecord, WithdrawProposal, RegistrationRequest,
  Child, SupportCenter, UploadChildRequestEntity, Task,
} from '@/src/types/api.types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';

const COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const STAFF_COUNT_PAGE_SIZE = 10;

function groupByDate(records: TransactionRecord[]) {
  const map: Record<string, { date: string; amount: number; count: number }> = {};
  for (const r of records) {
    const d = r.created_at?.slice(0, 10);
    if (!d) continue;
    if (!map[d]) map[d] = { date: d, amount: 0, count: 0 };
    map[d].amount += r.amount || 0;
    map[d].count += 1;
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function groupByField<T>(items: T[], field: keyof T): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = String((item as any)[field] || 'Không rõ');
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function statusSummary<T extends { status?: string }>(items: T[]): { name: string; value: number }[] {
  return groupByField(items, 'status' as keyof T);
}

const CustomTooltipVND = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'amount' ? formatVND(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    registrations: 0, children: 0, centers: 0,
    withdrawals: 0, staff: 0, donors: 0, donateCount: 0,
  });

  const [allTx, setAllTx] = useState<TransactionRecord[]>([]);
  const [donateTx, setDonateTx] = useState<TransactionRecord[]>([]);
  const [withdrawTx, setWithdrawTx] = useState<TransactionRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawProposal[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [centers, setCenters] = useState<SupportCenter[]>([]);
  const [childUploads, setChildUploads] = useState<UploadChildRequestEntity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function load() {
      const PAGE = 100;
      const [
        regRes, childRes, centerRes, withdrawRes, staffRes,
        txRes, donateTxRes, withdrawTxRes, donorRes, uploadRes, taskRes,
      ] = await Promise.allSettled([
        registrationService.list({ page: 0, page_size: PAGE, sort_order: 'desc' }),
        childrenService.list({ page: 0, page_size: PAGE }),
        centerService.list({ page: 0, page_size: PAGE, sort_order: 'desc' }),
        withdrawService.list({ page: 0, page_size: PAGE, sort_order: 'desc' }),
        staffService.list({ page: 0, page_size: STAFF_COUNT_PAGE_SIZE }),
        transactionService.list({ page: 0, page_size: PAGE, sort_order: 'desc' }),
        transactionService.list({ page: 0, page_size: PAGE, action_type: TX_ACTION_DONATE, sort_order: 'desc' }),
        transactionService.list({ page: 0, page_size: PAGE, action_type: TX_ACTION_WITHDRAW, sort_order: 'desc' }),
        donorService.list({ page: 0, page_size: 1 }),
        childUploadService.list({ page: 0, page_size: PAGE, sort_order: 'desc' }),
        taskService.list({ page: 0, page_size: PAGE, sort_order: 'desc' }),
      ]);

      const staffBody = staffRes.status === 'fulfilled' ? staffRes.value.data : null;
      const staffTotal =
        typeof staffBody?.amount === 'number'
          ? staffBody.amount
          : Array.isArray(staffBody?.data)
            ? staffBody.data.length
            : 0;

      setStats({
        registrations: regRes.status === 'fulfilled' ? regRes.value.data.amount || 0 : 0,
        children: childRes.status === 'fulfilled' ? childRes.value.data.amount || 0 : 0,
        centers: centerRes.status === 'fulfilled' ? centerRes.value.data.amount || 0 : 0,
        withdrawals: withdrawRes.status === 'fulfilled' ? withdrawRes.value.data.amount || 0 : 0,
        staff: staffTotal,
        donors: donorRes.status === 'fulfilled' ? donorRes.value.data.amount || 0 : 0,
        donateCount: donateTxRes.status === 'fulfilled' ? donateTxRes.value.data.amount || 0 : 0,
      });

      if (txRes.status === 'fulfilled') setAllTx(txRes.value.data.data || []);
      if (donateTxRes.status === 'fulfilled') {
        setDonateTx(donateTxRes.value.data.data || []);
      } else {
        setDonateTx([]);
      }
      if (withdrawTxRes.status === 'fulfilled') {
        setWithdrawTx(withdrawTxRes.value.data.data || []);
      } else {
        setWithdrawTx([]);
      }
      if (withdrawRes.status === 'fulfilled') setWithdrawals(withdrawRes.value.data.data || []);
      if (regRes.status === 'fulfilled') setRegistrations(regRes.value.data.data || []);
      if (childRes.status === 'fulfilled') setChildrenList(childRes.value.data.data || []);
      if (centerRes.status === 'fulfilled') setCenters(centerRes.value.data.data || []);
      if (uploadRes.status === 'fulfilled') setChildUploads(uploadRes.value.data.data || []);
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value.data.data || []);

      setLoading(false);
    }
    load();
  }, []);

  const donateTxFiltered = useMemo(
    () => (donateTx.length > 0 ? donateTx : allTx.filter(isDonateTransaction)),
    [donateTx, allTx],
  );
  const withdrawTxFiltered = useMemo(
    () => (withdrawTx.length > 0 ? withdrawTx : allTx.filter(isWithdrawTransaction)),
    [withdrawTx, allTx],
  );
  const txByDate = useMemo(() => groupByDate(donateTxFiltered), [donateTxFiltered]);
  const txByType = useMemo(() => groupByField(allTx, 'action_type'), [allTx]);
  const withdrawByStatus = useMemo(() => {
    const exec = withdrawals.filter((w) => w.is_executed).length;
    const pending = withdrawals.filter((w) => !w.is_executed).length;
    return [
      { name: 'Đã thực thi', value: exec },
      { name: 'Đang chờ', value: pending },
    ].filter((d) => d.value > 0);
  }, [withdrawals]);
  const regByStatus = useMemo(() => statusSummary(registrations), [registrations]);
  const childrenByRegion = useMemo(() => groupByField(childrenList, 'region'), [childrenList]);
  const centersByRegion = useMemo(() => groupByField(centers, 'region'), [centers]);
  const uploadsByStatus = useMemo(() => statusSummary(childUploads), [childUploads]);
  const tasksByStatus = useMemo(() => statusSummary(tasks), [tasks]);

  const totalDonateAmount = useMemo(
    () => donateTxFiltered.reduce((s, t) => s + (t.amount || 0), 0),
    [donateTxFiltered],
  );
  const totalWithdrawAmount = useMemo(
    () => withdrawTxFiltered.reduce((s, t) => s + (t.amount || 0), 0),
    [withdrawTxFiltered],
  );
  const systemBalance = totalDonateAmount - totalWithdrawAmount;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển quản trị"
        description="Tổng quan hoạt động nền tảng AgroTrust"
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/treasury" className={btnSecondary}>
          <Wallet className="h-4 w-4" />
          Rút tiền & quỹ
        </Link>
        <Link href="/admin/accounts" className={btnSecondary}>
          <Users className="h-4 w-4" />
          Tài khoản & đăng ký
        </Link>
        <Link href="/admin/analytics" className={btnSecondary}>
          <HandCoins className="h-4 w-4" />
          Lịch sử giao dịch
        </Link>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard label="Tổng lượt donate" value={stats.donateCount} icon={HandCoins} />
        <StatsCard label="Tổng tiền quyên góp" value={formatVND(totalDonateAmount)} icon={TrendingUp} />
        <StatsCard label="Khối lượng rút" value={formatVND(totalWithdrawAmount)} icon={TrendingDown} />
        <StatsCard label="Số dư hệ thống" value={formatVND(systemBalance)} icon={Landmark} />
        <StatsCard label="Trẻ em" value={stats.children} icon={Baby} />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard label="Đăng ký" value={stats.registrations} icon={Users} />
        <StatsCard label="Trung tâm" value={stats.centers} icon={Building2} />
        <StatsCard label="Rút tiền" value={stats.withdrawals} icon={Wallet} />
        <StatsCard label="Nhân sự" value={stats.staff} icon={UserCheck} />
        <StatsCard label="Nhà hảo tâm" value={stats.donors} icon={Users} />
      </div>

      <PageSection
        title="Tiền quyên góp theo thời gian"
        description="Tổng số tiền donate theo ngày"
      >
        {txByDate.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu quyên góp</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={txByDate}>
              <defs>
                <linearGradient id="gradAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
              <Tooltip content={<CustomTooltipVND />} />
              <Area type="monotone" dataKey="amount" stroke="#059669" fill="url(#gradAmount)" strokeWidth={2} name="amount" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </PageSection>

      <PageSection title="Số lượt donate theo ngày" description="Số lượt quyên góp mỗi ngày">
        {txByDate.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu quyên góp</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={txByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip content={<CustomTooltipVND />} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </PageSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection title="Giao dịch theo loại">
          {txByType.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={txByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={{ stroke: '#94a3b8' }}>
                  {txByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </PageSection>

        <PageSection title="Đề xuất rút tiền">
          {withdrawByStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={withdrawByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {withdrawByStatus.map((_, i) => <Cell key={i} fill={i === 0 ? '#059669' : '#f59e0b'} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <p className="mt-2 text-center text-xs text-slate-500">
            Tổng số tiền rút: <span className="font-semibold text-slate-700">{formatVND(totalWithdrawAmount)}</span>
          </p>
        </PageSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection title="Yêu cầu đăng ký theo trạng thái">
          {regByStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PageSection>

        <PageSection title="Trung tâm hỗ trợ theo vùng">
          {centersByRegion.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={centersByRegion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PageSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection title="Trẻ em theo vùng">
          {childrenByRegion.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={childrenByRegion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} name="children" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PageSection>

        <PageSection title="Yêu cầu tải hồ sơ trẻ theo trạng thái">
          {uploadsByStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={uploadsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {uploadsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </PageSection>
      </div>

      <PageSection title="Nhiệm vụ theo trạng thái">
        {tasksByStatus.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu nhiệm vụ</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tasksByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="tasks" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </PageSection>

      <PageSection
        title="Giao dịch gần đây"
        description="Hoạt động mới nhất trên nền tảng"
        actions={
          <Link href="/admin/analytics" className="flex items-center gap-1 text-sm text-blue-800 hover:underline">
            Xem tất cả <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 text-left font-medium text-slate-500">Loại</th>
                <th className="px-5 py-2.5 text-left font-medium text-slate-500">Quỹ</th>
                <th className="px-5 py-2.5 text-right font-medium text-slate-500">Số tiền</th>
                <th className="px-5 py-2.5 text-right font-medium text-slate-500">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allTx.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/40 transition">
                  <td className="px-5 py-3">
                    <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                      {tx.action_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{tx.pool_name || tx.message || '-'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {tx.amount ? formatVND(tx.amount) : '-'}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-400">{formatDate(tx.created_at)}</td>
                </tr>
              ))}
              {allTx.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">Chưa có giao dịch gần đây</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection
        title="Đề xuất rút tiền gần đây"
        description="Đề xuất mới nhất trên các quỹ"
        actions={
          <Link href="/admin/treasury" className="flex items-center gap-1 text-sm text-blue-800 hover:underline">
            Xem tất cả <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 text-left font-medium text-slate-500">Quỹ</th>
                <th className="px-5 py-2.5 text-left font-medium text-slate-500">Mô tả</th>
                <th className="px-5 py-2.5 text-right font-medium text-slate-500">Số tiền</th>
                <th className="px-5 py-2.5 text-center font-medium text-slate-500">Duyệt / Từ chối</th>
                <th className="px-5 py-2.5 text-center font-medium text-slate-500">Trạng thái</th>
                <th className="px-5 py-2.5 text-right font-medium text-slate-500">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withdrawals.slice(0, 8).map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/40 transition">
                  <td className="px-5 py-3 font-medium text-slate-700">{w.pool_name}</td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-slate-600">{w.description}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatVND(w.withdraw_amount)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-blue-800 font-medium">{w.approve_weight}</span>
                    {' / '}
                    <span className="text-red-500 font-medium">{w.refuse_weight}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      w.is_executed ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {w.is_executed ? 'Đã thực thi' : 'Đang chờ'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-400">{formatDate(w.created_at)}</td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Chưa có đề xuất rút tiền</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  );
}
