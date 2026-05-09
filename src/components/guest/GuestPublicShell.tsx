'use client';

import Link from 'next/link';
import { Leaf } from 'lucide-react';

export default function GuestPublicShell({
  children,
  showFooter = true,
}: {
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50/90">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-blue-950 shadow-md shadow-blue-900/20">
              <Leaf className="h-5 w-5 text-white" />
            </span>
            <span className="hidden sm:inline">AgroTrust</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/explore"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Explore
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8 lg:py-10">{children}</main>

      {showFooter && (
        <footer className="border-t border-slate-200/80 bg-white/60 py-6 text-center text-xs text-slate-500">
          Hỗ trợ trẻ minh bạch · AgroTrust
        </footer>
      )}
    </div>
  );
}
