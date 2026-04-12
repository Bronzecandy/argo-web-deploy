'use client';

import { useEffect, useState, useCallback } from 'react';
import { centerService } from '@/src/services/center.service';
import { regionService } from '@/src/services/region.service';
import { childrenService } from '@/src/services/children.service';
import { BLOB_URL } from '@/src/lib/constants';
import PageHeader from '@/src/components/ui/PageHeader';
import type { CenterRequest, Child } from '@/src/types/api.types';
import { Building2, MapPin, Baby, Search } from 'lucide-react';

export default function DonorDiscoverPage() {
  const [tab, setTab] = useState<'centers' | 'children'>('centers');
  const [centers, setCenters] = useState<CenterRequest[]>([]);
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

  const loadCenters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await centerService.list({
        page,
        page_size: 12,
        status: 'approved',
        region: selectedRegion || undefined,
        keyword: keyword || undefined,
      });
      setCenters(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
    } catch {
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedRegion, keyword]);

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
  }, [tab, selectedRegion, keyword]);

  useEffect(() => {
    if (tab === 'centers') void loadCenters();
    else void loadChildren();
  }, [tab, loadCenters, loadChildren]);

  return (
    <div>
      <PageHeader
        title="Discover"
        description="Browse centers and children in the AgroTrust network"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('centers')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'centers' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-4 w-4" /> Centers
        </button>
        <button
          onClick={() => setTab('children')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'children' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Baby className="h-4 w-4" /> Children
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
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
      ) : tab === 'centers' ? (
        <>
          {centers.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              No centers found
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {centers.map((center) => (
                <div key={center.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  {center.image_blob_id && (
                    <div className="h-40 overflow-hidden bg-slate-100">
                      <img
                        src={BLOB_URL(center.image_blob_id)}
                        alt="Center"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-slate-900">{center.region}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{center.address}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Phone: {center.phone_number || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {children.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              No children found
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children.map((child) => (
                <a key={child.id} href={`/donor/children/${child.id}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="flex h-36 items-center justify-center overflow-hidden bg-slate-100">
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
                  <div className="p-3">
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-700">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {child.region}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      DOB: {child.date_of_birth} &middot; {child.gender}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
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
