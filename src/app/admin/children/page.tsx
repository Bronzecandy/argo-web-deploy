'use client';

import { useCallback, useEffect, useState } from 'react';
import { Baby } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
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

  return (
    <div className="p-6">
      <PageHeader
        title="Children"
        description="Browse on-chain child profiles (upload request review is handled by local leaders)"
        actions={
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            Admin
          </span>
        }
      />

      <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <Baby className="h-4 w-4 text-emerald-600" />
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
            className="min-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
          />
          <select
            value={childGender}
            onChange={(e) => {
              setChildGender(e.target.value);
              setChildPage(0);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-600/20 focus:ring-2"
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
          ]}
          data={children}
          loading={childLoading}
          page={childPage}
          totalPages={childTotalPages}
          onPageChange={(p) => setChildPage(p)}
          emptyMessage="No children found for the selected filters."
        />
      </div>
    </div>
  );
}
