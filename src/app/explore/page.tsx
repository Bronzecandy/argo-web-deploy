'use client';

import GuestPublicShell from '@/src/components/guest/GuestPublicShell';
import { ExploreContent } from '@/src/components/explore/ExploreContent';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEnsureAuth } from '@/src/hooks/useEnsureAuth';
import { HandCoins } from 'lucide-react';

export default function PublicExplorePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, redirectToLogin } = useEnsureAuth();

  return (
    <GuestPublicShell>
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Ready to give?</h2>
          <p className="mt-1 text-sm text-slate-600">Sign in to donate to pools and sponsor verified needs.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isLoading) return;
            if (!isAuthenticated) redirectToLogin('/donor/donate');
            else router.push('/donor/donate');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-900"
        >
          <HandCoins className="h-4 w-4" />
          Donate
        </button>
      </div>

      <ExploreContent
        title="Explore"
        description="Browse centers, children, and regional hubs — no account required to look around"
        childHref={(id) => `/children/${id}`}
        campaignRegionHref={(region) => `/campaigns/${encodeURIComponent(region)}`}
      />

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-800 hover:underline">
          Sign in
        </Link>
      </p>
    </GuestPublicShell>
  );
}
