'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DetailModal from '@/src/components/ui/DetailModal';
import EmptyState from '@/src/components/ui/EmptyState';
import ListPagination from '@/src/components/ui/ListPagination';
import RegistrationRequestCard from '@/src/components/registration/RegistrationRequestCard';
import RegistrationDetailContent from '@/src/components/registration/RegistrationDetailContent';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import ContextBanner from '@/src/components/ui/ContextBanner';
import FilterToolbar from '@/src/components/ui/FilterToolbar';
import FormModal from '@/src/components/ui/FormModal';
import PageSection from '@/src/components/ui/PageSection';
import { mergeRegistrationDetail } from '@/src/lib/registrationDisplay';
import { btnPrimary, inputClass, selectClass } from '@/src/lib/uiClasses';
import { hasUserCastVote, isVoteActionsLocked } from '@/src/lib/voteFields';
import { registrationService } from '@/src/services/registration.service';
import { useAppSelector } from '@/src/store/hooks';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import type { RegistrationRequest } from '@/src/types/api.types';

const PAGE_SIZE = 20;

const REG_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'refused', label: 'Từ chối' },
  { value: 'rejected', label: 'Bị từ chối' },
];

export default function LeaderVolunteersPage() {
  const { user } = useAppSelector((s) => s.auth);
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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Đăng ký tình nguyện viên"
        description={`Duyệt đăng ký TNV trong vùng của bạn${leaderRegion ? `: ${leaderRegion}` : ''}`}
      />

      {centerStatus === 'loading' && (
        <ContextBanner title="Đang tải trung tâm trưởng vùng">
          Đang xác định vùng được giao…
        </ContextBanner>
      )}
      {centerStatus === 'error' && centerError && (
        <ContextBanner variant="warning" title="Không tải được trung tâm trưởng vùng">
          {centerError}. Danh sách TNV cần biết vùng của bạn để lọc đúng.
        </ContextBanner>
      )}
      {centerStatus !== 'loading' && !leaderRegion && (
        <ContextBanner variant="warning" title="Chưa xác định được vùng">
          Không tải được vùng được giao — không lọc được đăng ký TNV. Thử tải lại trang.
        </ContextBanner>
      )}
      {poolStatus === 'succeeded' && poolId && (
        <p className="text-xs text-slate-500">
          ID quỹ: <CopyableTruncated value={poolId} chars={10} />
        </p>
      )}

      <FilterToolbar>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Tìm theo từ khóa…"
            value={regSearchDraft}
            onChange={(e) => setRegSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyRegSearch()}
            disabled={!canLoad}
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
            disabled={!canLoad}
            className={`${selectClass} sm:w-48`}
          >
            {REG_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={applyRegSearch} disabled={!canLoad} className={btnPrimary}>
          Tìm
        </button>
        <p className="w-full text-xs text-slate-500 sm:ml-auto sm:w-auto">
          Tổng khớp: {canLoad ? regTotalAmount.toLocaleString('vi-VN') : '—'}
        </p>
      </FilterToolbar>

      <PageSection title="Danh sách đăng ký" noPadding>
        {regLoading || centerStatus === 'loading' ? (
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
          <EmptyState
            message={
              canLoad
                ? 'Không có yêu cầu đăng ký TNV phù hợp bộ lọc.'
                : 'Hãy tải trung tâm trưởng vùng (vùng) để xem đăng ký TNV trong vùng.'
            }
          />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {registrations.map((r) => (
              <RegistrationRequestCard
                key={r.id}
                registration={r}
                voteLocked={isVoteActionsLocked(r, user, r.status)}
                userVoted={hasUserCastVote(r, user)}
                voteBusy={voteBusyId === r.id}
                actionsDisabled={!canLoad}
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
        {!regLoading && centerStatus !== 'loading' && registrations.length > 0 && (
          <ListPagination page={regPage} totalPages={regTotalPages} onPageChange={setRegPage} />
        )}
      </PageSection>

      <FormModal
        open={refuseModal !== null}
        onClose={() => setRefuseModal(null)}
        title="Từ chối đăng ký"
        submitLabel="Gửi từ chối"
        submitVariant="danger"
        submitDisabled={refuseModal !== null && voteBusyId === refuseModal.id}
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
    </div>
  );
}
