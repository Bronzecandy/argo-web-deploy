'use client';

import { useEffect, useState, useCallback } from 'react';
import { withdrawService } from '@/src/services/withdraw.service';
import { useAppSelector } from '@/src/store/hooks';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import { formatVND, formatDateTime, formatDateTimeSeconds } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import DataTable from '@/src/components/ui/DataTable';
import CopyableTruncated from '@/src/components/ui/CopyableTruncated';
import StatusBadge from '@/src/components/ui/StatusBadge';
import type { WithdrawProposal } from '@/src/types/api.types';
import { Vote, ThumbsUp, ThumbsDown, X } from 'lucide-react';

export default function DonorWithdrawalsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { execute } = useExecuteTransaction();
  const [proposals, setProposals] = useState<WithdrawProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'open' | 'executed'>('open');

  // Vote modal
  const [selectedProposal, setSelectedProposal] = useState<WithdrawProposal | null>(null);
  const [voteType, setVoteType] = useState<boolean>(true);
  const [refuseReason, setRefuseReason] = useState('');
  const [voting, setVoting] = useState(false);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withdrawService.list({
        page,
        page_size: 20,
        is_closed: filter === 'executed' ? true : filter === 'open' ? false : undefined,
        is_executed: filter === 'executed' ? true : undefined,
        sort_order: 'desc',
      });
      setProposals(res.data.data || []);
      setTotalPages(res.data.total_pages || 1);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const handleVote = async () => {
    if (!selectedProposal) return;
    setVoting(true);
    const ok = await execute(
      () => withdrawService.vote(
        selectedProposal.id,
        voteType,
        voteType ? undefined : refuseReason || undefined,
      ),
      { successMessage: voteType ? 'Đã ghi nhận phiếu duyệt và thực thi on-chain' : 'Đã ghi nhận từ chối và thực thi on-chain' },
    );
    if (ok) {
      setSelectedProposal(null);
      void loadProposals();
    }
    setVoting(false);
  };

  const hasVoted = (proposal: WithdrawProposal) => {
    if (!user?.address) return false;
    return proposal.approvers?.includes(user.address) || proposal.refusers?.includes(user.address);
  };

  const columns = [
    {
      key: 'pool_name',
      label: 'Quỹ',
      render: (item: WithdrawProposal) => <span className="font-medium">{item.pool_name}</span>,
    },
    {
      key: 'description',
      label: 'Mô tả',
      render: (item: WithdrawProposal) => (
        <span className="max-w-[200px] truncate block text-slate-600">{item.description || '-'}</span>
      ),
    },
    {
      key: 'withdraw_amount',
      label: 'Số tiền',
      render: (item: WithdrawProposal) => (
        <span className="font-semibold text-slate-900">{formatVND(item.withdraw_amount)}</span>
      ),
    },
    {
      key: 'creator',
      label: 'Người tạo',
      render: (item: WithdrawProposal) => <CopyableTruncated value={item.creator} />,
    },
    {
      key: 'votes',
      label: 'Phiếu',
      render: (item: WithdrawProposal) => (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-blue-800">
            <ThumbsUp className="h-3 w-3" /> {item.approve_weight || 0}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <ThumbsDown className="h-3 w-3" /> {item.refuse_weight || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (item: WithdrawProposal) => (
        <StatusBadge status={item.is_executed ? 'executed' : 'pending'} />
      ),
    },
    {
      key: 'closed_at',
      label: 'Thời gian đóng',
      render: (item: WithdrawProposal) => (
        <span className="whitespace-nowrap text-xs text-slate-700">{formatDateTimeSeconds(item.closed_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (item: WithdrawProposal) => {
        if (item.is_executed) return <span className="text-xs text-slate-400">Đã đóng</span>;
        if (hasVoted(item)) return <span className="text-xs text-blue-800 font-medium">Đã bỏ phiếu</span>;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedProposal(item); setVoteType(true); setRefuseReason(''); }}
            className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
          >
            <Vote className="inline h-3 w-3 mr-1" /> Bỏ phiếu
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Đề xuất rút tiền"
        description="Xem và bỏ phiếu đề xuất rút tiền (quản trị DAO)"
      />

      {/* Filters */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(['open', 'executed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition ${
              filter === f ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {f === 'open' ? 'Đang mở' : f === 'executed' ? 'Đã thực thi' : 'Tất cả'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={proposals}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="Không tìm thấy đề xuất rút tiền"
      />

      {/* Vote Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Bỏ phiếu đề xuất</h3>
              <button onClick={() => setSelectedProposal(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 mb-4 text-sm">
              <p><span className="font-medium text-slate-700">Quỹ:</span> {selectedProposal.pool_name}</p>
              <p className="mt-1"><span className="font-medium text-slate-700">Số tiền:</span> {formatVND(selectedProposal.withdraw_amount)}</p>
              <p className="mt-1"><span className="font-medium text-slate-700">Mô tả:</span> {selectedProposal.description || '-'}</p>
              <p className="mt-1"><span className="font-medium text-slate-700">Ngày tạo:</span> {formatDateTime(selectedProposal.created_at)}</p>
              <p className="mt-1">
                <span className="font-medium text-slate-700">Thời gian đóng:</span>{' '}
                {formatDateTimeSeconds(selectedProposal.closed_at)}
              </p>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setVoteType(true)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition ${
                  voteType ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <ThumbsUp className="h-4 w-4" /> Duyệt
              </button>
              <button
                onClick={() => setVoteType(false)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition ${
                  !voteType ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <ThumbsDown className="h-4 w-4" /> Từ chối
              </button>
            </div>

            {!voteType && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Lý do từ chối</label>
                <textarea
                  value={refuseReason}
                  onChange={(e) => setRefuseReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  rows={2}
                  placeholder="Giải thích lý do từ chối..."
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedProposal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleVote()}
                disabled={voting}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  voteType ? 'bg-blue-800 hover:bg-blue-900' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {voting ? 'Đang gửi...' : voteType ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
