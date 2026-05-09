'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { formatDate } from '@/src/lib/formatters';
import { regionService } from '@/src/services/region.service';
import { registrationService } from '@/src/services/registration.service';
import { useAppSelector } from '@/src/store/hooks';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { SupportedRegionSuggestion, RegistrationRequest } from '@/src/types/api.types';

const PAGE_SIZE = 20;

type TabId = 'suggestions' | 'registrations' | 'mine';

function normalizeList<T>(body: { data?: unknown }): T[] {
  const raw = body.data;
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export default function DonorRegionsPage() {
  const { user } = useAppSelector((s) => s.auth);
  const { execute, executing } = useExecuteTransaction();
  const [tab, setTab] = useState<TabId>('suggestions');

  const [sPage, setSPage] = useState(0);
  const [suggestions, setSuggestions] = useState<SupportedRegionSuggestion[]>([]);
  const [sTotalPages, setSTotalPages] = useState(1);
  const [sLoading, setSLoading] = useState(true);

  const [regs, setRegs] = useState<RegistrationRequest[]>([]);
  const [rLoading, setRLoading] = useState(true);

  const [mPage, setMPage] = useState(0);
  const [mine, setMine] = useState<SupportedRegionSuggestion[]>([]);
  const [mTotalPages, setMTotalPages] = useState(1);
  const [mLoading, setMLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [region, setRegion] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

  const loadSuggestions = useCallback(async () => {
    setSLoading(true);
    try {
      const res = await regionService.listSuggestions({
        page: sPage,
        page_size: PAGE_SIZE,
        sort_order: 'desc',
      });
      setSuggestions(normalizeList<SupportedRegionSuggestion>(res.data));
      setSTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch {
      toast.error('Không tải được đề xuất vùng');
      setSuggestions([]);
    } finally {
      setSLoading(false);
    }
  }, [sPage]);

  const loadRegistrations = useCallback(async () => {
    const addr = user?.address?.trim();
    if (!addr) {
      setRegs([]);
      setRLoading(false);
      return;
    }
    setRLoading(true);
    try {
      const res = await registrationService.getByWallet(addr);
      setRegs(normalizeList<RegistrationRequest>(res.data));
    } catch {
      toast.error('Không tải được đăng ký của bạn');
      setRegs([]);
    } finally {
      setRLoading(false);
    }
  }, [user?.address]);

  const loadMine = useCallback(async () => {
    const addr = user?.address?.trim();
    if (!addr) {
      setMine([]);
      setMLoading(false);
      return;
    }
    setMLoading(true);
    try {
      const res = await regionService.getUserSuggestions(addr, { page: mPage, page_size: PAGE_SIZE });
      setMine(normalizeList<SupportedRegionSuggestion>(res.data));
      setMTotalPages(Math.max(1, res.data.total_pages ?? 1));
    } catch {
      toast.error('Không tải được đề xuất của bạn');
      setMine([]);
    } finally {
      setMLoading(false);
    }
  }, [user?.address, mPage]);

  useEffect(() => {
    if (tab === 'suggestions') void loadSuggestions();
  }, [tab, loadSuggestions]);

  useEffect(() => {
    if (tab === 'registrations') void loadRegistrations();
  }, [tab, loadRegistrations]);

  useEffect(() => {
    if (tab === 'mine') void loadMine();
  }, [tab, loadMine]);

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim() || !content.trim()) {
      toast.error('Cần nhập vùng và mô tả');
      return;
    }
    setSubmitting(true);
    try {
      await regionService.createSuggestion({ region: region.trim(), content: content.trim() });
      toast.success('Đã gửi đề xuất');
      setModalOpen(false);
      setRegion('');
      setContent('');
      setTab('mine');
      setMPage(0);
      void loadMine();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Gửi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRegistration = async (id: string) => {
    const ok = await execute(() => registrationService.confirm(id), {
      successMessage: 'Đã xác nhận đăng ký on-chain',
    });
    if (ok) void loadRegistrations();
  };

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        tab === id ? 'bg-blue-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vùng & đăng ký"
        description="Các vùng cần hỗ trợ, đăng ký vai trò của bạn và đề xuất vùng"
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Đề xuất vùng
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {tabBtn('suggestions', 'Cần hỗ trợ')}
        {tabBtn('registrations', 'Đăng ký của tôi')}
        {tabBtn('mine', 'Đề xuất của tôi')}
      </div>

      {tab === 'suggestions' && (
        <DataTable<SupportedRegionSuggestion>
          loading={sLoading}
          data={suggestions}
          page={sPage}
          totalPages={sTotalPages}
          onPageChange={setSPage}
          emptyMessage="Chưa có đề xuất vùng mở."
          columns={[
            { key: 'region', label: 'Vùng' },
            {
              key: 'content',
              label: 'Nội dung',
              render: (r) => <span className="line-clamp-2 max-w-md text-sm">{r.content}</span>,
            },
            { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status || 'pending'} /> },
            {
              key: 'created_by',
              label: 'Người tạo',
              render: (r) => <CopyableTruncated value={r.created_by} />,
            },
            { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
          ]}
        />
      )}

      {tab === 'registrations' && (
        <>
          {!user?.address && (
            <p className="text-sm text-amber-800">Đăng nhập để xem yêu cầu đăng ký của bạn.</p>
          )}
          <DataTable<RegistrationRequest>
            loading={rLoading}
            data={regs}
            page={0}
            totalPages={1}
            onPageChange={() => {}}
            emptyMessage="Chưa có đăng ký cho ví này."
            columns={[
              { key: 'region', label: 'Vùng' },
              { key: 'register_role', label: 'Vai trò', render: (r) => <span className="capitalize">{r.register_role}</span> },
              { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
              {
                key: 'actions',
                label: 'Thao tác',
                className: 'whitespace-nowrap',
                render: (r) =>
                  r.isAvailableToConfirm ? (
                    <button
                      type="button"
                      disabled={executing}
                      onClick={() => void handleConfirmRegistration(r.id)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 disabled:opacity-50"
                    >
                      Xác nhận on-chain
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  ),
              },
            ]}
          />
        </>
      )}

      {tab === 'mine' && (
        <>
          {!user?.address && (
            <p className="text-sm text-amber-800">Đăng nhập để xem đề xuất bạn đã tạo.</p>
          )}
          <DataTable<SupportedRegionSuggestion>
            loading={mLoading}
            data={mine}
            page={mPage}
            totalPages={mTotalPages}
            onPageChange={setMPage}
            emptyMessage="Bạn chưa gửi đề xuất vùng nào."
            columns={[
              { key: 'region', label: 'Vùng' },
              {
                key: 'content',
                label: 'Nội dung',
                render: (r) => <span className="line-clamp-2 max-w-md text-sm">{r.content}</span>,
              },
              { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status || 'pending'} /> },
              { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
            ]}
          />
        </>
      )}

      <p className="text-xs text-slate-500">
        Để đăng ký Tình nguyện viên hoặc Trưởng vùng kèm giấy tờ, dùng{' '}
        <Link href="/donor/register" className="text-blue-800 hover:underline">
          Đăng ký vai trò
        </Link>
        .
      </p>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Đề xuất vùng được hỗ trợ</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Vùng</label>
                <input
                  list="donor-region-options"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Chọn hoặc nhập tên vùng"
                  required
                />
                <datalist id="donor-region-options">
                  {regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Vì sao vùng này cần hỗ trợ</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? 'Đang gửi…' : 'Gửi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
