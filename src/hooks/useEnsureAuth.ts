'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/src/store/hooks';

/**
 * Redirect to login with optional return URL after sign-in.
 */
export function useEnsureAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  const redirectToLogin = useCallback(
    (returnPath?: string) => {
      const next =
        returnPath ||
        (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/');
      router.push(`/login?returnUrl=${encodeURIComponent(next)}`);
    },
    [router],
  );

  /** Run action only when authenticated; otherwise send user to login with return URL. */
  const withAuth = useCallback(
    (action: () => void, returnPath?: string) => {
      if (isLoading) return;
      if (!isAuthenticated) {
        redirectToLogin(returnPath);
        return;
      }
      action();
    },
    [isAuthenticated, isLoading, redirectToLogin],
  );

  return { isAuthenticated, isLoading, redirectToLogin, withAuth };
}
