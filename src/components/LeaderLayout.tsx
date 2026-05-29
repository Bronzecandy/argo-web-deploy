'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { logoutUser } from '@/src/store/authSlice';
import { fetchLeaderPool, resetLeaderPool } from '@/src/store/leaderPoolSlice';
import { truncateAddress } from '@/src/lib/formatters';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import {
  LayoutDashboard,
  Landmark,
  Baby,
  Wallet,
  Building2,
  MapPin,
  ListChecks,
  ClipboardCheck,
  Bell,
  LogOut,
  Menu,
  X,
  Leaf,
  User,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = { label: string; href: string; icon: LucideIcon };

const FULL_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ label: 'Trang chủ', href: '/leader', icon: LayoutDashboard }],
  },
  {
    title: 'Duyệt & hồ sơ',
    items: [
      { label: 'Đăng ký TNV', href: '/leader/volunteers', icon: UserPlus },
      { label: 'Trẻ em', href: '/leader/children', icon: Baby },
      { label: 'Chứng từ nhiệm vụ', href: '/leader/task-proofs', icon: ClipboardCheck },
      { label: 'Nhiệm vụ', href: '/leader/tasks', icon: ListChecks },
    ],
  },
  {
    title: 'Tài chính & vùng',
    items: [
      { label: 'Tài khoản ngân hàng', href: '/leader/bank', icon: Landmark },
      { label: 'Rút tiền', href: '/leader/withdrawals', icon: Wallet },
      { label: 'Chiến dịch đặc biệt', href: '/leader/campaigns', icon: Building2 },
      { label: 'Đề xuất vùng', href: '/leader/regions', icon: MapPin },
    ],
  },
  {
    title: 'Cá nhân',
    items: [
      { label: 'Thông báo', href: '/leader/notifications', icon: Bell },
      { label: 'Hồ sơ', href: '/leader/profile', icon: User },
    ],
  },
];

const NO_CENTER_NAV_ITEMS: NavItem[] = [
  { label: 'Đăng ký tình nguyện viên', href: '/leader/volunteers', icon: UserPlus },
  { label: 'Đăng ký trung tâm', href: '/leader/register-center', icon: Building2 },
];

function pathAllowedWithoutCenter(pathname: string) {
  if (pathname === '/leader/volunteers') return true;
  if (pathname === '/leader/register-center') return true;
  return false;
}

export default function LeaderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { status: centerStatus, errorMessage } = useLeaderCenter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const restrictedNav = centerStatus === 'no_center';

  useEffect(() => {
    const addr = user?.address?.trim();
    if (!addr) {
      dispatch(resetLeaderPool());
      return;
    }
    void dispatch(fetchLeaderPool(addr));
  }, [dispatch, user?.address]);

  useEffect(() => {
    if (centerStatus !== 'no_center') return;
    if (pathAllowedWithoutCenter(pathname)) return;
    router.replace('/leader/volunteers');
  }, [centerStatus, pathname, router]);

  const isActive = (href: string) => {
    if (href === '/leader') return pathname === '/leader';
    return pathname.startsWith(href);
  };

  const showCenterLoading = centerStatus === 'loading';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-800">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900">AgroTrust</span>
            <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              LEADER
            </span>
          </div>
          <button type="button" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {restrictedNav && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-950">Chưa có trung tâm</p>
              <p className="mt-1 text-[11px] leading-snug text-amber-900">
                Bạn chỉ truy cập được Đăng ký TNV và Đăng ký trung tâm. Các mục khác mở sau khi trung tâm được duyệt.
              </p>
            </div>
          )}
          {restrictedNav ? (
            <ul className="space-y-0.5">
              {NO_CENTER_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? 'bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-800/10'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] ${active ? 'text-blue-800' : 'text-slate-400'}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            FULL_NAV_GROUPS.map((group) => (
              <div key={group.title} className="mb-4 last:mb-0">
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                            active
                              ? 'bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-800/10'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Icon className={`h-[18px] w-[18px] ${active ? 'text-blue-800' : 'text-slate-400'}`} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-700">Trưởng vùng</p>
            <p className="text-xs text-slate-400">{truncateAddress(user?.address || '')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch(resetLeaderPool());
              void dispatch(logoutUser());
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Đã kết nối
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-6">
          {centerStatus === 'error' && errorMessage && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Không kiểm tra được trạng thái trung tâm ({errorMessage}). Đang hiện đầy đủ menu — thử tải lại trang nếu cần.
            </div>
          )}
          {centerStatus === 'no_center' && !pathAllowedWithoutCenter(pathname) && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Trang này cần trung tâm đã duyệt. Bạn sẽ được chuyển tới Đăng ký tình nguyện viên hoặc Đăng ký trung tâm.
            </div>
          )}
          {showCenterLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}