'use client';

import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { childrenService } from '@/src/services/children.service';
import { childNeedsService, type BookNeed, type MealNeed, type HealthInsuranceNeed } from '@/src/services/child-needs.service';
import { giftService } from '@/src/services/gift.service';
import { BLOB_URL } from '@/src/lib/constants';
import { formatVND, formatDate } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import type { Child, Gift } from '@/src/types/api.types';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Utensils,
  BookOpen,
  HeartPulse,
  Sparkles,
  HandCoins,
  Gift as GiftIcon,
  Send,
} from 'lucide-react';

export default function DonorChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [mealNeed, setMealNeed] = useState<MealNeed | null>(null);
  const [booksNeeds, setBooksNeeds] = useState<BookNeed[]>([]);
  const [healthNeed, setHealthNeed] = useState<HealthInsuranceNeed | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [giftPage, setGiftPage] = useState(0);
  const [giftTotalPages, setGiftTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const GIFT_PAGE_SIZE = 20;

  // Sponsor form state
  const [sponsorType, setSponsorType] = useState<'meal' | 'books' | 'health' | 'special' | null>(null);
  const [sponsorNeedId, setSponsorNeedId] = useState('');
  const [mealMonths, setMealMonths] = useState(1);
  const [specialAmount, setSpecialAmount] = useState(0);
  const [specialDescription, setSpecialDescription] = useState('');
  const [specialCampaignId, setSpecialCampaignId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    setGiftPage(0);
  }, [id]);

  const loadChild = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await childrenService.getById(id);
      const c = res.data;
      setChild(c);

      const promises: Promise<void>[] = [];

      if (c.meal_need) {
        promises.push(
          childNeedsService.getMealNeed(c.meal_need).then((r) => setMealNeed(r.data)).catch(() => {})
        );
      }

      if (c.health_insurance_need) {
        promises.push(
          childNeedsService.getHealthInsuranceNeed(c.health_insurance_need).then((r) => setHealthNeed(r.data)).catch(() => {})
        );
      }

      if (c.books_needs?.length) {
        for (const bnId of c.books_needs) {
          promises.push(
            childNeedsService.getBooksNeed(bnId).then((r) => setBooksNeeds((prev) => [...prev, r.data])).catch(() => {})
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

  const loadGifts = useCallback(async () => {
    if (!id) return;
    setGiftsLoading(true);
    try {
      const r = await giftService.listByChild(id, {
        page: giftPage,
        page_size: GIFT_PAGE_SIZE,
        sort_order: 'desc',
      });
      setGifts(Array.isArray(r.data.data) ? r.data.data : []);
      setGiftTotalPages(Math.max(1, r.data.total_pages ?? 1));
    } catch {
      setGifts([]);
      setGiftTotalPages(1);
    } finally {
      setGiftsLoading(false);
    }
  }, [id, giftPage]);

  useEffect(() => {
    void loadChild();
  }, [loadChild]);

  useEffect(() => {
    if (!id) return;
    void loadGifts();
  }, [id, loadGifts]);

  const handleSponsorMeal = async () => {
    if (!sponsorNeedId) return;
    setSubmitting(true);
    try {
      const res = await childrenService.supportMealNeed(sponsorNeedId, mealMonths);
      if (res.data.url) {
        window.open(res.data.url, '_blank');
        toast.success('Payment page opened');
      }
      setSponsorType(null);
    } catch {
      toast.error('Failed to sponsor meal need');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSponsorBooks = async () => {
    if (!sponsorNeedId) return;
    setSubmitting(true);
    try {
      const res = await childrenService.supportBooksNeed(sponsorNeedId);
      if (res.data.url) {
        window.open(res.data.url, '_blank');
        toast.success('Payment page opened');
      }
      setSponsorType(null);
    } catch {
      toast.error('Failed to sponsor books need');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSponsorHealth = async () => {
    if (!sponsorNeedId) return;
    setSubmitting(true);
    try {
      const res = await childrenService.supportHealthInsuranceNeed(sponsorNeedId);
      if (res.data.url) {
        window.open(res.data.url, '_blank');
        toast.success('Payment page opened');
      }
      setSponsorType(null);
    } catch {
      toast.error('Failed to sponsor health insurance need');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSponsorSpecial = async () => {
    if (!specialCampaignId || !specialAmount) return;
    setSubmitting(true);
    try {
      const res = await childrenService.supportSpecialNeed(specialCampaignId, {
        amount: specialAmount,
        description: specialDescription,
      });
      if (res.data.url) {
        window.open(res.data.url, '_blank');
        toast.success('Payment page opened');
      }
      setSponsorType(null);
    } catch {
      toast.error('Failed to sponsor special need');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center text-slate-400 py-12">Child not found</div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: child info */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {child.region}</p>
                <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /> {child.date_of_birth} &middot; {child.gender}</p>
              </div>

              {child.home_address && (
                <p className="mt-3 text-xs text-slate-400">Home: {child.home_address}</p>
              )}

              {child.image_blob_ids?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {child.image_blob_ids.map((blobId, i) => (
                      <img
                        key={i}
                        src={BLOB_URL(blobId)}
                        alt={`Photo ${i + 1}`}
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: needs + actions */}
        <div className="space-y-4 lg:col-span-2">
          <PageHeader title="Needs & Sponsorship" description="Support this child by sponsoring their specific needs" />

          {/* Meal Need */}
          {mealNeed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Meal Need</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Monthly cost:</span> <span className="font-medium">{formatVND(mealNeed.value)}</span></div>
                <div><span className="text-slate-500">Remaining months:</span> <span className="font-medium">{mealNeed.remaining_months}</span></div>
                <div><span className="text-slate-500">Pool balance:</span> <span className="font-medium">{formatVND(mealNeed.balance)}</span></div>
                <div><span className="text-slate-500">Total donated:</span> <span className="font-medium">{formatVND(mealNeed.total_donation)}</span></div>
              </div>
              <button
                onClick={() => { setSponsorType('meal'); setSponsorNeedId(mealNeed.id); }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                <HandCoins className="h-4 w-4" /> Sponsor Meals
              </button>
            </div>
          )}

          {/* Books Needs */}
          {booksNeeds.map((bn) => (
            <div key={bn.id} className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Books Need</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Cost:</span> <span className="font-medium">{formatVND(bn.value)}</span></div>
                <div><span className="text-slate-500">Pool balance:</span> <span className="font-medium">{formatVND(bn.balance)}</span></div>
                <div><span className="text-slate-500">Total donated:</span> <span className="font-medium">{formatVND(bn.total_donation)}</span></div>
              </div>
              <button
                onClick={() => { setSponsorType('books'); setSponsorNeedId(bn.id); }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                <HandCoins className="h-4 w-4" /> Sponsor Books
              </button>
            </div>
          ))}

          {/* Health Insurance Need */}
          {healthNeed && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <HeartPulse className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Health Insurance Need</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Cost:</span> <span className="font-medium">{formatVND(healthNeed.value)}</span></div>
                <div><span className="text-slate-500">Pool balance:</span> <span className="font-medium">{formatVND(healthNeed.balance)}</span></div>
                <div><span className="text-slate-500">Total donated:</span> <span className="font-medium">{formatVND(healthNeed.total_donation)}</span></div>
              </div>
              <button
                onClick={() => { setSponsorType('health'); setSponsorNeedId(healthNeed.id); }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <HandCoins className="h-4 w-4" /> Sponsor Health Insurance
              </button>
            </div>
          )}

          {/* Special Need Campaigns */}
          {child.special_need_campaigns?.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-rose-600" />
                <h3 className="font-semibold text-rose-900">Special Need Campaigns</h3>
              </div>
              <div className="space-y-2">
                {child.special_need_campaigns.map((cId) => (
                  <div key={cId} className="flex items-center justify-between rounded-lg bg-white p-3 border border-rose-100">
                    <span className="text-sm font-mono text-slate-600">{cId}</span>
                    <button
                      onClick={() => { setSponsorType('special'); setSpecialCampaignId(cId); }}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                    >
                      Support
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gifts */}
          {(gifts.length > 0 || giftsLoading) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <GiftIcon className="h-5 w-5 text-blue-800" />
                <h3 className="font-semibold text-slate-900">Gifts Received</h3>
              </div>
              {giftsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {gifts.map((g) => (
                      <div key={g.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                        {g.gift_image_blob_id && (
                          <img src={BLOB_URL(g.gift_image_blob_id)} alt="Gift" className="h-10 w-10 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{g.category}: {g.description}</p>
                          <p className="text-xs text-slate-400">{formatDate(g.uploaded_at)}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          g.status === 'delivered' ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {g.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  {gifts.length > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setGiftPage((p) => Math.max(0, p - 1))}
                        disabled={giftsLoading || giftPage <= 0}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-500">
                        Page {giftPage + 1} of {giftTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGiftPage((p) => Math.min(giftTotalPages - 1, p + 1))}
                        disabled={giftsLoading || giftPage >= giftTotalPages - 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!mealNeed && booksNeeds.length === 0 && !healthNeed && !child.special_need_campaigns?.length && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              No active needs for this child
            </div>
          )}

          {/* Quick action links */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/donor/gifts?childId=${child.id}`}
              className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm font-medium text-pink-700 hover:bg-pink-100 transition"
            >
              <Send className="h-4 w-4" /> Send a Gift to This Child
            </Link>
            {mealNeed?.pool_id && (
              <Link
                href={`/donor/donate?poolId=${mealNeed.pool_id}`}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-100 transition"
              >
                <HandCoins className="h-4 w-4" /> Donate to Meal Pool
              </Link>
            )}
            {healthNeed?.pool_id && (
              <Link
                href={`/donor/donate?poolId=${healthNeed.pool_id}`}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
              >
                <HandCoins className="h-4 w-4" /> Donate to Health Pool
              </Link>
            )}
            {booksNeeds[0]?.pool_id && (
              <Link
                href={`/donor/donate?poolId=${booksNeeds[0].pool_id}`}
                className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-100 transition"
              >
                <HandCoins className="h-4 w-4" /> Donate to Books Pool
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      {sponsorType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {sponsorType === 'meal' && 'Sponsor Meals'}
              {sponsorType === 'books' && 'Sponsor Books'}
              {sponsorType === 'health' && 'Sponsor Health Insurance'}
              {sponsorType === 'special' && 'Support Special Need Campaign'}
            </h3>

            <div className="mt-4 space-y-4">
              {sponsorType === 'meal' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Number of months</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={mealMonths}
                    onChange={(e) => setMealMonths(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                  {mealNeed && (
                    <p className="mt-1 text-xs text-slate-400">
                      Estimated: {formatVND(mealNeed.value * mealMonths)}
                    </p>
                  )}
                </div>
              )}

              {sponsorType === 'special' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (VND)</label>
                    <input
                      type="number"
                      min={1000}
                      value={specialAmount}
                      onChange={(e) => setSpecialAmount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message (optional)</label>
                    <textarea
                      value={specialDescription}
                      onChange={(e) => setSpecialDescription(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setSponsorType(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (sponsorType === 'meal') void handleSponsorMeal();
                  else if (sponsorType === 'books') void handleSponsorBooks();
                  else if (sponsorType === 'health') void handleSponsorHealth();
                  else if (sponsorType === 'special') void handleSponsorSpecial();
                }}
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
