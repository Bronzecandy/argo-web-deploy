'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ThumbsDown, ThumbsUp, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import DetailField from '@/src/components/ui/DetailField';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import AiInsightPanel from '@/src/components/ui/AiInsightPanel';
import AiEvaluationBadge from '@/src/components/ui/AiEvaluationBadge';
import TabBar from '@/src/components/ui/TabBar';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import TableIconButton from '@/src/components/ui/TableIconButton';
import { btnPrimary, inputClass, selectClass } from '@/src/lib/uiClasses';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, formatDateTimeSeconds, formatVND } from '@/src/lib/formatters';
import { registrationService } from '@/src/services/registration.service';
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
              { key: 'region', label: 'Vùng' },
              { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'ai_evaluation',
                label: 'AI',
                render: (r) => <AiEvaluationBadge record={r} />,
              },
              { key: 'created_at', label: 'Ngày tạo', render: (r) => formatDate(r.created_at) },
              {
                key: 'closed_at',
                label: 'Thời gian đóng',
                render: (r) => (
                  <span className="whitespace-nowrap text-xs text-slate-700">{formatDateTimeSeconds(r.closed_at)}</span>
                ),
              },
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
                      <TableIconButton
                        onClick={() => {
                          setRegDetailListRow(r);
                          setRegDetailId(r.id);
                          setRegDetailOpen(true);
                        }}
                      >
                        Chi tiết
                      </TableIconButton>
                      <TableIconButton
                        variant="primary"
                        disabled={approved || voteBusyId === r.id}
                        onClick={() => handleVote(r.id, true)}
                        title="Phiếu duyệt"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </TableIconButton>
                      <TableIconButton
                        variant="danger"
                        disabled={approved || voteBusyId === r.id}
                        onClick={() => handleVote(r.id, false)}
                        title="Phiếu từ chối"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </TableIconButton>
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
        wide
      >
        {(() => {
          const r = regDetailData ?? regDetailListRow;
          if (!r) return null;
          const blobs = collectBlobIdEntries(r);
          return (
            <div>
              <DetailField label="ID" value={<CopyableTruncated value={r.id} chars={8} />} />
              <DetailField label="Tên" value={`${r.first_name} ${r.last_name}`} />
              <DetailField label="Vai trò" value={<span className="capitalize">{r.register_role}</span>} />
              <DetailField label="Vùng" value={r.region} />
              <DetailField label="Trạng thái" value={<StatusBadge status={r.status} />} />
              <DetailField label="Mã định danh" value={r.identity_code} />
              <DetailField label="Email" value={r.email} />
              <DetailField label="Điện thoại" value={r.phone_number} />
              <DetailField label="Giới tính" value={r.gender} />
              <DetailField label="Ngày sinh" value={formatDate(r.date_of_birth)} />
              <DetailField label="Người tạo" value={<CopyableTruncated value={r.created_by} chars={8} />} />
              <DetailField label="Ngày tạo" value={formatDate(r.created_at)} />
              <DetailField label="Cập nhật" value={formatDate(r.updated_at)} />
              <DetailField label="Thời gian đóng" value={formatDateTimeSeconds(r.closed_at)} />
              <AiInsightPanel record={r} className="mt-4" />
              {blobs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Ảnh (Walrus)</div>
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
              API không có GET theo mã — chi tiết lấy từ danh sách.
            </p>
          </div>
        )}
      </DetailModal>

      <span className="sr-only">{formatVND(0)}</span>
    </div>
  );
}
