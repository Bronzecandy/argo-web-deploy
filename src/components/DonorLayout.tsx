'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { logoutUser } from '@/src/store/authSlice';
import { truncateAddress } from '@/src/lib/formatters';
import { ROLES } from '@/src/lib/constants';
import { userHasAnyRole } from '@/src/services/auth.service';
import {
  LayoutDashboard,
  Search,
  HandCoins,
  Vote,
  LogOut,
  Leaf,
  MapPin,
  HeartHandshake,
  Settings,
  Menu,
  X,
  Compass,
} from 'lucide-react';

/** Browse & follow — same flow as mobile: home → explore → regions → track */
const NAV_BROWSE: { label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { label: 'Home', href: '/donor', icon: LayoutDashboard },
  { label: 'Discover', href: '/donor/discover', icon: Search },
  { label: 'Regions', href: '/donor/regions', icon: MapPin },
  { label: 'My track', href: '/donor/track', icon: HeartHandshake },
];

/** Giving & treasury */
const NAV_GIVING: { label: string; href: string; icon: typeof HandCoins }[] = [
  { label: 'Donate', href: '/donor/donate', icon: HandCoins },
  { label: 'Withdrawals', href: '/donor/withdrawals', icon: Vote },
];

const SETTINGS_HREF = '/donor/settings';

const SETTINGS_SUBPATHS = [
  '/donor/settings',
  '/donor/transactions',
  '/donor/gifts',
  '/donor/notifications',
  '/donor/register',
  '/donor/child-upload',
  '/donor/profile',
];

function NavLink({
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

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === '/donor') return pathname === '/donor';
    return pathname.startsWith(href);
  };

  const settingsActive = SETTINGS_SUBPATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const hasDonorRole = user?.roles?.includes(ROLES.DONOR);
  const areaBadge = hasDonorRole ? 'DONOR' : 'MEMBER';
  const showVolunteerLink = user ? userHasAnyRole(user, [ROLES.VOLUNTEER]) : false;

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

  const renderNavGroups = (onNavigate?: () => void) => (
    <>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1">
        <span className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:sr-only">Browse</span>
        <div className="flex flex-wrap gap-1">
          {NAV_BROWSE.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              onClick={onNavigate}
            />
          ))}
        </div>
      </div>
      <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1">
        <span className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:sr-only">Giving</span>
        <div className="flex flex-wrap gap-1">
          {NAV_GIVING.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              onClick={onNavigate}
            />
          ))}
        </div>
      </div>
      <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center">
        <span className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:sr-only">Account</span>
        <NavLink
          href={SETTINGS_HREF}
          label="Settings"
          icon={Settings}
          active={settingsActive}
          onClick={onNavigate}
        />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/90">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur-md">
        {/* Row 1: brand + utilities */}
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-blue-950 shadow-md shadow-blue-900/20">
                <Leaf className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold leading-tight text-slate-900">AgroTrust</span>
                <span className="inline-block rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-900">
                  {areaBadge}
                </span>
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/explore"
              className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 sm:inline-flex"
            >
              <Compass className="h-3.5 w-3.5" />
              Explore
            </Link>
            {showVolunteerLink && (
              <Link
                href="/volunteer"
                className="hidden rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-900 sm:inline-block"
              >
                Volunteer
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
              <span className="hidden lg:inline">Logout</span>
            </button>

            <div className="relative sm:hidden" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                aria-expanded={mobileMenuOpen}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,20rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  {showVolunteerLink && (
                    <Link
                      href="/volunteer"
                      onClick={closeMobile}
                      className="mb-2 block rounded-lg bg-orange-50 px-3 py-2 text-center text-xs font-semibold text-orange-900"
                    >
                      Volunteer area
                    </Link>
                  )}
                  <Link href="/explore" onClick={closeMobile} className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Compass className="h-4 w-4" /> Public Explore
                  </Link>
                  <div className="space-y-3 border-t border-slate-100 pt-3">{renderNavGroups(closeMobile)}</div>
                  <p className="mt-3 truncate border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">{user?.address}</p>
                  <button
                    type="button"
                    onClick={() => dispatch(logoutUser())}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: primary navigation (desktop / tablet) */}
        <nav
          className="mx-auto hidden max-w-6xl items-center gap-3 border-t border-slate-100/90 px-4 py-2 sm:flex lg:px-6"
          aria-label="Main"
        >
          {renderNavGroups()}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 lg:px-6">{children}</main>
    </div>
  );
}
