'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getEstablishedRegion } from '@/src/services/campaign.service';
import { BLOB_URL } from '@/src/lib/constants';
import { formatVND } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import type { EstablishedRegionChild, EstablishedRegionDetail } from '@/src/types/api.types';
import { Building2, Baby, MapPin, Phone } from 'lucide-react';
import ExpandableImage from '@/src/components/ui/ExpandableImage';
import { toast } from 'sonner';

const PAGE_SIZE = 12;

export interface CampaignRegionViewProps {
  backHref: string;
  backLabel: string;
  childHref: (childId: string) => string;
}

export function CampaignRegionView({ backHref, backLabel, childHref }: CampaignRegionViewProps) {
  const params = useParams<{ region: string }>();
  const region = decodeURIComponent(params.region || '');

  const [data, setData] = useState<EstablishedRegionDetail | null>(null);
  const [childrenList, setChildrenList] = useState<EstablishedRegionChild[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(
    async (p: number, resetInfo: boolean) => {
      if (!region) return;
      setLoading(true);
      try {
        const res = await getEstablishedRegion(region, p, PAGE_SIZE);
        if (resetInfo) setData(res);
        const chunk = res.children?.data ?? [];
        setChildrenList((prev) => {
          if (resetInfo) return chunk;
          const seen = new Set(prev.map((c) => c.id));
          const merged = [...prev];
          for (const c of chunk) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              merged.push(c);
            }
          }
          return merged;
        });
        setTotalPages(Math.max(1, res.children?.total_pages ?? 1));
        setPage(p);
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        toast.error(msg || 'Không tải được vùng');
        if (resetInfo) {
          setData(null);
          setChildrenList([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [region],
  );

  useEffect(() => {
    if (!region) return;
    void loadPage(0, true);
  }, [region, loadPage]);

  const imageId = data?.center_image_blob_id?.trim();

  return (
    <div>
      <PageHeader
        title={region || 'Vùng'}
        description="Điểm vùng đã thiết lập — quỹ và trẻ em trong khu vực chiến dịch"
      />

      <Link href={backHref} className="mb-4 inline-block text-sm font-medium text-blue-800 hover:underline">
        ← {backLabel}
      </Link>

      {!region ? (
        <p className="text-slate-600">Vùng không hợp lệ.</p>
      ) : loading && !data ? (
        <div className="flex h-48 justify-center">
          <div className="h-8 w-8 animate-spin self-center rounded-full border-4 border-blue-800 border-t-transparent" />
        </div>
      ) : !data ? (
        <p className="text-slate-600">Không có dữ liệu cho vùng này.</p>
      ) : (
        <>
          <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,200px)_1fr]">
              <div className="flex h-44 overflow-hidden rounded-xl bg-slate-100 md:h-full md:min-h-[160px]">
                {imageId ? (
                  <ExpandableImage src={BLOB_URL(imageId)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex w-full items-center justify-center">
                    <Building2 className="h-14 w-14 text-slate-300" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{data.region}</h2>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {data.center_address || '—'}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4" /> {data.center_phone_number || '—'}
                </p>
                <p className="mt-3 text-sm">
                  <span className="text-slate-500">Quỹ:</span>{' '}
                  <span className="font-mono text-xs">{data.pool_id}</span>
                </p>
                <p className="mt-2 text-lg font-semibold text-blue-900">
                  Tổng đã quyên góp: {formatVND(typeof data.total_donated === 'number' ? data.total_donated : 0)}
                </p>
              </div>
            </div>
          </div>

          <h3 className="mb-4 text-base font-semibold text-slate-900">Trẻ em trong vùng này</h3>
          {childrenList.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">Không có trẻ em trên trang này.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {childrenList.map((c) => (
                <Link
                  key={c.id}
                  href={childHref(c.id)}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <Baby className="h-8 w-8 text-blue-200" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs capitalize text-slate-500">{c.gender || '—'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {page + 1 < totalPages && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadPage(page + 1, false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
              >
                {loading ? 'Đang tải…' : 'Tải thêm'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
