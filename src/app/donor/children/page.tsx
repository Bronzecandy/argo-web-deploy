'use client';

import { useEffect, useState, useCallback } from 'react';
import { childrenService } from '@/src/services/children.service';
import { regionService } from '@/src/services/region.service';
import { BLOB_URL } from '@/src/lib/constants';
import PageHeader from '@/src/components/ui/PageHeader';
import type { Child } from '@/src/types/api.types';
import { Baby, MapPin, Search } from 'lucide-react';
import Link from 'next/link';

export default function DonorChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const res = await childrenService.list({
        page,
        page_size: 12,
        region: selectedRegion || undefined,
        keyword: keyword || undefined,
      });
      setChildren(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedRegion, keyword]);

  useEffect(() => {
    setPage(0);
  }, [selectedRegion, keyword]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  return (
    <div>
      <PageHeader
        title="Children"
        description="Browse children and sponsor their needs"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          No children found
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/donor/children/${child.id}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-100">
                {child.avatar_blob_id ? (
                  <img
                    src={BLOB_URL(child.avatar_blob_id)}
                    alt={`${child.first_name} ${child.last_name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Baby className="h-10 w-10 text-slate-300" />
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900 group-hover:text-emerald-700">
                  {child.first_name} {child.last_name}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" /> {child.region}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {child.gender} &middot; DOB: {child.date_of_birth}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {child.meal_need && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                      Meal
                    </span>
                  )}
                  {child.health_insurance_need && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                      Health
                    </span>
                  )}
                  {child.books_needs?.length > 0 && (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                      Books
                    </span>
                  )}
                  {child.special_need_campaigns?.length > 0 && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-200">
                      Special
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
