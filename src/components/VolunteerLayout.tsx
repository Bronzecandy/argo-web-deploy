'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { logoutUser } from '@/src/store/authSlice';
import { truncateAddress } from '@/src/lib/formatters';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Leaf,
  Wallet,
  Compass,
} from 'lucide-react';
import { ROLES } from '@/src/lib/constants';
import { userHasAnyRole } from '@/src/services/auth.service';

/** Theo mobile: tổng quan → nhiệm vụ/phúc lợi → yêu cầu trung tâm → cài đặt. */
const NAV_PRIMARY: { label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { label: 'Trang chủ', href: '/volunteer', icon: LayoutDashboard },
  { label: 'Nhiệm vụ & phúc lợi', href: '/volunteer/tasks', icon: ClipboardList },
  { label: 'Yêu cầu trung tâm', href: '/volunteer/center-requests', icon: Building2 },
  { label: 'Cài đặt', href: '/volunteer/settings', icon: Settings },
];

const SETTINGS_SUBPATHS = [
  '/volunteer/settings',
  '/volunteer/task-proofs',
  '/volunteer/notifications',
  '/volunteer/profile',
];

function VolNavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-800/15'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${active ? 'text-blue-800' : 'text-slate-400'}`} />
      {label}
    </Link>
  );
}

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const showDonorLink = user ? userHasAnyRole(user, [ROLES.DONOR, ROLES.USER]) : false;

  const isActive = (href: string) => {
    if (href === '/volunteer') return pathname === '/volunteer';
    return pathname.startsWith(href);
  };

  const settingsActive = SETTINGS_SUBPATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [mobileMenuOpen]);

  const closeMobile = () => setMobileMenuOpen(false);

  const renderPrimaryNav = (onNavigate?: () => void) => (
    <div className="flex flex-wrap gap-1">
      {NAV_PRIMARY.map((item) => {
        const active = item.href === '/volunteer/settings' ? settingsActive : isActive(item.href);
        return (
          <VolNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={active}
            onClick={onNavigate}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/90">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-blue-950 shadow-md shadow-blue-900/20">
              <Leaf className="h-5 w-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold leading-tight text-slate-900">AgroTrust</span>
              <span className="inline-block rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-900">
                Tình nguyện viên
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/explore"
              className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 sm:inline-flex"
            >
              <Compass className="h-3.5 w-3.5" />
              Khám phá
            </Link>
            {showDonorLink && (
              <Link
                href="/donor"
                className="hidden items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900 sm:inline-flex"
              >
                <Wallet className="h-3.5 w-3.5" />
                Thành viên
              </Link>
            )}
            <span className="hidden max-w-[100px] truncate font-mono text-[11px] text-slate-500 md:inline" title={user?.address}>
              {truncateAddress(user?.address || '')}
            </span>
            <button
              type="button"
              onClick={() => dispatch(logoutUser())}
              className="hidden items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Đăng xuất</span>
            </button>

            <div className="relative sm:hidden" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                aria-expanded={mobileMenuOpen}
                aria-label="Mở menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,18rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  {showDonorLink && (
                    <Link
                      href="/donor"
                      onClick={closeMobile}
                      className="mb-2 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-900"
                    >
                      <Wallet className="h-4 w-4" /> Khu vực nhà hảo tâm / thành viên
                    </Link>
                  )}
                  <Link href="/explore" onClick={closeMobile} className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    <Compass className="h-4 w-4" /> Khám phá công khai
                  </Link>
                  <div className="border-t border-slate-100 pt-2">{renderPrimaryNav(closeMobile)}</div>
                  <p className="mt-3 truncate border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">{user?.address}</p>
                  <button
                    type="button"
                    onClick={() => dispatch(logoutUser())}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav
          className="mx-auto hidden max-w-6xl flex-wrap items-center gap-2 border-t border-slate-100/90 px-4 py-2 sm:flex lg:px-6"
          aria-label="Điều hướng tình nguyện viên"
        >
          {renderPrimaryNav()}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 lg:px-6">{children}</main>
    </div>
  );
}
