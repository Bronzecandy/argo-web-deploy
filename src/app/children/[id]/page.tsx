'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { childrenService } from '@/src/services/children.service';
import { childNeedsService, type BookNeed, type MealNeed, type HealthInsuranceNeed } from '@/src/services/child-needs.service';
import { BLOB_URL } from '@/src/lib/constants';
import { formatVND } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import type { Child } from '@/src/types/api.types';
import { toast } from 'sonner';
import GuestPublicShell from '@/src/components/guest/GuestPublicShell';
import { MapPin, Calendar, Utensils, BookOpen, HeartPulse, Sparkles, HandCoins } from 'lucide-react';

export default function PublicChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [mealNeed, setMealNeed] = useState<MealNeed | null>(null);
  const [booksNeeds, setBooksNeeds] = useState<BookNeed[]>([]);
  const [healthNeed, setHealthNeed] = useState<HealthInsuranceNeed | null>(null);
  const [loading, setLoading] = useState(true);

  const returnToApp = `/donor/children/${id ?? ''}`;

  const loadChild = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMealNeed(null);
    setHealthNeed(null);
    setBooksNeeds([]);
    try {
      const res = await childrenService.getById(id);
      const c = res.data ?? null;
      setChild(c);
      if (!c) return;

      const promises: Promise<void>[] = [];

      if (c.meal_need) {
        promises.push(childNeedsService.getMealNeed(c.meal_need).then((r) => setMealNeed(r.data)).catch(() => {}));
      }

      if (c.health_insurance_need) {
        promises.push(
          childNeedsService.getHealthInsuranceNeed(c.health_insurance_need).then((r) => setHealthNeed(r.data)).catch(() => {}),
        );
      }

      if (c.books_needs?.length) {
        for (const bnId of c.books_needs) {
          promises.push(
            childNeedsService.getBooksNeed(bnId).then((r) => setBooksNeeds((prev) => [...prev, r.data])).catch(() => {}),
          );
        }
      }

      await Promise.all(promises);
    } catch {
      toast.error('Failed to load child details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadChild();
  }, [loadChild]);

  if (loading) {
    return (
      <GuestPublicShell>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
        </div>
      </GuestPublicShell>
    );
  }

  if (!child) {
    return (
      <GuestPublicShell>
        <p className="py-12 text-center text-slate-500">Child not found</p>
      </GuestPublicShell>
    );
  }

  const loginHref = `/login?returnUrl=${encodeURIComponent(returnToApp)}`;

  return (
    <GuestPublicShell>
      <Link href="/explore?tab=children" className="mb-4 inline-block text-sm font-medium text-blue-800 hover:underline">
        ← Back to Explore
      </Link>

      <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
        <p className="text-sm text-amber-950">
          You&apos;re viewing a public profile. To sponsor needs, send gifts, or donate, sign in first.
        </p>
        <Link
          href={loginHref}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <HandCoins className="h-4 w-4" /> Sign in to support this child
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {child.avatar_blob_id && (
              <img
                src={BLOB_URL(child.avatar_blob_id)}
                alt={`${child.first_name} ${child.last_name}`}
                className="h-56 w-full object-cover"
              />
            )}
            <div className="p-5">
              <h2 className="text-xl font-bold text-slate-900">
                {child.first_name} {child.last_name}
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> {child.region}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" /> {child.date_of_birth} · {child.gender}
                </p>
              </div>
              {child.home_address && <p className="mt-3 text-xs text-slate-400">Home: {child.home_address}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <PageHeader title="Needs overview" description="Verified needs for this child (read-only)" />

          {mealNeed && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Meal need</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Monthly cost:</span>{' '}
                  <span className="font-medium">{formatVND(mealNeed.value)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Remaining months:</span>{' '}
                  <span className="font-medium">{mealNeed.remaining_months}</span>
                </div>
              </div>
            </div>
          )}

          {booksNeeds.map((bn) => (
            <div key={bn.id} className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Books need</h3>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Cost:</span> <span className="font-medium">{formatVND(bn.value)}</span>
              </div>
            </div>
          ))}

          {healthNeed && (
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Health insurance need</h3>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Cost:</span>{' '}
                <span className="font-medium">{formatVND(healthNeed.value)}</span>
              </div>
            </div>
          )}

          {child.special_need_campaigns?.length ? (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-600" />
                <h3 className="font-semibold text-rose-900">Special need campaigns</h3>
              </div>
              <ul className="space-y-1 font-mono text-xs text-slate-600">
                {child.special_need_campaigns.map((cId) => (
                  <li key={cId}>{cId}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {!mealNeed && booksNeeds.length === 0 && !healthNeed && !child.special_need_campaigns?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
              No active needs listed for this child
            </div>
          )}

          <Link
            href={loginHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 py-3 text-sm font-semibold text-white hover:bg-blue-900 sm:w-auto sm:px-8"
          >
            <HandCoins className="h-4 w-4" /> Sign in to sponsor
          </Link>
        </div>
      </div>
    </GuestPublicShell>
  );
}
