'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import { paymentService } from '@/src/services/payment.service';
import { isPaymentFailureStatus, isPaymentSuccessStatus } from '@/src/lib/paymentStatus';
import { isPayOSCancelled, resolvePaymentIdForCallback } from '@/src/lib/paymentCallback';
import { clearPendingPayOSPayment, loadPendingPayOSPayment } from '@/src/lib/paymentSessionStorage';
import { btnPrimary, btnSecondary } from '@/src/lib/uiClasses';

const POLL_MS = 2500;
const MAX_POLLS = 30;

type Phase = 'processing' | 'success' | 'fail' | 'cancelled' | 'unknown';
type ProcessingStep = 'callback' | 'status';

function readPaymentStatus(data: { status?: string; review_status?: string } | undefined): string {
  return (data?.status ?? data?.review_status ?? '').trim();
}

export default function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const paymentId = resolvePaymentIdForCallback(searchParams);
  const pending = loadPendingPayOSPayment();
  const cancelled = isPayOSCancelled(searchParams);

  const [phase, setPhase] = useState<Phase>(cancelled ? 'cancelled' : paymentId ? 'processing' : 'unknown');
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('callback');
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [callbackWarn, setCallbackWarn] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (cancelled) {
      clearPendingPayOSPayment();
      return;
    }
    if (!paymentId || ranRef.current) return;
    ranRef.current = true;

    let stopped = false;
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (p: Phase, msg?: string) => {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      setPhase(p);
      if (msg) setDetail(msg);
      if (p === 'success' || p === 'fail') clearPendingPayOSPayment();
    };

    const pollStatus = async (): Promise<boolean> => {
      setProcessingStep('status');
      try {
        const res = await paymentService.getPaymentStatus(paymentId);
        const status = readPaymentStatus(res.data);
        setLastStatus(status || null);
        if (isPaymentSuccessStatus(status)) {
          finish('success');
          return true;
        }
        if (isPaymentFailureStatus(status)) {
          const msg = [res.data?.cancel_reason, res.data?.message].filter(Boolean).join(' — ');
          finish('fail', msg || undefined);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const schedulePoll = () => {
      if (stopped) return;
      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        finish(
          'unknown',
          'Giao dịch vẫn đang xử lý trên máy chủ. Vui lòng đợi vài phút rồi kiểm tra lại trong Kho bạc hoặc lịch sử giao dịch.',
        );
        return;
      }
      timer = setTimeout(() => void tick(), POLL_MS);
    };

    const tick = async () => {
      const done = await pollStatus();
      if (!done && !stopped) schedulePoll();
    };

    const run = async () => {
      setPhase('processing');
      setProcessingStep('callback');
      setCallbackWarn(null);
      setLastStatus(null);
      setDetail(null);

      try {
        await paymentService.triggerServerCallback(paymentId);
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        setCallbackWarn(
          msg ||
            'Callback máy chủ báo lỗi — vẫn tiếp tục kiểm tra trạng thái (webhook có thể đã xử lý trước đó).',
        );
      }

      const done = await pollStatus();
      if (!done && !stopped) schedulePoll();
    };

    void run();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [cancelled, paymentId]);

  const isSuccess = phase === 'success';
  const isFailure = phase === 'fail';
  const isCancelled = phase === 'cancelled';
  const isProcessing = phase === 'processing';
  const isUnknown = phase === 'unknown';

  const returnHref =
    pending?.source === 'donate'
      ? '/donor/transactions'
      : pending?.source === 'treasury' || pending?.proposalId
        ? '/admin/treasury'
        : '/admin/treasury';

  const stepCallbackActive = isProcessing && processingStep === 'callback';
  const stepStatusActive = isProcessing && processingStep === 'status';

  const displayTitle = isProcessing
    ? 'Đang xử lý thanh toán…'
    : isSuccess
      ? 'Thanh toán thành công'
      : isCancelled
        ? 'Giao dịch đã hủy'
        : isFailure
          ? 'Thanh toán thất bại'
          : 'Đang đồng bộ';

  const Icon = isProcessing ? Loader2 : isSuccess ? CheckCircle2 : isCancelled || isUnknown ? AlertCircle : XCircle;
  const iconClass = isProcessing
    ? 'animate-spin text-blue-800'
    : isSuccess
      ? 'text-blue-800'
      : isCancelled
        ? 'text-amber-700'
        : isUnknown
          ? 'text-amber-700'
          : 'text-red-700';
  const bgClass = isProcessing
    ? 'bg-blue-50'
    : isSuccess
      ? 'bg-blue-50'
      : isCancelled
        ? 'bg-amber-50'
        : isUnknown
          ? 'bg-amber-50'
          : 'bg-red-50';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Kết quả thanh toán"
          description="PayOS quay về AgroTrust — xử lý on-chain và kiểm tra trạng thái"
        />

        <div className={`rounded-xl border border-slate-200 p-8 text-center ${bgClass}`}>
          <Icon className={`mx-auto h-14 w-14 ${iconClass}`} aria-hidden={isProcessing} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{displayTitle}</h2>

          {isProcessing && (
            <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
              <li className="flex items-start gap-2">
                {stepCallbackActive ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-800" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" />
                )}
                <span className={stepCallbackActive ? 'font-medium text-slate-900' : 'text-slate-600'}>
                  Bước 1: Gọi callback đẩy lên blockchain
                  {stepCallbackActive && '…'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                {stepStatusActive ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-800" />
                ) : (
                  <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                )}
                <span className={stepStatusActive ? 'font-medium text-slate-900' : 'text-slate-500'}>
                  Bước 2: Lấy trạng thái giao dịch
                  {stepStatusActive && '…'}
                  {stepStatusActive && lastStatus && (
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      Hiện tại: {lastStatus}
                    </span>
                  )}
                </span>
              </li>
            </ul>
          )}

          {!isProcessing && (
            <p className="mt-2 text-sm text-slate-700">
              {isSuccess
                ? 'Giao dịch đã được ghi nhận on-chain. Bạn có thể quay lại ứng dụng.'
                : isCancelled
                  ? 'Bạn đã hủy hoặc đóng phiên PayOS.'
                  : isFailure
                    ? detail || 'Thanh toán không thành công.'
                    : detail ||
                      (paymentId
                        ? 'Chưa có trạng thái cuối — thử lại sau hoặc kiểm tra trong Kho bạc.'
                        : 'Thiếu payment_id trên URL (?payment_id=…).')}
            </p>
          )}

          {callbackWarn && isProcessing && (
            <p className="mt-3 text-xs text-amber-800">{callbackWarn}</p>
          )}

          {paymentId && (
            <p className="mt-3 font-mono text-xs text-slate-500">payment_id: {paymentId}</p>
          )}

          {!isProcessing && (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href={returnHref} className={btnPrimary}>
                Quay lại ứng dụng
              </Link>
              <Link href="/" className={btnSecondary}>
                Trang chủ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
