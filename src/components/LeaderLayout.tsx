'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { logoutUser } from '@/src/store/authSlice';
import { truncateAddress } from '@/src/lib/formatters';
import {
  LayoutDashboard,
  Landmark,
  Baby,
  Wallet,
  Building2,
  MapPin,
  Megaphone,
  ListChecks,
  ClipboardCheck,
  Gift,
  Bell,
  LogOut,
  Menu,
  X,
  Leaf,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/leader', icon: LayoutDashboard },
  { label: 'Bank Account', href: '/leader/bank', icon: Landmark },
  { label: 'Children', href: '/leader/children', icon: Baby },
  { label: 'Withdrawals', href: '/leader/withdrawals', icon: Wallet },
  { label: 'Centers', href: '/leader/centers', icon: Building2 },
  { label: 'Đề xuất vùng hỗ trợ', href: '/leader/regions', icon: MapPin },
  { label: 'Urgent Campaigns', href: '/leader/campaigns', icon: Megaphone },
  { label: 'Tasks', href: '/leader/tasks', icon: ListChecks },
  { label: 'Task Proofs', href: '/leader/task-proofs', icon: ClipboardCheck },
  { label: 'Gifts', href: '/leader/gifts', icon: Gift },
  { label: 'Notifications', href: '/leader/notifications', icon: Bell },
  { label: 'Profile', href: '/leader/profile', icon: User },
];

export default function LeaderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/leader') return pathname === '/leader';
    return pathname.startsWith(href);
  };

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900">AgroTrust</span>
            <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              LEADER
            </span>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-700">Local Leader</p>
            <p className="text-xs text-slate-400">{truncateAddress(user?.address || '')}</p>
          </div>
          <button
            onClick={() => dispatch(logoutUser())}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            Connected
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
