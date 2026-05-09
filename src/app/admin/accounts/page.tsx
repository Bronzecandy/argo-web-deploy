'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, formatVND } from '@/src/lib/formatters';
import { registrationService } from '@/src/services/registration.service';
import { staffService } from '@/src/services/staff.service';
import { adminService } from '@/src/services/admin.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import type { RegistrationRequest, Staff } from '@/src/types/api.types';

type Tab = 'registrations' | 'staff';

const PAGE_SIZE = 20;

function isRegistrationApproved(status?: string) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  return s === 'approved';
}

const REG_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'refused', label: 'Từ chối' },
  { value: 'rejected', label: 'Bị từ chối' },
];

type AdminRow = {
  id: string;
  first_name?: string;
  last_name?: string;
  region?: string;
  email?: string;
  phone_number?: string;
};

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function AdminAccountsPage() {
  const { execute } = useExecuteTransaction();
  const [activeTab, setActiveTab] = useState<Tab>('registrations');

  const [regLoading, setRegLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [regTotalAmount, setRegTotalAmount] = useState(0);
  const [regPage, setRegPage] = useState(0);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [regKeyword, setRegKeyword] = useState('');
  const [regStatus, setRegStatus] = useState('');
  const [regSearchDraft, setRegSearchDraft] = useState('');

  const [staffLoading, setStaffLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffPage, setStaffPage] = useState(0);
  const [staffTotalPages, setStaffTotalPages] = useState(1);
  const [staffKeyword, setStaffKeyword] = useState('');
  const [staffSearchDraft, setStaffSearchDraft] = useState('');

  const [adminLoading, setAdminLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [adminPage, setAdminPage] = useState(0);
  const [adminTotalPages, setAdminTotalPages] = useState(1);

  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [confirmBusyId, setConfirmBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [regDetailOpen, setRegDetailOpen] = useState(false);
  const [regDetailId, setRegDetailId] = useState<string | null>(null);
  const [regDetailListRow, setRegDetailListRow] = useState<RegistrationRequest | null>(null);
  const [regDetailData, setRegDetailData] = useState<RegistrationRequest | null>(null);
  const [regDetailLoading, setRegDetailLoading] = useState(false);

  const [staffDetailOpen, setStaffDetailOpen] = useState(false);
  const [staffDetailId, setStaffDetailId] = useState<string | null>(null);
  const [staffDetailListRow, setStaffDetailListRow] = useState<Staff | null>(null);
  const [staffDetailData, setStaffDetailData] = useState<Staff | null>(null);
  const [staffDetailLoading, setStaffDetailLoading] = useState(false);

  const [adminDetailRow, setAdminDetailRow] = useState<AdminRow | null>(null);

  const loadRegistrations = useCallback(async () => {
    setRegLoading(true);
    try {
      const res = await registrationService.list({
        page: regPage,
        page_size: PAGE_SIZE,
        keyword: regKeyword || undefined,
        status: regStatus || undefined,
      });
      const body = res.data;
      setRegistrations(Array.isArray(body.data) ? body.data : []);
      setRegTotalAmount(typeof body.amount === 'number' ? body.amount : 0);
      setRegTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Không tải được yêu cầu đăng ký');
      setRegistrations([]);
    } finally {
      setRegLoading(false);
    }
  }, [regPage, regKeyword, regStatus]);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await staffService.list({
        page: staffPage,
        page_size: PAGE_SIZE,
        keyword: staffKeyword || undefined,
      });
      const body = res.data;
      setStaff(Array.isArray(body.data) ? body.data : []);
      setStaffTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Không tải được nhân sự');
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, [staffPage, staffKeyword]);

  const loadAdmins = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await adminService.list({
        page: adminPage,
        page_size: PAGE_SIZE,
        keyword: staffKeyword || undefined,
      });
      const body = res.data;
      const list: AdminRow[] = Array.isArray(body.data) ? (body.data as AdminRow[]) : [];
      setAdmins(list);
      setAdminTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Không tải được quản trị viên');
      setAdmins([]);
    } finally {
      setAdminLoading(false);
    }
  }, [adminPage, staffKeyword]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    if (activeTab !== 'staff') return;
    void loadStaff();
    void loadAdmins();
  }, [activeTab, loadStaff, loadAdmins]);

  useEffect(() => {
    if (!regDetailOpen || !regDetailId) {
      setRegDetailData(null);
      return;
    }
    setRegDetailLoading(true);
    setRegDetailData(null);
    void registrationService
      .getById(regDetailId)
      .then((res) => setRegDetailData(res.data))
      .catch(() => setRegDetailData(null))
      .finally(() => setRegDetailLoading(false));
  }, [regDetailOpen, regDetailId]);

  useEffect(() => {
    if (!staffDetailOpen || !staffDetailId) {
      setStaffDetailData(null);
      return;
    }
    setStaffDetailLoading(true);
    setStaffDetailData(null);
    void staffService
      .getById(staffDetailId)
      .then((res) => setStaffDetailData(res.data))
      .catch(() => setStaffDetailData(null))
      .finally(() => setStaffDetailLoading(false));
  }, [staffDetailOpen, staffDetailId]);

  async function handleVote(id: string, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id });
      setRefuseReason('');
      return;
    }
    setVoteBusyId(id);
    try {
      await registrationService.vote(id, { is_vote_yes: true });
      toast.success('Đã ghi nhận phiếu');
      await loadRegistrations();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Bỏ phiếu thất bại');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function submitRefuseVote() {
    if (!refuseModal) return;
    const id = refuseModal.id;
    setVoteBusyId(id);
    try {
      await registrationService.vote(id, { is_vote_yes: false, refuse_reason: refuseReason || undefined });
      toast.success('Đã ghi nhận từ chối');
      setRefuseModal(null);
      await loadRegistrations();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Bỏ phiếu thất bại');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function handleConfirm(id: string) {
    setConfirmBusyId(id);
    const ok = await execute(
      () => registrationService.confirm(id),
      { successMessage: 'Đã xác nhận đăng ký và thực thi on-chain' },
    );
    if (ok) await loadRegistrations();
    setConfirmBusyId(null);
  }

  function applyRegSearch() {
    setRegPage(0);
    setRegKeyword(regSearchDraft.trim());
  }

  function applyStaffSearch() {
    setStaffPage(0);
    setAdminPage(0);
    setStaffKeyword(staffSearchDraft.trim());
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Tài khoản"
        description="Duyệt yêu cầu đăng ký và quản lý danh bạ nhân sự"
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('registrations')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === 'registrations'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Yêu cầu đăng ký
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === 'staff'
              ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-800/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          Danh sách nhân sự
        </button>
      </div>

      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Tìm theo từ khóa…"
                  value={regSearchDraft}
                  onChange={(e) => setRegSearchDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyRegSearch()}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-blue-800/20 focus:ring-2"
                />
              </div>
              <select
                value={regStatus}
                onChange={(e) => {
                  setRegStatus(e.target.value);
                  setRegPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2 sm:w-48"
              >
                {REG_STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyRegSearch}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
              >
                Tìm
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Tổng bản ghi khớp: {regTotalAmount.toLocaleString('vi-VN')}
            </p>
          </div>

          <DataTable<RegistrationRequest>
            columns={[
              {
                key: 'name',
                label: 'Tên',
                render: (r) => (
                  <span>
                    {r.first_name} {r.last_name}
                  </span>
                ),
              },
              { key: 'register_role', label: 'Vai trò', render: (r) => <span className="capitalize">{r.register_role}</span> },
              { key: 'region', label: 'Region' },
              { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
              {
                key: 'actions',
                label: 'Thao tác',
                className: 'whitespace-nowrap',
                render: (r) => {
                  const approved = isRegistrationApproved(r.status);
                  return (
                    <div
                      className={`flex flex-wrap gap-1 ${approved ? 'pointer-events-none opacity-40' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setRegDetailListRow(r);
                          setRegDetailId(r.id);
                          setRegDetailOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        disabled={approved || voteBusyId === r.id}
                        onClick={() => handleVote(r.id, true)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Phiếu duyệt"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={approved || voteBusyId === r.id}
                        onClick={() => handleVote(r.id, false)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Phiếu từ chối"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                      {r.isAvailableToConfirm && (
                        <button
                          type="button"
                          disabled={approved || confirmBusyId === r.id}
                          onClick={() => handleConfirm(r.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Xác nhận on-chain"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Xác nhận
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={registrations}
            loading={regLoading}
            page={regPage}
            totalPages={regTotalPages}
            onPageChange={(p) => setRegPage(p)}
            emptyMessage="Không có yêu cầu đăng ký phù hợp bộ lọc."
          />
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm nhân sự & quản trị…"
                value={staffSearchDraft}
                onChange={(e) => setStaffSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyStaffSearch()}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-blue-800/20 focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={applyStaffSearch}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
            >
              Tìm
            </button>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Nhân sự</h2>
            <DataTable<Staff>
              columns={[
                {
                  key: 'id',
                  label: 'ID',
                  className: 'whitespace-nowrap',
                  render: (s) => <CopyableTruncated value={s.id} chars={8} />,
                },
                {
                  key: 'name',
                  label: 'Tên',
                  render: (s) => (
                    <span>
                      {s.first_name} {s.last_name}
                    </span>
                  ),
                },
                { key: 'region', label: 'Vùng' },
                {
                  key: 'role',
                  label: 'Vai trò',
                  render: (s) => {
                    const roles = [...new Set((s.nfts ?? []).map((n) => n.role).filter(Boolean))];
                    if (!roles.length) return <span className="text-slate-400">—</span>;
                    return (
                      <span className="capitalize">
                        {roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
                      </span>
                    );
                  },
                },
                {
                  key: 'details',
                  label: 'Chi tiết',
                  className: 'whitespace-nowrap',
                  render: (s) => (
                    <button
                      type="button"
                      onClick={() => {
                        setStaffDetailListRow(s);
                        setStaffDetailId(s.id);
                        setStaffDetailOpen(true);
                      }}
                      className="rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50"
                    >
                      Chi tiết
                    </button>
                  ),
                },
              ]}
              data={staff}
              loading={staffLoading}
              page={staffPage}
              totalPages={staffTotalPages}
              onPageChange={(p) => setStaffPage(p)}
              emptyMessage="Không tìm thấy nhân sự."
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Quản trị viên</h2>
            <DataTable<AdminRow>
              columns={[
                {
                  key: 'details',
                  label: 'Chi tiết',
                  render: (a) => (
                    <button
                      type="button"
                      onClick={() => setAdminDetailRow(a)}
                      className="rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50"
                    >
                      Chi tiết
                    </button>
                  ),
                },
                {
                  key: 'name',
                  label: 'Tên',
                  render: (a) => (
                    <span>
                      {a.first_name ?? '-'} {a.last_name ?? ''}
                    </span>
                  ),
                },
                { key: 'region', label: 'Vùng', render: (a) => a.region ?? '-' },
                { key: 'email', label: 'Email', render: (a) => a.email ?? '-' },
                { key: 'phone_number', label: 'Điện thoại', render: (a) => a.phone_number ?? '-' },
              ]}
              data={admins}
              loading={adminLoading}
              page={adminPage}
              totalPages={adminTotalPages}
              onPageChange={(p) => setAdminPage(p)}
              emptyMessage="Không tìm thấy quản trị viên."
            />
          </section>
        </div>
      )}

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Từ chối đăng ký</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Lý do (tùy chọn, hiển thị cho người duyệt).</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              placeholder="Lý do từ chối…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={voteBusyId === refuseModal.id}
                onClick={() => void submitRefuseVote()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Gửi từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailModal
        title="Yêu cầu đăng ký"
        open={regDetailOpen}
        onClose={() => {
          setRegDetailOpen(false);
          setRegDetailId(null);
          setRegDetailListRow(null);
        }}
        loading={regDetailLoading}
        wide
      >
        {(() => {
          const r = regDetailData ?? regDetailListRow;
          if (!r) return null;
          const blobs = collectBlobIdEntries(r);
          return (
            <div className="space-y-1">
              {detailField('ID', <CopyableTruncated value={r.id} chars={8} />)}
              {detailField('Tên', `${r.first_name} ${r.last_name}`)}
              {detailField('Vai trò', <span className="capitalize">{r.register_role}</span>)}
              {detailField('Vùng', r.region)}
              {detailField('Trạng thái', <StatusBadge status={r.status} />)}
              {detailField('Mã định danh', r.identity_code)}
              {detailField('Email', r.email)}
              {detailField('Điện thoại', r.phone_number)}
              {detailField('Giới tính', r.gender)}
              {detailField('Ngày sinh', formatDate(r.date_of_birth))}
              {detailField('Người tạo', <CopyableTruncated value={r.created_by} chars={8} />)}
              {detailField('Ngày tạo', formatDate(r.created_at))}
              {detailField('Cập nhật', formatDate(r.updated_at))}
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Images (Walrus)</div>
                  <div className="flex flex-wrap gap-4">
                    {blobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} />
                        <div className="mt-1 text-[10px] text-slate-500">{blobFieldDisplayLabel(key)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </DetailModal>

      <DetailModal
        title="Nhân sự"
        open={staffDetailOpen}
        onClose={() => {
          setStaffDetailOpen(false);
          setStaffDetailId(null);
          setStaffDetailListRow(null);
        }}
        loading={staffDetailLoading}
        wide
      >
        {(() => {
          const s = staffDetailData ?? staffDetailListRow;
          if (!s) return null;
          const staffBlobs = collectBlobIdEntries(s);
          return (
            <div className="space-y-1">
              {detailField('ID', <CopyableTruncated value={s.id} chars={8} />)}
              {detailField('Người dùng', <CopyableTruncated value={s.user} chars={8} />)}
              {detailField('Tên', `${s.first_name} ${s.last_name}`)}
              {detailField('Vùng', s.region)}
              {detailField('Email', s.email)}
              {detailField('Điện thoại', s.phone_number)}
              {detailField('Giới tính', s.gender)}
              {detailField('Mã định danh', s.identity_code)}
              {s.date_of_birth && detailField('Ngày sinh', formatDate(s.date_of_birth))}
              {detailField('Tải lên', formatDate(s.uploaded_at))}
              {staffBlobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Images (Walrus)</div>
                  <div className="flex flex-wrap gap-4">
                    {staffBlobs.map(({ key, blobId }) => (
                      <div key={key} className="text-center">
                        <EntityBlobThumb blobId={blobId} />
                        <div className="mt-1 text-[10px] text-slate-500">{blobFieldDisplayLabel(key)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(s.nfts) && s.nfts.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">NFT-linked profiles</div>
                  <ul className="space-y-3">
                    {s.nfts.map((nft) => (
                      <li key={nft.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                        <div className="flex items-center gap-1 font-mono text-xs text-slate-600">
                          <CopyableTruncated value={nft.id} chars={6} />
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2">
                          {collectBlobIdEntries(nft).map(({ key, blobId }) => (
                            <div key={`${nft.id}-${key}`}>
                              <EntityBlobThumb blobId={blobId} />
                              <span className="text-[10px] text-slate-500">{blobFieldDisplayLabel(key)}</span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
      </DetailModal>

      <DetailModal
        title="Quản trị viên"
        open={adminDetailRow != null}
        onClose={() => setAdminDetailRow(null)}
        loading={false}
        wide
      >
        {adminDetailRow && (
          <div className="space-y-1">
            {detailField('ID', <CopyableTruncated value={adminDetailRow.id} chars={8} />)}
            {detailField(
              'Name',
              `${adminDetailRow.first_name ?? '—'} ${adminDetailRow.last_name ?? ''}`,
            )}
            {detailField('Vùng', adminDetailRow.region ?? '—')}
            {detailField('Email', adminDetailRow.email ?? '—')}
            {detailField('Điện thoại', adminDetailRow.phone_number ?? '—')}
            <p className="pt-2 text-xs text-slate-500">
              No GET-by-id in API — details are from the list response only.
            </p>
          </div>
        )}
      </DetailModal>

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
