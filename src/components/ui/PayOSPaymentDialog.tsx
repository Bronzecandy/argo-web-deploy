'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/src/services/payment.service';
import { isPaymentFailureStatus, isPaymentSuccessStatus } from '@/src/lib/paymentStatus';
import type { PayOSDialogState } from '@/src/hooks/useWithdrawProposalConfirm';
import { btnPrimary, btnSecondary } from '@/src/lib/uiClasses';
import { savePendingPayOSPayment } from '@/src/lib/paymentSessionStorage';

const POLL_MS = 3000;
const MAX_POLLS = 25;

type Outcome =
  | null
  | { kind: 'success' }
  | { kind: 'fail'; message?: string }
  | { kind: 'timeout' };

type Props = {
  state: PayOSDialogState;
  onClose: () => void;
  onPaymentSuccess?: () => void;
};

function readPaymentStatus(data: { status?: string; review_status?: string } | undefined): string {
  return (data?.status ?? data?.review_status ?? '').trim();
}

export default function PayOSPaymentDialog({ state, onClose, onPaymentSuccess }: Props) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [manualChecking, setManualChecking] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const pollsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finalizeSuccess = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
    setOutcome({ kind: 'success' });
    onPaymentSuccess?.();
  }, [onPaymentSuccess]);

  const finalizeFail = useCallback((message?: string) => {
    stoppedRef.current = true;
    clearTimer();
    setOutcome({ kind: 'fail', message });
  }, []);

  const finalizeTimeout = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
    setOutcome({ kind: 'timeout' });
  }, []);

  const evaluateStatus = useCallback(
    (statusRaw: string, detail?: string) => {
      if (isPaymentSuccessStatus(statusRaw)) {
        finalizeSuccess();
        return true;
      }
      if (isPaymentFailureStatus(statusRaw)) {
        finalizeFail(detail);
        return true;
      }
      return false;
    },
    [finalizeFail, finalizeSuccess],
  );

  /** One GET /payments/:id. `terminal` means success/fail handled or unrecoverable skip. */
  const pollOnce = useCallback(async (): Promise<{ terminal: boolean; displayStatus?: string }> => {
    const pid = state.paymentId;
    if (pid === undefined || pid === null || pid === '') return { terminal: true };

    try {
      const res = await paymentService.getPaymentStatus(pid);
      const status = readPaymentStatus(res.data);
      const displayStatus = status || '(trống)';
      setLastStatus(displayStatus);
      const detail = [res.data?.cancel_reason, res.data?.message].filter(Boolean).join(' — ') || undefined;
      if (evaluateStatus(status, detail)) return { terminal: true, displayStatus };
      return { terminal: false, displayStatus };
    } catch {
      return { terminal: false };
    }
  }, [evaluateStatus, state.paymentId]);

  useEffect(() => {
    if (!state.open) {
      stoppedRef.current = false;
      pollsRef.current = 0;
      setOutcome(null);
      setLastStatus(null);
      clearTimer();
      return;
    }

    const pid = state.paymentId;
    if (pid === undefined || pid === null || pid === '') {
      return;
    }

    stoppedRef.current = false;
    pollsRef.current = 0;
    setOutcome(null);
    setLastStatus(null);
    clearTimer();

    const run = async () => {
      if (stoppedRef.current) return;

      const { terminal } = await pollOnce();
      if (terminal || stoppedRef.current) return;

      pollsRef.current += 1;
      if (pollsRef.current >= MAX_POLLS) {
        finalizeTimeout();
        return;
      }

      timerRef.current = setTimeout(() => {
        void run();
      }, POLL_MS);
    };

    void run();

    return () => {
      stoppedRef.current = true;
      clearTimer();
    };
  }, [state.open, state.paymentId, pollOnce, finalizeTimeout]);

  useEffect(() => {
    const pid = state.paymentId;
    if (!state.open || pid === undefined || pid === null || pid === '') return;
    savePendingPayOSPayment({
      paymentId: String(pid),
      source: 'treasury',
      proposalId: state.proposalId ?? undefined,
    });
  }, [state.open, state.paymentId, state.proposalId]);

  const openPayOS = () => {
    if (!state.url) return;
    const pid = state.paymentId;
    if (pid !== undefined && pid !== null && pid !== '') {
      savePendingPayOSPayment({
        paymentId: String(pid),
        source: 'treasury',
        proposalId: state.proposalId ?? undefined,
      });
    }
    window.open(state.url, '_blank', 'noopener,noreferrer');
  };

  const manualCheck = async () => {
    const pid = state.paymentId;
    if (pid === undefined || pid === null || pid === '') {
      toast.message('Chưa có mã thanh toán để kiểm tra.');
      return;
    }
    setManualChecking(true);
    try {
      const { terminal, displayStatus } = await pollOnce();
      if (terminal) return;
      toast.message(
        displayStatus ? `Trạng thái hiện tại: ${displayStatus}` : 'Chưa nhận được thanh toán thành công.',
      );
    } finally {
      setManualChecking(false);
    }
  };

  const closeFromResult = () => {
    onClose();
  };

  if (!state.open) return null;

  if (outcome?.kind === 'success') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-14 w-14 text-blue-800" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Thanh toán thành công</h3>
          <p className="mt-2 text-sm text-slate-600">
            Giao dịch đã được ghi nhận. Bạn có thể đóng hộp thoại này.
          </p>
          <button
            type="button"
            onClick={closeFromResult}
            className={`mt-6 w-full sm:w-auto ${btnPrimary}`}
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  if (outcome?.kind === 'fail') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto h-14 w-14 text-red-700" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Thanh toán thất bại</h3>
          <p className="mt-2 text-sm text-slate-600">
            {outcome.message?.trim() ||
              'Cổng thanh toán hoặc hệ thống báo giao dịch không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.'}
          </p>
          <button
            type="button"
            onClick={closeFromResult}
            className={`mt-6 w-full sm:w-auto ${btnSecondary}`}
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  if (outcome?.kind === 'timeout') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto h-14 w-14 text-amber-700" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Chưa có kết quả xác định</h3>
          <p className="mt-2 text-sm text-slate-600">
            Đã kiểm tra nhiều lần nhưng trạng thái vẫn chưa thành công hay thất bại rõ ràng. Bạn có thể nhấn «Kiểm tra
            thanh toán» sau hoặc xem lại lịch sử giao dịch.
          </p>
          <button
            type="button"
            onClick={closeFromResult}
            className={`mt-6 w-full sm:w-auto ${btnSecondary}`}
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const hasPaymentId = state.paymentId !== undefined && state.paymentId !== null && state.paymentId !== '';
  const showProcessingBanner = hasPaymentId && !outcome;

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

        {showProcessingBanner && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-950">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-800" aria-hidden />
            <div>
              <p className="font-medium">Đang xử lý giao dịch</p>
              <p className="mt-0.5 text-xs text-blue-900/80">
                Hệ thống đang kiểm tra trạng thái thanh toán trên máy chủ (lặp lại sau vài giây). Vui lòng đợi…
              </p>
            </div>
          </div>
        )}

        <p className="mb-4 text-sm text-slate-600">
          Nhấn &quot;Mở PayOS&quot; để hoàn tất chuyển khoản.
          {hasPaymentId ? ' Trạng thái sẽ được cập nhật tự động.' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPayOS}
            className={btnPrimary}
          >
            Mở PayOS
          </button>
          <button
            type="button"
            onClick={() => void manualCheck()}
            disabled={manualChecking || !hasPaymentId}
            className={btnSecondary}
          >
            {manualChecking ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={btnSecondary}
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
