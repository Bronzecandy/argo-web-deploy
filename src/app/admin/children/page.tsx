'use client';

import { useCallback, useEffect, useState } from 'react';
import { Baby } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import { BLOB_URL } from '@/src/lib/constants';
import { blobService } from '@/src/services/blob.service';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { childrenService } from '@/src/services/children.service';
import type { Child } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const GENDER_OPTIONS = [
  { value: '', label: 'All genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function AdminChildrenPage() {
  const [childLoading, setChildLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [childPage, setChildPage] = useState(0);
  const [childTotalPages, setChildTotalPages] = useState(1);
  const [childRegion, setChildRegion] = useState('');
  const [childGender, setChildGender] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailChild, setDetailChild] = useState<Child | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    setChildLoading(true);
    try {
      const res = await childrenService.list({
        page: childPage,
        page_size: PAGE_SIZE,
        region: childRegion.trim() || undefined,
        gender: childGender || undefined,
      });
      const body = res.data;
      setChildren(Array.isArray(body.data) ? body.data : []);
      setChildTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Failed to load children');
      setChildren([]);
    } finally {
      setChildLoading(false);
    }
  }, [childPage, childRegion, childGender]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (!detailOpen || !detailId) {
      setDetailChild(null);
      setDetailErr(null);
      return;
    }
    setDetailLoading(true);
    setDetailErr(null);
    void childrenService
      .getById(detailId)
      .then((res) => setDetailChild(res.data ?? null))
      .catch((e: unknown) => {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : 'Failed to load';
        setDetailErr(msg);
      })
      .finally(() => setDetailLoading(false));
  }, [detailOpen, detailId]);

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Children"
        description="Browse on-chain child profiles (upload request review is handled by local leaders)"
        actions={
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
            Admin
          </span>
        }
      />

      <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <Baby className="h-4 w-4 text-blue-800" />
        <span>Child profiles list</span>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Region"
            value={childRegion}
            onChange={(e) => {
              setChildRegion(e.target.value);
              setChildPage(0);
            }}
            className="min-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
          />
          <select
            value={childGender}
            onChange={(e) => {
              setChildGender(e.target.value);
              setChildPage(0);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value || 'all-cg'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <DataTable<Child>
          columns={[
            { key: 'id', label: 'ID', render: (c) => <span className="font-mono text-xs">{truncateAddress(c.id, 8)}</span> },
            {
              key: 'name',
              label: 'Name',
              render: (c) => (
                <span>
                  {c.first_name} {c.last_name}
                </span>
              ),
            },
            { key: 'gender', label: 'Gender', render: (c) => <span className="capitalize">{c.gender}</span> },
            { key: 'region', label: 'Region' },
            { key: 'date_of_birth', label: 'Date of birth', render: (c) => formatDate(c.date_of_birth) },
            {
              key: 'identity_code',
              label: 'Identity',
              render: (c) => <span className="font-mono text-xs">{truncateAddress(c.identity_code, 10)}</span>,
            },
            {
              key: 'actions',
              label: 'Actions',
              className: 'whitespace-nowrap',
              render: (c) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetail(c.id);
                  }}
                  className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50"
                >
                  Details
                </button>
              ),
            },
          ]}
          data={children}
          loading={childLoading}
          page={childPage}
          totalPages={childTotalPages}
          onPageChange={(p) => setChildPage(p)}
          emptyMessage="No children found for the selected filters."
        />
      </div>

      <DetailModal
        title="Child profile"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
        loading={detailLoading}
        error={detailErr}
        wide
      >
        {detailChild && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-4">
              {detailChild.avatar_blob_id && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">Avatar</p>
                  <BlobImage
                    blobId={detailChild.avatar_blob_id}
                    source="api"
                    className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                  />
                </div>
              )}
              {(() => {
                const homeBid = detailChild.home_blob_id?.trim();
                if (!homeBid) return null;
                const homeUrl = blobService.getUrl(homeBid);
                return (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Home</p>
                    {homeUrl ? (
                      <a href={homeUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <WalrusFallbackImg
                          blobId={homeBid}
                          className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                        />
                      </a>
                    ) : (
                      <WalrusFallbackImg
                        blobId={homeBid}
                        className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                  </div>
                );
              })()}
            </div>
            <p>
              <span className="text-slate-500">Name:</span>{' '}
              <span className="font-medium">
                {detailChild.first_name} {detailChild.last_name}
              </span>
            </p>
            <p>
              <span className="text-slate-500">ID:</span>{' '}
              <span className="font-mono text-xs break-all">{detailChild.id}</span>
            </p>
            <p>
              <span className="text-slate-500">Region:</span> {detailChild.region}
            </p>
            <p>
              <span className="text-slate-500">DOB:</span> {formatDate(detailChild.date_of_birth)}
            </p>
            <p>
              <span className="text-slate-500">Home:</span> {detailChild.home_address || '—'}
            </p>
            {detailChild.image_blob_ids && detailChild.image_blob_ids.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Gallery</p>
                <div className="flex flex-wrap gap-2">
                  {detailChild.image_blob_ids.map((bid) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={bid}
                      src={BLOB_URL(bid)}
                      alt=""
                      className="h-20 w-20 rounded-md border border-slate-200 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
