'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import TabBar from '@/src/components/ui/TabBar';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import EmptyState from '@/src/components/ui/EmptyState';
import ListPagination from '@/src/components/ui/ListPagination';
import RegistrationRequestCard from '@/src/components/registration/RegistrationRequestCard';
import RegistrationDetailContent from '@/src/components/registration/RegistrationDetailContent';
import { btnPrimary, inputClass, selectClass } from '@/src/lib/uiClasses';
import { mergeRegistrationDetail } from '@/src/lib/registrationDisplay';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, formatDateTimeSeconds, formatVND } from '@/src/lib/formatters';
import { hasUserCastVote, isVoteActionsLocked } from '@/src/lib/voteFields';
import { registrationService } from '@/src/services/registration.service';
import { useAppSelector } from '@/src/store/hooks';
import { staffService } from '@/src/services/staff.service';
import { adminService } from '@/src/services/admin.service';
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

export default function AdminAccountsPage() {
  const { user } = useAppSelector((state) => state.auth);
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

      <TabBar<Tab>
        className="mb-6"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'registrations', label: 'Yêu cầu đăng ký', icon: <UserPlus className="h-4 w-4" /> },
          { id: 'staff', label: 'Danh sách nhân sự', icon: <Users className="h-4 w-4" /> },
        ]}
      />

      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <FilterToolbar>
            <div className="relative min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Từ khóa</label>
              <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.5rem)] h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm theo từ khóa…"
                value={regSearchDraft}
                onChange={(e) => setRegSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyRegSearch()}
                className={`${inputClass} pl-9`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Trạng thái</label>
              <select
                value={regStatus}
                onChange={(e) => {
                  setRegStatus(e.target.value);
                  setRegPage(0);
                }}
                className={`${selectClass} sm:w-48`}
              >
                {REG_STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={applyRegSearch} className={btnPrimary}>
              Tìm
            </button>
            <p className="w-full text-xs text-slate-500 sm:ml-auto sm:w-auto sm:self-end">
              Tổng bản ghi khớp: {regTotalAmount.toLocaleString('vi-VN')}
            </p>
          </FilterToolbar>

          <PageSection title="Yêu cầu đăng ký" noPadding>
            {regLoading ? (
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-5">
                    <div className="mb-3 h-6 w-24 rounded bg-slate-100" />
                    <div className="mb-2 h-5 w-full rounded bg-slate-100" />
                    <div className="mb-4 h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <EmptyState message="Không có yêu cầu đăng ký phù hợp bộ lọc." />
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                {registrations.map((r) => (
                  <RegistrationRequestCard
                    key={r.id}
                    registration={r}
                    voteLocked={isVoteActionsLocked(r, user, r.status)}
                    userVoted={hasUserCastVote(r, user)}
                    voteBusy={voteBusyId === r.id}
                    onDetail={() => {
                      setRegDetailListRow(r);
                      setRegDetailId(r.id);
                      setRegDetailOpen(true);
                    }}
                    onVoteYes={() => void handleVote(r.id, true)}
                    onVoteNo={() => void handleVote(r.id, false)}
                  />
                ))}
              </div>
            )}
            {!regLoading && registrations.length > 0 && (
              <ListPagination page={regPage} totalPages={regTotalPages} onPageChange={setRegPage} />
            )}
          </PageSection>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-6">
          <FilterToolbar>
            <div className="relative min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Tìm kiếm</label>
              <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.5rem)] h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm nhân sự & quản trị…"
                value={staffSearchDraft}
                onChange={(e) => setStaffSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyStaffSearch()}
                className={`${inputClass} pl-9`}
              />
            </div>
            <button type="button" onClick={applyStaffSearch} className={btnPrimary}>
              Tìm
            </button>
          </FilterToolbar>

          <PageSection title="Nhân sự" noPadding>
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
                    <TableIconButton
                      variant="primary"
                      onClick={() => {
                        setStaffDetailListRow(s);
                        setStaffDetailId(s.id);
                        setStaffDetailOpen(true);
                      }}
                    >
                      Chi tiết
                    </TableIconButton>
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
          </PageSection>

          <PageSection title="Quản trị viên" noPadding>
            <DataTable<AdminRow>
              columns={[
                {
                  key: 'details',
                  label: 'Chi tiết',
                  render: (a) => (
                    <TableIconButton variant="primary" onClick={() => setAdminDetailRow(a)}>
                      Chi tiết
                    </TableIconButton>
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
          </PageSection>
        </div>
      )}

      <FormModal
        open={refuseModal !== null}
        onClose={() => setRefuseModal(null)}
        title="Từ chối đăng ký"
        submitLabel="Gửi từ chối"
        submitVariant="danger"
        submitDisabled={refuseModal != null && voteBusyId === refuseModal.id}
        onSubmit={() => void submitRefuseVote()}
      >
        <p className="mb-2 text-sm text-slate-600">Lý do (tùy chọn, hiển thị cho người duyệt).</p>
        <textarea
          value={refuseReason}
          onChange={(e) => setRefuseReason(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="Lý do từ chối…"
        />
      </FormModal>

      <DetailModal
        title="Yêu cầu đăng ký"
        open={regDetailOpen}
        onClose={() => {
          setRegDetailOpen(false);
          setRegDetailId(null);
          setRegDetailListRow(null);
        }}
        loading={regDetailLoading}
        extraWide
      >
        {(() => {
          const listRow = regDetailListRow;
          const detail = regDetailData;
          if (!listRow && !detail) return null;
          const r = mergeRegistrationDetail(listRow ?? detail!, detail);
          return <RegistrationDetailContent record={r} />;
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
            <div>
              <DetailField label="ID" value={<CopyableTruncated value={s.id} chars={8} />} />
              <DetailField label="Người dùng" value={<CopyableTruncated value={s.user} chars={8} />} />
              <DetailField label="Tên" value={`${s.first_name} ${s.last_name}`} />
              <DetailField label="Vùng" value={s.region} />
              <DetailField label="Email" value={s.email} />
              <DetailField label="Điện thoại" value={s.phone_number} />
              <DetailField label="Giới tính" value={s.gender} />
              <DetailField label="Mã định danh" value={s.identity_code} />
              {s.date_of_birth && <DetailField label="Ngày sinh" value={formatDate(s.date_of_birth)} />}
              <DetailField label="Tải lên" value={formatDate(s.uploaded_at)} />
              {staffBlobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Ảnh (Walrus)</div>
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
                  <div className="mb-2 text-xs font-medium text-slate-600">Hồ sơ liên kết NFT</div>
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
          <div>
            <DetailField label="ID" value={<CopyableTruncated value={adminDetailRow.id} chars={8} />} />
            <DetailField
              label="Tên"
              value={`${adminDetailRow.first_name ?? '—'} ${adminDetailRow.last_name ?? ''}`}
            />
            <DetailField label="Vùng" value={adminDetailRow.region ?? '—'} />
            <DetailField label="Email" value={adminDetailRow.email ?? '—'} />
            <DetailField label="Điện thoại" value={adminDetailRow.phone_number ?? '—'} />
            <p className="pt-2 text-xs text-slate-500">
              Không tải được chi tiết theo mã — thông tin hiển thị từ danh sách.
            </p>
          </div>
        )}
      </DetailModal>

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
