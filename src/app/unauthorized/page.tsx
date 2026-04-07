'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <ShieldX className="h-16 w-16 text-red-400" />
      <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
      <p className="text-slate-500">You don&apos;t have permission to view this page.</p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Go Home
      </Link>
    </div>
  );
}
