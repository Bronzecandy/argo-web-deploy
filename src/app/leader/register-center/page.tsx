'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Circle } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import RegisterCenterModal from '@/src/components/leader/RegisterCenterModal';
import { useLeaderCenter } from '@/src/contexts/LeaderCenterContext';
import { registrationService } from '@/src/services/registration.service';
import { useAppSelector } from '@/src/store/hooks';
import { userHasAnyRole } from '@/src/services/auth.service';
import { ROLES } from '@/src/lib/constants';

const MIN_VOLUNTEERS_APPROVED = 1;
const MIN_LOCAL_LEADERS_APPROVED = 1;

export default function LeaderRegisterCenterPage() {
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { poolName, status: poolStatus } = useAppSelector((s) => s.leaderPool);
  const { refetch: refetchLeaderCenter } = useLeaderCenter();

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [volunteerApproved, setVolunteerApproved] = useState(0);
  const [localLeaderApproved, setLocalLeaderApproved] = useState(0);

  const canLoadCounts = poolStatus === 'succeeded' && !!poolName?.trim();

  const loadCounts = useCallback(async () => {
    if (!canLoadCounts || !poolName) {
      setVolunteerApproved(0);
      setLocalLeaderApproved(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [volRes, llRes] = await Promise.all([
        registrationService.list({
          page: 0,
          page_size: 1,
          register_role: 'Volunteer',
          region: poolName,
          status: 'approved',
        }),
        registrationService.list({
          page: 0,
          page_size: 1,
          register_role: 'LocalLeader',
          region: poolName,
          status: 'approved',
        }),
      ]);
      setVolunteerApproved(volRes.data.amount ?? 0);
      setLocalLeaderApproved(llRes.data.amount ?? 0);
    } catch {
      setVolunteerApproved(0);
      setLocalLeaderApproved(0);
    } finally {
      setLoading(false);
    }
  }, [canLoadCounts, poolName]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const selfIsAssignedLeader = user ? userHasAnyRole(user, [ROLES.LOCAL_LEADER]) : false;
  const volunteersOk = volunteerApproved >= MIN_VOLUNTEERS_APPROVED;
  const leadersOk = localLeaderApproved >= MIN_LOCAL_LEADERS_APPROVED || selfIsAssignedLeader;
  const canPropose = canLoadCounts && volunteersOk && leadersOk;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register center"
        description="Create a proposal to establish a support center in your assigned region once minimum staffing is met."
      />

      {poolStatus === 'loading' || poolStatus === 'idle' ? (
        <p className="text-sm text-slate-600">Loading region assignment…</p>
      ) : poolStatus === 'failed' || !poolName ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your leader pool / region could not be loaded. You need an assigned region to submit a center proposal.
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Minimum requirements</h2>
        <p className="mb-4 text-sm text-slate-600">
          At least {MIN_LOCAL_LEADERS_APPROVED} approved Local Leader registration(s) and{' '}
          {MIN_VOLUNTEERS_APPROVED} approved Volunteer registration(s) in region{' '}
          <span className="font-medium text-slate-800">{poolName || '—'}</span>.
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            {loading ? (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            ) : leadersOk ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span>
              <span className="font-medium text-slate-800">Local Leaders</span> (approved in region):{' '}
              {loading ? '…' : localLeaderApproved} — need {MIN_LOCAL_LEADERS_APPROVED}+
              {selfIsAssignedLeader && (
                <span className="mt-1 block text-xs text-slate-500">
                  You are assigned as a Local Leader for this app; that satisfies the leader requirement if the count
                  above is still zero.
                </span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            {loading ? (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            ) : volunteersOk ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span>
              <span className="font-medium text-slate-800">Volunteers</span> (approved):{' '}
              {loading ? '…' : volunteerApproved} — need {MIN_VOLUNTEERS_APPROVED}+
            </span>
          </li>
        </ul>

        <div className="mt-6">
          <button
            type="button"
            disabled={!canPropose}
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Building2 className="h-4 w-4" />
            Create center establishment proposal
          </button>
          {!canPropose && canLoadCounts && !loading && (
            <p className="mt-2 text-xs text-slate-500">
              Meet the counts above to enable this action.
            </p>
          )}
        </div>
      </section>

      <RegisterCenterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lockedRegion={poolName?.trim() || undefined}
        onSuccess={() => {
          void refetchLeaderCenter().then(() => router.push('/leader'));
        }}
      />
    </div>
  );
}
