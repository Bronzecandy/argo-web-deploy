'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Search, ShieldCheck, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { registrationService } from '@/src/services/registration.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import { useAppSelector } from '@/src/store/hooks';
import type { RegistrationRequest } from '@/src/types/api.types';

const PAGE_SIZE = 20;

function isRegistrationApproved(status?: string) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  return s === 'approved';
}

const REG_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'refused', label: 'Refused' },
  { value: 'rejected', label: 'Rejected' },
];

export default function LeaderVolunteersPage() {
  const { execute } = useExecuteTransaction();
  const { poolName, poolId, status: poolStatus, error: poolError } = useAppSelector((s) => s.leaderPool);

  const [regLoading, setRegLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [regTotalAmount, setRegTotalAmount] = useState(0);
  const [regPage, setRegPage] = useState(0);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [regKeyword, setRegKeyword] = useState('');
  const [regSearchDraft, setRegSearchDraft] = useState('');
  const [regStatus, setRegStatus] = useState('');

  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [confirmBusyId, setConfirmBusyId] = useState<string | null>(null);
  const [refuseModal, setRefuseModal] = useState<{ id: string } | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const canLoad = poolStatus === 'succeeded' && !!poolName;

  const loadRegistrations = useCallback(async () => {
    if (!canLoad) {
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
        region: poolName,
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
      toast.error(msg || 'Failed to load registration requests');
      setRegistrations([]);
    } finally {
      setRegLoading(false);
    }
  }, [regPage, regKeyword, regStatus, poolName, canLoad]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  async function handleVote(id: string, isYes: boolean) {
    if (!isYes) {
      setRefuseModal({ id });
      setRefuseReason('');
      return;
    }
    setVoteBusyId(id);
    try {
      await registrationService.vote(id, { is_vote_yes: true });
      toast.success('Vote recorded');
      await loadRegistrations();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Vote failed');
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
      toast.success('Refusal recorded');
      setRefuseModal(null);
      await loadRegistrations();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Vote failed');
    } finally {
      setVoteBusyId(null);
    }
  }

  async function handleConfirm(id: string) {
    setConfirmBusyId(id);
    const ok = await execute(
      () => registrationService.confirm(id),
      { successMessage: 'Registration confirmed & executed on-chain' },
    );
    if (ok) await loadRegistrations();
    setConfirmBusyId(null);
  }

  function applyRegSearch() {
    setRegPage(0);
    setRegKeyword(regSearchDraft.trim());
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Volunteer registrations"
        description={`Review volunteer signup requests for your region${poolName ? `: ${poolName}` : ''}`}
      />

      {poolStatus === 'loading' && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading region pool…
        </div>
      )}
      {poolStatus === 'failed' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load your leader pool{poolError ? `: ${poolError}` : ''}. Volunteer list and region-scoped actions need this data.
        </div>
      )}
      {poolStatus === 'succeeded' && poolId && (
        <p className="mb-4 text-xs text-slate-500">
          Pool ID: <span className="font-mono">{truncateAddress(poolId, 10)}</span>
        </p>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by keyword…"
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
              Search
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Total matching: {canLoad ? regTotalAmount.toLocaleString('vi-VN') : '—'}
          </p>
        </div>

        <DataTable<RegistrationRequest>
          columns={[
            { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{truncateAddress(r.id, 8)}</span> },
            {
              key: 'name',
              label: 'Name',
              render: (r) => (
                <span>
                  {r.first_name} {r.last_name}
                </span>
              ),
            },
            { key: 'register_role', label: 'Role', render: (r) => <span className="capitalize">{r.register_role}</span> },
            { key: 'region', label: 'Region' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              label: 'Actions',
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
                      disabled={approved || voteBusyId === r.id || !canLoad}
                      onClick={() => handleVote(r.id, true)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Approve vote"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={approved || voteBusyId === r.id || !canLoad}
                      onClick={() => handleVote(r.id, false)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Refuse vote"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                    {r.isAvailableToConfirm && (
                      <button
                        type="button"
                        disabled={approved || confirmBusyId === r.id || !canLoad}
                        onClick={() => handleConfirm(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Confirm on-chain"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Confirm
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
          data={registrations}
          loading={regLoading || poolStatus === 'loading'}
          page={regPage}
          totalPages={regTotalPages}
          onPageChange={(p) => setRegPage(p)}
          emptyMessage={
            canLoad ? 'No volunteer registration requests match your filters.' : 'Load your leader pool to see volunteer requests for your region.'
          }
        />
      </div>

      {refuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Refuse registration</h3>
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">Optional reason (shown to reviewers).</p>
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none ring-blue-800/20 focus:ring-2"
              placeholder="Reason for refusal…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefuseModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voteBusyId === refuseModal.id}
                onClick={() => void submitRefuseVote()}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Submit refusal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
