'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { profileService } from '@/src/services/profile.service';
import { transactionService } from '@/src/services/transaction.service';
import { withdrawService } from '@/src/services/withdraw.service';
import { childrenService } from '@/src/services/children.service';
import { formatVND, formatDateTime, truncateAddress } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import StatsCard from '@/src/components/ui/StatsCard';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import type { PersonalWalletProfile, TransactionRecord, WithdrawProposal } from '@/src/types/api.types';
import { Wallet, HandCoins, Baby, Vote, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DonorDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<PersonalWalletProfile | null>(null);
  const [recentTxs, setRecentTxs] = useState<TransactionRecord[]>([]);
  const [txPage, setTxPage] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [activeProposals, setActiveProposals] = useState<WithdrawProposal[]>([]);
  const [proposalPage, setProposalPage] = useState(0);
  const [proposalTotalPages, setProposalTotalPages] = useState(1);
  const [activeProposalsCount, setActiveProposalsCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const DASH_TX_PAGE_SIZE = 20;
  const DASH_PROPOSAL_PAGE_SIZE = 20;

  const loadDashboard = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const [profileRes, txRes, proposalsRes, childrenRes] = await Promise.all([
        profileService.getByWallet(user.address).catch(() => null),
        transactionService
          .list({
            page: txPage,
            page_size: DASH_TX_PAGE_SIZE,
            actor: user.address,
            sort_order: 'desc',
          })
          .catch(() => null),
        withdrawService
          .list({
            page: proposalPage,
            page_size: DASH_PROPOSAL_PAGE_SIZE,
            is_closed: false,
            sort_order: 'desc',
          })
          .catch(() => null),
        childrenService.list({ page: 0, page_size: 1 }).catch(() => null),
      ]);

      if (profileRes) setProfile(profileRes.data);
      if (txRes) {
        setRecentTxs(txRes.data.data || []);
        setTxTotalPages(Math.max(1, txRes.data.total_pages ?? 1));
      }
      if (proposalsRes) {
        setActiveProposals(proposalsRes.data.data || []);
        setProposalTotalPages(Math.max(1, proposalsRes.data.total_pages ?? 1));
        setActiveProposalsCount(proposalsRes.data.amount || 0);
      }
      if (childrenRes) setChildrenCount(childrenRes.data.amount || 0);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.address, txPage, proposalPage]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const txColumns = [
    {
      key: 'action_type',
      label: 'Type',
      render: (item: TransactionRecord) => (
        <span className="font-medium capitalize">{item.action_type?.replace(/_/g, ' ') || '-'}</span>
      ),
    },
    {
      key: 'pool_name',
      label: 'Pool',
      render: (item: TransactionRecord) => item.pool_name || '-',
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (item: TransactionRecord) => (
        <span className="font-semibold text-emerald-700">{formatVND(item.amount)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (item: TransactionRecord) => formatDateTime(item.created_at),
    },
  ];

  const proposalColumns = [
    {
      key: 'pool_name',
      label: 'Pool',
      render: (item: WithdrawProposal) => <span className="font-medium">{item.pool_name}</span>,
    },
    {
      key: 'withdraw_amount',
      label: 'Amount',
      render: (item: WithdrawProposal) => formatVND(item.withdraw_amount),
    },
    {
      key: 'creator',
      label: 'Creator',
      render: (item: WithdrawProposal) => truncateAddress(item.creator),
    },
    {
      key: 'status',
      label: 'Executed',
      render: (item: WithdrawProposal) => (
        <StatusBadge status={item.is_executed ? 'executed' : 'pending'} />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome${profile?.first_name ? `, ${profile.first_name}` : ''}`}
        description="Your donor dashboard overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Donated"
          value={formatVND(profile?.total_donation || 0)}
          icon={Wallet}
        />
        <StatsCard
          label="Transactions"
          value={profile?.record_amount || 0}
          icon={HandCoins}
        />
        <StatsCard
          label="Children Registered"
          value={childrenCount}
          icon={Baby}
        />
        <StatsCard
          label="Active Proposals"
          value={activeProposalsCount}
          icon={Vote}
        />
      </div>

      {/* Wallet Address */}
      {user?.address && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Wallet Address</p>
              <p className="mt-1 font-mono text-sm text-slate-900">{user.address}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <Link
            href="/donor/transactions"
            className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <DataTable
          columns={txColumns}
          data={recentTxs}
          emptyMessage="No transactions yet"
          page={txPage}
          totalPages={txTotalPages}
          onPageChange={setTxPage}
        />
      </div>

      {/* Active Withdrawal Proposals */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active Withdrawal Proposals</h2>
          <Link
            href="/donor/withdrawals"
            className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Vote now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <DataTable
          columns={proposalColumns}
          data={activeProposals}
          emptyMessage="No active proposals"
          page={proposalPage}
          totalPages={proposalTotalPages}
          onPageChange={setProposalPage}
        />
      </div>
    </div>
  );
}
