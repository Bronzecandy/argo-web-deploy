'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/src/store/hooks';
import { childrenService } from '@/src/services/children.service';
import { BLOB_URL } from '@/src/lib/constants';
import { formatDate } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import type { Child } from '@/src/types/api.types';
import { Baby, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export default function DonorTrackPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [children, setChildren] = useState<Child[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const addr = user?.address?.trim();
    if (!addr) {
      setChildren([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await childrenService.listSupportedByWallet(addr, {
        page,
        page_size: PAGE_SIZE,
      });
      setChildren(res.data.data ?? []);
      setTotalPages(Math.max(1, res.data.total_pages ?? 1));
      setTotalAmount(res.data.amount ?? 0);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Failed to load supported children');
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="My track"
        description={
          user?.address
            ? `Children you support — ${totalAmount.toLocaleString('vi-VN')} total (API count)`
            : 'Sign in to see children you have supported'
        }
      />

      {!user?.address ? (
        <p className="text-sm text-slate-600">Connect your wallet to load this list.</p>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No supported children yet. Explore the network to donate.
          <div className="mt-4">
            <Link href="/donor/discover" className="text-blue-800 font-medium hover:underline">
              Go to Discover
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/donor/children/${child.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-36 items-center justify-center overflow-hidden bg-slate-100">
                  {child.avatar_blob_id ? (
                    <img
                      src={BLOB_URL(child.avatar_blob_id)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Baby className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-slate-900 group-hover:text-blue-900">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {child.region}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">DOB: {formatDate(child.date_of_birth)}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
