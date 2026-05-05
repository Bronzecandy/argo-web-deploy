'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { logoutUser } from '@/src/store/authSlice';
import { truncateAddress } from '@/src/lib/formatters';
import { ROLES } from '@/src/lib/constants';
import { LayoutDashboard, Search, HandCoins, Vote, History, User, Gift, Bell, LogOut, Leaf } from 'lucide-react';

const TAB_ITEMS = [
  { label: 'Home', href: '/donor', icon: LayoutDashboard },
  { label: 'Discover', href: '/donor/discover', icon: Search },
  { label: 'Donate', href: '/donor/donate', icon: HandCoins },
  { label: 'Withdrawals', href: '/donor/withdrawals', icon: Vote },
  { label: 'Transactions', href: '/donor/transactions', icon: History },
  { label: 'Gifts', href: '/donor/gifts', icon: Gift },
  { label: 'Notifications', href: '/donor/notifications', icon: Bell },
  { label: 'Profile', href: '/donor/profile', icon: User },
];

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const isActive = (href: string) => {
    if (href === '/donor') return pathname === '/donor';
    return pathname.startsWith(href);
  };

  const hasDonorRole = user?.roles?.includes(ROLES.DONOR);
  const areaBadge = hasDonorRole ? 'DONOR' : 'MEMBER';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-slate-900">AgroTrust</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {areaBadge}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500 sm:hidden">{truncateAddress(user?.address || '')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-[140px] truncate font-mono text-xs text-slate-500 sm:inline-block">
              {truncateAddress(user?.address || '')}
            </span>
            <button
              type="button"
              onClick={() => dispatch(logoutUser())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <nav
          className="-mx-0 flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:px-8"
          aria-label="Main"
        >
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
