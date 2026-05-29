'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import WalrusFallbackImg from '@/src/components/ui/WalrusFallbackImg';
import ExpandableImage from '@/src/components/ui/ExpandableImage';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import ContextBanner from '@/src/components/ui/ContextBanner';
import { inputClass, selectClass } from '@/src/lib/uiClasses';
import { BLOB_URL } from '@/src/lib/constants';
import { formatDate } from '@/src/lib/formatters';
import { childrenService } from '@/src/services/children.service';
import type { Child } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const GENDER_OPTIONS = [
  { value: '', label: 'Tất cả giới tính' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

function ChildDetailWalrusImage({
  label,
  blobId,
}: {
  label: string;
  blobId: string | null | undefined;
}) {
  const bid = blobId?.trim();
  if (!bid) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <WalrusFallbackImg blobId={bid} alt={label} className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
    </div>
  );
}

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
      toast.error(msg || 'Không tải được danh sách trẻ');
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
            : 'Không tải được';
        setDetailErr(msg);
      })
      .finally(() => setDetailLoading(false));
  }, [detailOpen, detailId]);

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trẻ em"
        description="Xem hồ sơ trẻ trên chuỗi (duyệt yêu cầu upload do trưởng vùng phụ trách)"
        actions={
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
            Quản trị
          </span>
        }
      />

      <ContextBanner>Danh sách hồ sơ trẻ</ContextBanner>

      <FilterToolbar>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Vùng</label>
          <input
            type="text"
            placeholder="Vùng"
            value={childRegion}
            onChange={(e) => {
              setChildRegion(e.target.value);
              setChildPage(0);
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Giới tính</label>
          <select
            value={childGender}
            onChange={(e) => {
              setChildGender(e.target.value);
              setChildPage(0);
            }}
            className={selectClass}
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value || 'all-cg'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </FilterToolbar>

      <PageSection title="Danh sách trẻ em" noPadding>
        <DataTable<Child>
          columns={[
            {
              key: 'name',
              label: 'Họ tên',
              render: (c) => (
                <span>
                  {c.first_name} {c.last_name}
                </span>
              ),
            },
            { key: 'gender', label: 'Giới tính', render: (c) => <span className="capitalize">{c.gender}</span> },
            { key: 'region', label: 'Vùng' },
            { key: 'date_of_birth', label: 'Ngày sinh', render: (c) => formatDate(c.date_of_birth) },
            {
              key: 'identity_code',
              label: 'CMND/CCCD',
              render: (c) => <CopyableTruncated value={c.identity_code} chars={10} />,
            },
            {
              key: 'actions',
              label: 'Thao tác',
              className: 'whitespace-nowrap',
              render: (c) => (
                <TableIconButton
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetail(c.id);
                  }}
                >
                  Chi tiết
                </TableIconButton>
              ),
            },
          ]}
          data={children}
          loading={childLoading}
          page={childPage}
          totalPages={childTotalPages}
          onPageChange={(p) => setChildPage(p)}
          emptyMessage="Không tìm thấy trẻ em phù hợp bộ lọc."
        />
      </PageSection>

      <DetailModal
        title="Hồ sơ trẻ"
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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <ChildDetailWalrusImage label="Ảnh đại diện" blobId={detailChild.avatar_blob_id} />
              <ChildDetailWalrusImage label="Ảnh nhà ở" blobId={detailChild.home_blob_id} />
              <ChildDetailWalrusImage label="Giấy khai sinh" blobId={detailChild.birth_certificate_blob_id} />
              <ChildDetailWalrusImage
                label="CMND/CCCD người giám hộ"
                blobId={detailChild.first_guardian?.identity_card_blob_id}
              />
              <ChildDetailWalrusImage
                label="CMND/CCCD người giám hộ thứ hai"
                blobId={detailChild.second_guardian?.identity_card_blob_id}
              />
            </div>
            <DetailField
              label="Họ tên"
              value={
                <span className="font-medium">
                  {detailChild.first_name} {detailChild.last_name}
                </span>
              }
            />
            <DetailField label="Mã" value={<CopyableTruncated value={detailChild.id} chars={8} />} />
            <DetailField label="Vùng" value={detailChild.region} />
            <DetailField label="Ngày sinh" value={formatDate(detailChild.date_of_birth)} />
            <DetailField label="Địa chỉ nhà" value={detailChild.home_address || '—'} />
            {detailChild.image_blob_ids && detailChild.image_blob_ids.length > 0 && (
              <div className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="text-xs font-medium text-slate-500">Thư viện ảnh</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detailChild.image_blob_ids.map((bid) => (
                    <ExpandableImage
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
