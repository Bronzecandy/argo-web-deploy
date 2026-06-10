'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import ChildProfileDetailContent from '@/src/components/child/ChildProfileDetailContent';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import ContextBanner from '@/src/components/ui/ContextBanner';
import { inputClass, selectClass } from '@/src/lib/uiClasses';
import { mergeChildProfileDetail } from '@/src/lib/childDisplay';
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

export default function AdminChildrenPage() {
  const [childLoading, setChildLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [childPage, setChildPage] = useState(0);
  const [childTotalPages, setChildTotalPages] = useState(1);
  const [childRegion, setChildRegion] = useState('');
  const [childGender, setChildGender] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailListRow, setDetailListRow] = useState<Child | null>(null);
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
    setDetailChild(null);
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

  function openDetail(row: Child) {
    setDetailListRow(row);
    setDetailId(row.id);
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
                    openDetail(c);
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
          setDetailListRow(null);
        }}
        loading={detailLoading}
        error={detailErr}
        extraWide
      >
        {(() => {
          const listRow = detailListRow;
          const detail = detailChild;
          if (!listRow && !detail) return null;
          const c = mergeChildProfileDetail(listRow ?? detail!, detail);
          return <ChildProfileDetailContent child={c} />;
        })()}
      </DetailModal>
    </div>
  );
}
