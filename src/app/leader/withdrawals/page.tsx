'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import DetailModal from '@/src/components/ui/DetailModal';
import BlobImage from '@/src/components/ui/BlobImage';
import { formatDate, formatVND, truncateAddress } from '@/src/lib/formatters';
import { useAppSelector } from '@/src/store/hooks';
import { withdrawService } from '@/src/services/withdraw.service';
import { childrenService } from '@/src/services/children.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { Plus } from 'lucide-react';
import type { Child, WithdrawProposal } from '@/src/types/api.types';

type NeedKind = 'meal' | 'books' | 'health' | 'special';
type WithdrawMode = 'child' | 'pool';

const PAGE_SIZE = 20;
const CHILD_LIST_PAGE_SIZE = 50;

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

function childOptionLabel(c: Child) {
  return `${c.first_name} ${c.last_name} · ${truncateAddress(c.id)}`;
}

/** When `books_needs` has two entries, label as semester 1 & 2 (order = API array order). */
function bookNeedOptionLabel(needIds: string[], index: number, id: string): string {
  const idShort = truncateAddress(id);
  const n = needIds.length;
  if (n === 2) {
    return `${index === 0 ? 'Semester 1' : 'Semester 2'} · ${idShort}`;
  }
  if (n === 1) {
    return `Books need · ${idShort}`;
  }
  return `Semester ${index + 1} · ${idShort}`;
}

export default function LeaderWithdrawalsPage() {
  const { execute } = useExecuteTransaction();
  const { user } = useAppSelector((state) => state.auth);
  const { poolId, poolName, status: poolStatus, error: poolError } = useAppSelector((state) => state.leaderPool);
  const [createOpen, setCreateOpen] = useState(false);

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState<WithdrawProposal[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const canUseRegion = poolStatus === 'succeeded' && !!poolName?.trim();

  const [childrenLoading, setChildrenLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenPage, setChildrenPage] = useState(0);
  const [childrenTotalPages, setChildrenTotalPages] = useState(1);

  const [selectedChildId, setSelectedChildId] = useState('');
  const [childDetail, setChildDetail] = useState<Child | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [withdrawMode, setWithdrawMode] = useState<WithdrawMode>('child');

  const [needKind, setNeedKind] = useState<NeedKind | ''>('');
  const [booksNeedId, setBooksNeedId] = useState('');
  const [specialDescription, setSpecialDescription] = useState('');
  const [specialTarget, setSpecialTarget] = useState('');
  const [poolTaskDescription, setPoolTaskDescription] = useState('');
  const [poolWithdrawAmount, setPoolWithdrawAmount] = useState('');
  const [proofBlobId, setProofBlobId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [proposalDetailOpen, setProposalDetailOpen] = useState(false);
  const [proposalDetailId, setProposalDetailId] = useState<string | null>(null);
  const [proposalDetail, setProposalDetail] = useState<WithdrawProposal | null>(null);
  const [proposalDetailLoading, setProposalDetailLoading] = useState(false);

  const loadProposals = useCallback(async () => {
    const addr = user?.address;
    if (!addr) {
      setRows([]);
      setTotalPages(1);
      return;
    }
    setListLoading(true);
    try {
      const res = await withdrawService.list({
        creator: addr,
        page,
        page_size: PAGE_SIZE,
      });
      const body = res.data;
      setRows(Array.isArray(body.data) ? body.data : []);
      setTotalPages(Math.max(1, body.total_pages ?? 1));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Failed to load proposals'));
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.address, page]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    if (!proposalDetailOpen || !proposalDetailId) {
      setProposalDetail(null);
      return;
    }
    setProposalDetailLoading(true);
    void withdrawService
      .getById(proposalDetailId)
      .then((res) => setProposalDetail(res.data))
      .catch(() => setProposalDetail(null))
      .finally(() => setProposalDetailLoading(false));
  }, [proposalDetailOpen, proposalDetailId]);

  const loadChildrenPage = useCallback(
    async (p: number) => {
      if (!canUseRegion || !poolName) {
        setChildren([]);
        setChildrenTotalPages(1);
        return;
      }
      setChildrenLoading(true);
      try {
        const res = await childrenService.list({
          region: poolName,
          page: p,
          page_size: CHILD_LIST_PAGE_SIZE,
          sort_order: 'desc',
        });
        const body = res.data;
        setChildren(Array.isArray(body.data) ? body.data : []);
        setChildrenTotalPages(Math.max(1, body.total_pages ?? 1));
      } catch (e: unknown) {
        toast.error(getErrorMessage(e, 'Failed to load children'));
        setChildren([]);
      } finally {
        setChildrenLoading(false);
      }
    },
    [canUseRegion, poolName],
  );

  useEffect(() => {
    setChildrenPage(0);
  }, [poolName]);

  useEffect(() => {
    if (!createOpen || withdrawMode !== 'child') return;
    void loadChildrenPage(childrenPage);
  }, [createOpen, withdrawMode, childrenPage, loadChildrenPage]);

  useEffect(() => {
    if (!selectedChildId) {
      setChildDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void childrenService
      .getById(selectedChildId)
      .then((res) => {
        if (!cancelled) setChildDetail(res.data ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          toast.error(getErrorMessage(e, 'Failed to load child'));
          setChildDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  useEffect(() => {
    if (!childDetail?.books_needs?.length) {
      setBooksNeedId('');
      return;
    }
    setBooksNeedId((prev) =>
      prev && childDetail.books_needs.includes(prev) ? prev : childDetail.books_needs[0],
    );
  }, [childDetail]);

  const mealNeedOk = !!childDetail?.meal_need?.trim();
  const healthNeedOk = !!childDetail?.health_insurance_need?.trim();
  const booksNeedOk = (childDetail?.books_needs?.length ?? 0) > 0;

  const poolFlowReady =
    canUseRegion &&
    !!poolId?.trim() &&
    !!poolTaskDescription.trim() &&
    Number.isFinite(Number(poolWithdrawAmount)) &&
    Number(poolWithdrawAmount) > 0;

  const childFlowReady =
    canUseRegion &&
    !!selectedChildId &&
    !!needKind &&
    !detailLoading &&
    (needKind === 'meal'
      ? mealNeedOk
      : needKind === 'health'
        ? healthNeedOk
        : needKind === 'books'
          ? booksNeedOk && !!booksNeedId
          : needKind === 'special' &&
            !!specialDescription.trim() &&
            Number.isFinite(Number(specialTarget)) &&
            Number(specialTarget) > 0);

  const canSubmit = withdrawMode === 'pool' ? poolFlowReady : childFlowReady;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const proof = proofBlobId.trim() || undefined;

    if (withdrawMode === 'pool') {
      if (!poolFlowReady || !poolId?.trim()) return;
      setSubmitting(true);
      const ok = await execute(() =>
        withdrawService.create({
          pool_id: poolId.trim(),
          description: poolTaskDescription.trim(),
          withdraw_amount: Number(poolWithdrawAmount),
          proof_blob_id: proof,
        }),
      );
      if (ok) {
        setPoolTaskDescription('');
        setPoolWithdrawAmount('');
        setProofBlobId('');
        setCreateOpen(false);
        setPage(0);
        void loadProposals();
      }
      setSubmitting(false);
      return;
    }

    if (!childFlowReady || !childDetail) return;

    setSubmitting(true);
    let ok = false;

    if (needKind === 'meal') {
      ok = await execute(() =>
        childrenService.createMealWithdrawProposal({
          need_id: childDetail.meal_need.trim(),
          proof_blob_id: proof,
        }),
      );
    } else if (needKind === 'books') {
      ok = await execute(() =>
        childrenService.createBooksWithdrawProposal({
          need_id: booksNeedId,
          proof_blob_id: proof,
        }),
      );
    } else if (needKind === 'health') {
      ok = await execute(() =>
        childrenService.createHealthInsuranceWithdrawProposal({
          need_id: childDetail.health_insurance_need.trim(),
          proof_blob_id: proof,
        }),
      );
    } else if (needKind === 'special') {
      ok = await execute(() =>
        childrenService.createSpecialNeedProposal({
          child_id: childDetail.id,
          description: specialDescription.trim(),
          target: Number(specialTarget),
          proof_blob_id: proof,
        }),
      );
    }

    if (ok) {
      setNeedKind('');
      setSpecialDescription('');
      setSpecialTarget('');
      setProofBlobId('');
      setCreateOpen(false);
      setPage(0);
      void loadProposals();
    }
    setSubmitting(false);
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'description', label: 'Description' },
    { key: 'pool_name', label: 'Pool' },
    {
      key: 'withdraw_amount',
      label: 'Amount',
      render: (row: WithdrawProposal) => formatVND(row.withdraw_amount),
    },
    { key: 'approve_weight', label: 'Approve weight' },
    { key: 'refuse_weight', label: 'Refuse weight' },
    {
      key: 'is_executed',
      label: 'Executed',
      render: (row: WithdrawProposal) => (
        <StatusBadge status={row.is_executed ? 'executed' : 'pending'} />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: WithdrawProposal) => formatDate(row.created_at),
    },
    {
      key: 'details',
      label: 'Details',
      render: (row: WithdrawProposal) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setProposalDetailId(row.id);
            setProposalDetailOpen(true);
          }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Details
        </button>
      ),
    },
  ];

  const regionBlocked = !canUseRegion;
  const childSelectDisabled = regionBlocked || childrenLoading;
  const poolFieldsDisabled = regionBlocked || !poolId?.trim();

  const showChildProofUpload =
    withdrawMode === 'child' && selectedChildId && childDetail && needKind;
  const showPoolProofUpload = withdrawMode === 'pool' && canUseRegion && !!poolId?.trim();

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 transition focus:border-blue-800 focus:ring-2';

  return (
    <div>
      <PageHeader
        title="Withdrawals"
        description="Review proposals, withdraw for a child need, or request a regional pool withdrawal for other tasks"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        }
      />

      {!user?.address ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Connect your wallet to see your withdrawal proposals.
        </div>
      ) : (
        <DataTable<WithdrawProposal>
          columns={columns}
          data={rows}
          loading={listLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No proposals yet"
        />
      )}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10"
          onClick={() => setCreateOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Create withdrawal</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
        <form
          onSubmit={handleCreate}
          className="space-y-4"
        >
          {poolStatus === 'failed' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Cannot load region: {poolError || 'pool unavailable'}
            </div>
          )}
          {canUseRegion && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Your region</p>
              <p className="mt-1">{poolName}</p>
            </div>
          )}
          {(poolStatus === 'loading' || poolStatus === 'idle') && (
            <p className="text-sm text-slate-500">Loading your leader region…</p>
          )}

          <fieldset className="space-y-2" disabled={regionBlocked}>
            <legend className="mb-2 text-sm font-medium text-slate-700">Withdrawal category</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="withdrawMode"
                checked={withdrawMode === 'child'}
                onChange={() => {
                  setWithdrawMode('child');
                  setPoolTaskDescription('');
                  setPoolWithdrawAmount('');
                }}
              />
              <span>Child need (meal, books, health, special)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="withdrawMode"
                checked={withdrawMode === 'pool'}
                onChange={() => {
                  setWithdrawMode('pool');
                  setSelectedChildId('');
                  setNeedKind('');
                  setSpecialDescription('');
                  setSpecialTarget('');
                }}
              />
              <span>Regional pool — general tasks (not tied to a child)</span>
            </label>
          </fieldset>

          {withdrawMode === 'pool' && canUseRegion && poolId && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
              Withdrawal request for your leader pool (not linked to a child). Pool ID:{' '}
              <span className="font-mono break-all">{poolId}</span>
            </div>
          )}

          {withdrawMode === 'pool' && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className={`${inputClass} min-h-[100px] resize-y`}
                  disabled={poolFieldsDisabled}
                  value={poolTaskDescription}
                  onChange={(e) => setPoolTaskDescription(e.target.value)}
                  placeholder="Describe the expense or task (operational costs, logistics, etc.)"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Withdraw amount (VND)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={inputClass}
                  disabled={poolFieldsDisabled}
                  value={poolWithdrawAmount}
                  onChange={(e) => setPoolWithdrawAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                This withdrawal is not linked to a child record. Optional proof image below.
              </p>
            </>
          )}

          {withdrawMode === 'child' && (
            <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Child</label>
            <select
              className={inputClass}
              disabled={childSelectDisabled}
              value={selectedChildId}
              onChange={(e) => {
                setSelectedChildId(e.target.value);
                setNeedKind('');
              }}
            >
              <option value="">{childrenLoading ? 'Loading…' : 'Select a child'}</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {childOptionLabel(c)}
                </option>
              ))}
            </select>
            {canUseRegion && !childrenLoading && childrenTotalPages > 1 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <button
                  type="button"
                  disabled={childrenPage <= 0}
                  className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                  onClick={() => setChildrenPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {childrenPage + 1} / {childrenTotalPages}
                </span>
                <button
                  type="button"
                  disabled={childrenPage >= childrenTotalPages - 1}
                  className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                  onClick={() => setChildrenPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {detailLoading && selectedChildId && (
            <p className="text-sm text-slate-500">Loading child needs…</p>
          )}

          {selectedChildId && childDetail && !detailLoading && (
            <>
              <fieldset className="space-y-2" disabled={childSelectDisabled}>
                <legend className="mb-2 text-sm font-medium text-slate-700">Need type</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="needKind"
                    checked={needKind === 'meal'}
                    disabled={!mealNeedOk}
                    onChange={() => setNeedKind('meal')}
                  />
                  <span>Meal</span>
                  {!mealNeedOk && (
                    <span className="text-slate-400">(no meal need on this child)</span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="needKind"
                    checked={needKind === 'books'}
                    disabled={!booksNeedOk}
                    onChange={() => setNeedKind('books')}
                  />
                  <span>Books</span>
                  {!booksNeedOk && (
                    <span className="text-slate-400">(no book needs on this child)</span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="needKind"
                    checked={needKind === 'health'}
                    disabled={!healthNeedOk}
                    onChange={() => setNeedKind('health')}
                  />
                  <span>Health insurance</span>
                  {!healthNeedOk && (
                    <span className="text-slate-400">(no health need on this child)</span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="needKind"
                    checked={needKind === 'special'}
                    onChange={() => setNeedKind('special')}
                  />
                  <span>Special need (new proposal)</span>
                </label>
              </fieldset>

              {needKind === 'books' && booksNeedOk && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">books need</label>
                  {childDetail.books_needs.length === 2 && (
                    <p className="mb-1.5 text-xs text-slate-500">
                      Two <code className="rounded bg-slate-50 px-1">need_id</code> values map to semester 1 and 2 — pick
                      the correct books need to withdraw.
                    </p>
                  )}
                  <select
                    className={inputClass}
                    value={booksNeedId}
                    onChange={(e) => setBooksNeedId(e.target.value)}
                  >
                    {childDetail.books_needs.map((id, index) => (
                      <option key={id} value={id}>
                        {bookNeedOptionLabel(childDetail.books_needs, index, id)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {needKind === 'special' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      className={`${inputClass} min-h-[100px] resize-y`}
                      value={specialDescription}
                      onChange={(e) => setSpecialDescription(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Target amount (VND)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={inputClass}
                      value={specialTarget}
                      onChange={(e) => setSpecialTarget(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {needKind && needKind !== 'special' && (
                <p className="text-xs text-slate-500">
                  Withdraw proposal uses the selected need on this child. Add an optional proof image
                  below.
                </p>
              )}
            </>
          )}
            </>
          )}

          {(showChildProofUpload || showPoolProofUpload) && (
            <FileUploadInput
              label="Proof image (optional)"
              value={proofBlobId}
              onChange={setProofBlobId}
              accept="image/*"
              placeholder="Upload proof image or paste blob ID"
            />
          )}

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
          </div>
        </div>
      )}

      <DetailModal
        title="Withdrawal proposal"
        open={proposalDetailOpen}
        onClose={() => {
          setProposalDetailOpen(false);
          setProposalDetailId(null);
        }}
        loading={proposalDetailLoading}
        wide
      >
        {proposalDetail && (
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs break-all">{proposalDetail.id}</p>
            <p>
              <span className="text-slate-500">Pool:</span> {proposalDetail.pool_name}
            </p>
            <p>
              <span className="text-slate-500">Amount:</span> {formatVND(proposalDetail.withdraw_amount)}
            </p>
            <p>
              <span className="text-slate-500">Description:</span> {proposalDetail.description}
            </p>
            {proposalDetail.proof_blob_id && (
              <BlobImage blobId={proposalDetail.proof_blob_id} className="max-h-56 rounded-lg border object-contain" />
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
