'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/src/store/hooks';
import { ROLES } from '@/src/lib/constants';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role === ROLES.ADMIN) {
      router.replace('/admin');
    } else if (user?.role === ROLES.LOCAL_LEADER) {
      router.replace('/leader');
    } else if (user?.role === ROLES.VOLUNTEER) {
      router.replace('/volunteer');
    } else if (user?.role === ROLES.DONOR || user?.role === ROLES.USER) {
      router.replace('/donor');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}
