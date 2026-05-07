'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/src/services/payment.service';
import { isPaymentSuccessStatus } from '@/src/lib/paymentStatus';
import type { PayOSDialogState } from '@/src/hooks/useWithdrawProposalConfirm';

const POLL_MS = 3000;
const MAX_POLLS = 25;

type Props = {
  state: PayOSDialogState;
  onClose: () => void;
  onPaymentSuccess?: () => void;
};

export default function PayOSPaymentDialog({ state, onClose, onPaymentSuccess }: Props) {
  const [checking, setChecking] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkOnce = useCallback(async () => {
    const pid = state.paymentId;
    if (pid === undefined || pid === null || pid === '') return;

    try {
      const res = await paymentService.getPaymentStatus(pid);
      const status = res.data?.status ?? '';
      setLastStatus(status);
      if (isPaymentSuccessStatus(status)) {
        resolvedRef.current = true;
        clearTimer();
        toast.success('Thanh toán đã được ghi nhận.');
        onPaymentSuccess?.();
        onClose();
      }
    } catch {
      /* ignore transient errors while polling */
    }
  }, [state.paymentId, onClose, onPaymentSuccess]);

  const schedulePoll = useCallback(() => {
    clearTimer();
    if (!state.open || resolvedRef.current) return;
    if (state.paymentId === undefined || state.paymentId === null || state.paymentId === '') return;

    timerRef.current = setTimeout(async () => {
      await checkOnce();
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        clearTimer();
        return;
      }
      schedulePoll();
    }, POLL_MS);
  }, [state.open, state.paymentId, checkOnce]);

  useEffect(() => {
    if (!state.open) {
      resolvedRef.current = false;
      pollCount.current = 0;
      setLastStatus(null);
      clearTimer();
      return;
    }
    if (state.paymentId !== undefined && state.paymentId !== null && state.paymentId !== '') {
      void checkOnce();
      schedulePoll();
    }
    return () => clearTimer();
  }, [state.open, state.paymentId, checkOnce, schedulePoll]);

  const openPayOS = () => {
    if (!state.url) return;
    window.open(state.url, '_blank', 'noopener,noreferrer');
  };

  const manualCheck = async () => {
    setChecking(true);
    try {
      await checkOnce();
      if (!resolvedRef.current) {
        toast.message(lastStatus ? `Trạng thái: ${lastStatus}` : 'Chưa nhận được thanh toán.');
      }
    } finally {
      setChecking(false);
    }
  };

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{state.title || 'Thanh toán PayOS'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Nhấn &quot;Mở PayOS&quot; để hoàn tất chuyển tiền. Hệ thống sẽ tự kiểm tra trạng thái
          {state.paymentId != null ? ' (đã có mã thanh toán).' : '.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPayOS}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Mở PayOS
          </button>
          <button
            type="button"
            onClick={() => void manualCheck()}
            disabled={checking}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
        {lastStatus && (
          <p className="mt-3 text-xs text-slate-500">Trạng thái gần nhất: {lastStatus}</p>
        )}
      </div>
    </div>
  );
}
