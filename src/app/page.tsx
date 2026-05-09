'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppSelector } from '@/src/store/hooks';
import { ROLES } from '@/src/lib/constants';
import GuestPublicShell from '@/src/components/guest/GuestPublicShell';
import { regionService } from '@/src/services/region.service';
import type { SupportedRegionSuggestion } from '@/src/types/api.types';
import { ArrowRight, Compass, MapPin, Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);
  const [suggestions, setSuggestions] = useState<SupportedRegionSuggestion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    setRegionsLoading(true);
    try {
      const res = await regionService.listSuggestions({
        page: 0,
        page_size: 8,
        sort_order: 'desc',
      });
      const raw = res.data.data;
      setSuggestions(Array.isArray(raw) ? (raw as SupportedRegionSuggestion[]) : []);
    } catch {
      setSuggestions([]);
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      if (user.role === ROLES.ADMIN) router.replace('/admin');
      else if (user.role === ROLES.LOCAL_LEADER) router.replace('/leader');
      else if (user.role === ROLES.VOLUNTEER) router.replace('/volunteer');
      else if (user.role === ROLES.DONOR || user.role === ROLES.USER) router.replace('/donor');
      else router.replace('/login');
      return;
    }
    void loadSuggestions();
  }, [isAuthenticated, isLoading, user, router, loadSuggestions]);

  if (isLoading || (isAuthenticated && user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <GuestPublicShell>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 px-6 py-14 text-white shadow-xl shadow-blue-900/25 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-200/90">Hỗ trợ trẻ em, minh bạch từng bước</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Xem nơi cần giúp đỡ — trước khi bạn đăng nhập.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100/90 sm:text-lg">
            Xem các vùng cộng đồng đề xuất hỗ trợ và khám phá trung tâm, trẻ em đã xác minh. Chỉ đăng nhập khi bạn sẵn sàng quyên góp hoặc dùng công cụ thành viên.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-900 shadow-lg transition hover:bg-blue-50"
            >
              <Compass className="h-4 w-4" />
              Khám phá mạng lưới
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Các vùng đề xuất hỗ trợ
            </h2>
            <p className="mt-1 text-sm text-slate-600">Ý tưởng từ cộng đồng — mở Khám phá để xem trẻ và trung tâm.</p>
          </div>
          <Link href="/explore" className="hidden shrink-0 text-sm font-semibold text-blue-800 hover:underline sm:inline">
            Xem tất cả trong Khám phá →
          </Link>
        </div>

        {regionsLoading ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center text-sm text-slate-500">
            Chưa có đề xuất công khai. Hãy thử Khám phá trung tâm và trẻ em.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.map((s) => (
              <Link
                key={s.id}
                href="/explore"
                className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <p className="flex items-start gap-2 font-semibold text-slate-900">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" />
                  {s.region || 'Vùng'}
                </p>
                {s.content && <p className="mt-2 line-clamp-3 text-xs text-slate-600">{s.content}</p>}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-800 group-hover:underline">
                  Mở Khám phá <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}

        <Link href="/explore" className="mt-6 inline-block text-sm font-semibold text-blue-800 hover:underline sm:hidden">
          Xem tất cả trong Khám phá →
        </Link>
      </section>
    </GuestPublicShell>
  );
}
