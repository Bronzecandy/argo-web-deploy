'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { profileService } from '@/src/services/profile.service';
import { transactionService } from '@/src/services/transaction.service';
import { withdrawService } from '@/src/services/withdraw.service';
import { childrenService } from '@/src/services/children.service';
import { formatVND, formatDateTime } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import StatsCard from '@/src/components/ui/StatsCard';
import DataTable from '@/src/components/ui/DataTable';
import StatusBadge from '@/src/components/ui/StatusBadge';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
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
      label: 'Loại',
      render: (item: TransactionRecord) => (
        <span className="font-medium capitalize">{item.action_type?.replace(/_/g, ' ') || '-'}</span>
      ),
    },
    {
      key: 'pool_name',
      label: 'Quỹ',
      render: (item: TransactionRecord) => item.pool_name || '-',
    },
    {
      key: 'amount',
      label: 'Số tiền',
      render: (item: TransactionRecord) => (
        <span className="font-semibold text-blue-900">{formatVND(item.amount)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Thời gian',
      render: (item: TransactionRecord) => formatDateTime(item.created_at),
    },
  ];

  const proposalColumns = [
    {
      key: 'pool_name',
      label: 'Quỹ',
      render: (item: WithdrawProposal) => <span className="font-medium">{item.pool_name}</span>,
    },
    {
      key: 'withdraw_amount',
      label: 'Số tiền',
      render: (item: WithdrawProposal) => formatVND(item.withdraw_amount),
    },
    {
      key: 'creator',
      label: 'Người tạo',
      render: (item: WithdrawProposal) => <CopyableTruncated value={item.creator} />,
    },
    {
      key: 'status',
      label: 'Thực hiện',
      render: (item: WithdrawProposal) => (
        <StatusBadge status={item.is_executed ? 'executed' : 'pending'} />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Chào mừng${profile?.first_name ? `, ${profile.first_name}` : ''}`}
        description="Tổng quan bảng điều khiển nhà hảo tâm"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Tổng đã quyên góp"
          value={formatVND(profile?.total_donation || 0)}
          icon={Wallet}
        />
        <StatsCard
          label="Giao dịch"
          value={profile?.record_amount || 0}
          icon={HandCoins}
        />
        <StatsCard
          label="Trẻ đã đăng ký"
          value={childrenCount}
          icon={Baby}
        />
        <StatsCard
          label="Đề xuất đang hoạt động"
          value={activeProposalsCount}
          icon={Vote}
        />
      </div>

      {/* Wallet Address */}
      {user?.address && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Địa chỉ ví</p>
              <p className="mt-1 font-mono text-sm text-slate-900">{user.address}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Wallet className="h-5 w-5 text-blue-800" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Giao dịch gần đây</h2>
          <Link
            href="/donor/transactions"
            className="flex items-center gap-1 text-sm font-medium text-blue-800 hover:text-blue-900"
          >
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <DataTable
          columns={txColumns}
          data={recentTxs}
          emptyMessage="Chưa có giao dịch"
          page={txPage}
          totalPages={txTotalPages}
          onPageChange={setTxPage}
        />
      </div>

      {/* Active Đề xuất rút tiền */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Đề xuất rút tiền đang hoạt động</h2>
          <Link
            href="/donor/withdrawals"
            className="flex items-center gap-1 text-sm font-medium text-blue-800 hover:text-blue-900"
          >
            Bỏ phiếu ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <DataTable
          columns={proposalColumns}
          data={activeProposals}
          emptyMessage="Không có đề xuất đang hoạt động"
          page={proposalPage}
          totalPages={proposalTotalPages}
          onPageChange={setProposalPage}
        />
      </div>
    </div>
  );
}
