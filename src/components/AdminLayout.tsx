'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { logoutUser } from '@/src/store/authSlice';
import { truncateAddress } from '@/src/lib/formatters';
import {
  LayoutDashboard,
  Users,
  Baby,
  Building2,
  Wallet,
  BarChart3,
  LogOut,
  Menu,
  X,
  Leaf,
  MapPin,
  HandCoins,
  CreditCard,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ label: 'Bảng điều khiển', href: '/admin', icon: LayoutDashboard }],
  },
  {
    title: 'Duyệt hồ sơ',
    items: [
      { label: 'Quản lý tài khoản', href: '/admin/accounts', icon: Users },
      { label: 'Hồ sơ trẻ', href: '/admin/children', icon: Baby },
      { label: 'Trung tâm hỗ trợ', href: '/admin/centers', icon: Building2 },
      { label: 'Đề xuất vùng', href: '/admin/regions', icon: MapPin },
    ],
  },
  {
    title: 'Tài chính',
    items: [
      { label: 'Nhà hảo tâm', href: '/admin/donors', icon: HandCoins },
      { label: 'Thanh toán', href: '/admin/payments', icon: CreditCard },
      { label: 'Đề xuất rút tiền', href: '/admin/treasury', icon: Wallet },
      { label: 'Giao dịch', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
            <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-900">
              ADMIN
            </span>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
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
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-700">{user?.role || 'Quản trị'}</p>
            <p className="text-xs text-slate-400">{truncateAddress(user?.address || '')}</p>
          </div>
          <button
            onClick={() => dispatch(logoutUser())}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
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
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
