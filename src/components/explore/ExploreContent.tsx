'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { centerService } from '@/src/services/center.service';
import { regionService } from '@/src/services/region.service';
import { childrenService } from '@/src/services/children.service';
import { listCampaignCenters } from '@/src/services/campaign.service';
import { BLOB_URL } from '@/src/lib/constants';
import PageHeader from '@/src/components/ui/PageHeader';
import type { SupportCenter, Child } from '@/src/types/api.types';
import { Building2, MapPin, Baby, Search, Megaphone } from 'lucide-react';

export interface ExploreContentProps {
  title?: string;
  description?: string;
  childHref: (childId: string) => string;
  campaignRegionHref: (region: string) => string;
}

function ExploreInner({
  title = 'Khám phá',
  description = 'Xem trung tâm và trẻ em trong mạng AgroTrust',
  childHref,
  campaignRegionHref,
}: ExploreContentProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: 'centers' | 'children' | 'campaigns' =
    tabParam === 'children' ? 'children' : tabParam === 'campaigns' ? 'campaigns' : 'centers';
  const [tab, setTab] = useState<'centers' | 'children' | 'campaigns'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'children') setTab('children');
    else if (t === 'campaigns') setTab('campaigns');
    else if (t === 'centers') setTab('centers');
  }, [searchParams]);
  const [centers, setCenters] = useState<SupportCenter[]>([]);
  const [campaignCenters, setCampaignCenters] = useState<SupportCenter[]>([]);
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
        page_size: 20,
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
        page_size: 20,
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

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const body = await listCampaignCenters({
        page,
        page_size: 20,
        region: selectedRegion || undefined,
        keyword: keyword || undefined,
      });
      setCampaignCenters(body.data || []);
      setTotalPages(body.total_pages || 1);
    } catch {
      setCampaignCenters([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedRegion, keyword]);

  useEffect(() => {
    if (tab === 'centers') void loadCenters();
    else if (tab === 'children') void loadChildren();
    else void loadCampaigns();
  }, [tab, loadCenters, loadChildren, loadCampaigns]);

  return (
    <div>
      <PageHeader title={title} description={description} />

      <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80">
        <button
          type="button"
          onClick={() => setTab('centers')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'centers' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-4 w-4" /> Trung tâm
        </button>
        <button
          type="button"
          onClick={() => setTab('children')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'children' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Baby className="h-4 w-4" /> Trẻ em
        </button>
        <button
          type="button"
          onClick={() => setTab('campaigns')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'campaigns' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="h-4 w-4" /> Điểm vùng
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        >
          <option value="">Tất cả vùng</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
        </div>
      ) : tab === 'centers' ? (
        <>
          {centers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
              Không tìm thấy trung tâm
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {centers.map((center) => (
                <div
                  key={center.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-800" />
                      <div>
                        <p className="font-semibold text-slate-900">{center.region}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{center.center_address}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Phone: {center.center_phone_number || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : tab === 'children' ? (
        <>
          {children.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
              Không tìm thấy trẻ em
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children.map((ch) => (
                <Link
                  key={ch.id}
                  href={childHref(ch.id)}
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                    {ch.avatar_blob_id ? (
                      <img
                        src={BLOB_URL(ch.avatar_blob_id)}
                        alt={`${ch.first_name} ${ch.last_name}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <Baby className="h-10 w-10 text-slate-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-slate-900 group-hover:text-blue-900">
                      {ch.first_name} {ch.last_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {ch.region}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      DOB: {ch.date_of_birth} · {ch.gender}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {campaignCenters.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
              Không tìm thấy điểm vùng
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaignCenters.map((center) => (
                <Link
                  key={center.id}
                  href={campaignRegionHref(center.region)}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-800" />
                      <div>
                        <p className="font-semibold text-slate-900">{center.region}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{center.center_address}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-blue-800">Xem quỹ và trẻ em →</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {!loading &&
        ((tab === 'centers' && centers.length > 0) ||
          (tab === 'children' && children.length > 0) ||
          (tab === 'campaigns' && campaignCenters.length > 0)) && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Trang {page + 1} / {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(Math.max(1, totalPages) - 1, p + 1))}
              disabled={page >= Math.max(1, totalPages) - 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
}

export function ExploreContent(props: ExploreContentProps) {
  return (
    <Suspense fallback={<div className="flex h-48 items-center justify-center text-slate-500">Đang tải…</div>}>
      <ExploreInner {...props} />
    </Suspense>
  );
}
