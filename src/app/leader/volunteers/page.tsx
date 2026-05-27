'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check, Search, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import DetailModal from '@/src/components/ui/DetailModal';
import EntityBlobThumb from '@/src/components/ui/EntityBlobThumb';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import { collectBlobIdEntries, blobFieldDisplayLabel } from '@/src/lib/blobFields';
import { formatDate, formatDateTimeSeconds } from '@/src/lib/formatters';
import { registrationService } from '@/src/services/registration.service';
import { useAppSelector } from '@/src/store/hooks';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import type { RegistrationRequest } from '@/src/types/api.types';

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

function detailField(label: string, value: ReactNode) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function LeaderVolunteersPage() {
  const { poolId, status: poolStatus } = useAppSelector((s) => s.leaderPool);
  const { status: centerStatus, leaderRegion, errorMessage: centerError } = useLeaderCenter();

  const [regLoading, setRegLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [regTotalAmount, setRegTotalAmount] = useState(0);
  const [regPage, setRegPage] = useState(0);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [regKeyword, setRegKeyword] = useState('');
  const [regSearchDraft, setRegSearchDraft] = useState('');
  const [regStatus, setRegStatus] = useState('');

  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const [regDetailOpen, setRegDetailOpen] = useState(false);
  const [regDetailId, setRegDetailId] = useState<string | null>(null);
  const [regDetailListRow, setRegDetailListRow] = useState<RegistrationRequest | null>(null);
  const [regDetailData, setRegDetailData] = useState<RegistrationRequest | null>(null);
  const [regDetailLoading, setRegDetailLoading] = useState(false);

  const canLoad = centerStatus !== 'loading' && !!leaderRegion;

  const loadRegistrations = useCallback(async () => {
    if (!canLoad || !leaderRegion) {
      setRegistrations([]);
      setRegTotalPages(1);
      setRegTotalAmount(0);
      return;
    }
    setRegLoading(true);
    try {
      const res = await registrationService.list({
        page: regPage,
        page_size: PAGE_SIZE,
        keyword: regKeyword || undefined,
        status: regStatus || undefined,
        register_role: 'Volunteer',
        region: leaderRegion,
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
  }, [regPage, regKeyword, regStatus, leaderRegion, canLoad]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

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

  return (
    <div className="p-6">
      <PageHeader
        title="Đăng ký tình nguyện viên"
        description={`Duyệt đăng ký TNV trong vùng của bạn${leaderRegion ? `: ${leaderRegion}` : ''}`}
      />

      {centerStatus === 'loading' && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Đang tải trung tâm trưởng vùng (vùng từ GET /centers/leader)…
        </div>
      )}
      {centerStatus === 'error' && centerError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Không tải được trung tâm trưởng vùng: {centerError}. Danh sách TNV cần vùng từ API này.
        </div>
      )}
      {centerStatus !== 'loading' && !leaderRegion && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Không có trường <code className="rounded bg-white px-1">region</code> từ GET /centers/leader — không lọc được đăng ký TNV.
        </div>
      )}
      {poolStatus === 'succeeded' && poolId && (
        <p className="mb-4 text-xs text-slate-500">
          ID quỹ: <CopyableTruncated value={poolId} chars={10} />
        </p>
      )}

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
                disabled={!canLoad}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-blue-800/20 focus:ring-2 disabled:opacity-50"
              />
            </div>
            <select
              value={regStatus}
              onChange={(e) => {
                setRegStatus(e.target.value);
                setRegPage(0);
              }}
              disabled={!canLoad}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 focus:ring-2 sm:w-48 disabled:opacity-50"
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
              disabled={!canLoad}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-50"
            >
              Tìm
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Tổng khớp: {canLoad ? regTotalAmount.toLocaleString('vi-VN') : '—'}
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
            { key: 'region', label: 'Vùng' },
            { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
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
                      disabled={approved || voteBusyId === r.id || !canLoad}
                      onClick={() => handleVote(r.id, true)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Phiếu duyệt"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={approved || voteBusyId === r.id || !canLoad}
                      onClick={() => handleVote(r.id, false)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Phiếu từ chối"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              },
            },
          ]}
          data={registrations}
          loading={regLoading || centerStatus === 'loading'}
          page={regPage}
          totalPages={regTotalPages}
          onPageChange={(p) => setRegPage(p)}
          emptyMessage={
            canLoad
              ? 'Không có yêu cầu đăng ký TNV phù hợp bộ lọc.'
              : 'Hãy tải trung tâm trưởng vùng (vùng) để xem đăng ký TNV trong vùng.'
          }
        />
      </div>

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
              {detailField('Người tạo', <CopyableTruncated value={r.created_by} />)}
              {detailField('Ngày tạo', formatDate(r.created_at))}
              {detailField('Cập nhật', formatDate(r.updated_at))}
              {detailField('Thời gian đóng', formatDateTimeSeconds(r.closed_at))}
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
    </div>
  );
}
