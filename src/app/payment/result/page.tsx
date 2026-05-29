'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';
import { paymentService } from '@/src/services/payment.service';
import { isPaymentFailureStatus, isPaymentSuccessStatus } from '@/src/lib/paymentStatus';
import { isPayOSCancelled, parsePaymentIdFromSearchParams } from '@/src/lib/paymentCallback';

const POLL_MS = 2000;
const MAX_POLLS = 20;

type Phase = 'idle' | 'processing' | 'success' | 'fail' | 'cancelled' | 'unknown';

function readPaymentStatus(data: { status?: string; review_status?: string } | undefined): string {
  return (data?.status ?? data?.review_status ?? '').trim();
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const paymentId = parsePaymentIdFromSearchParams(searchParams);
  const cancelled = isPayOSCancelled(searchParams);

  const [phase, setPhase] = useState<Phase>(cancelled ? 'cancelled' : paymentId ? 'processing' : 'unknown');
  const [detail, setDetail] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const ranRef = useRef(false);

  const code = (searchParams.get('code') || '').trim();
  const codeSuccess = code === '00' || code.toUpperCase() === 'SUCCESS';

  useEffect(() => {
    if (cancelled || !paymentId || ranRef.current) return;
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
    };

    const pollStatus = async (): Promise<boolean> => {
      try {
        const res = await paymentService.getPaymentStatus(paymentId);
        const status = readPaymentStatus(res.data);
        if (isPaymentSuccessStatus(status)) {
          finish('success');
          return true;
        }
        if (isPaymentFailureStatus(status)) {
          const msg = [res.data?.cancel_reason, res.data?.message].filter(Boolean).join(' — ');
          finish('fail', msg || undefined);
          return true;
        }
        setDetail(status ? `Trạng thái: ${status}` : null);
        return false;
      } catch {
        return false;
      }
    };

    const run = async () => {
      setPhase('processing');
      setCallbackError(null);

      try {
        await paymentService.triggerServerCallback(paymentId);
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
            : '';
        setCallbackError(msg || 'Không gọi được xử lý thanh toán trên máy chủ (callback).');
        // Vẫn poll — webhook có thể đã xử lý trước đó
      }

      if (codeSuccess) {
        const done = await pollStatus();
        if (done || stopped) return;
      }

      const schedule = () => {
        if (stopped) return;
        pollCount += 1;
        if (pollCount > MAX_POLLS) {
          if (codeSuccess) finish('success', 'PayOS báo thành công; hệ thống đang đồng bộ — kiểm tra lại sau vài phút.');
          else finish('unknown');
          return;
        }
        timer = setTimeout(() => void tick(), POLL_MS);
      };

      const tick = async () => {
        const done = await pollStatus();
        if (!done && !stopped) schedule();
      };

      await tick();
    };

    void run();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [cancelled, paymentId, codeSuccess]);

  const isSuccess = phase === 'success';
  const isFailure = phase === 'fail';
  const isCancelled = phase === 'cancelled';
  const isProcessing = phase === 'processing';
  const isUnknown = phase === 'unknown';

  const displayTitle = isProcessing
    ? 'Đang xác nhận thanh toán…'
    : isSuccess
      ? 'Thanh toán thành công'
      : isCancelled
        ? 'Giao dịch đã hủy'
        : isFailure
          ? 'Thanh toán thất bại'
          : 'Không xác định trạng thái';

  const displayMessage = isProcessing
    ? 'Đang gọi máy chủ xử lý giao dịch và đồng bộ on-chain. Vui lòng không đóng trang.'
    : isSuccess
      ? 'Giao dịch đã được ghi nhận. Bạn có thể quay lại Kho bạc hoặc trang quyên góp.'
      : isCancelled
        ? 'Bạn đã hủy hoặc đóng phiên PayOS.'
        : isFailure
          ? detail || 'Cổng thanh toán hoặc hệ thống báo không thành công.'
          : callbackError ||
            detail ||
            (paymentId
              ? 'Chưa nhận trạng thái cuối. Thử mở lại Kho bạc và «Kiểm tra thanh toán».'
              : 'Thiếu payment_id trên URL. Backend cần gắn ?payment_id=… vào returnUrl.');

  const Icon = isProcessing ? Loader2 : isSuccess ? CheckCircle2 : isCancelled || isUnknown ? AlertCircle : XCircle;
  const iconClass = isProcessing
    ? 'animate-spin text-blue-800'
    : isSuccess
      ? 'text-blue-800'
      : isCancelled
        ? 'text-amber-700'
        : isUnknown
          ? 'text-slate-600'
          : 'text-red-700';
  const bgClass = isProcessing
    ? 'bg-blue-50'
    : isSuccess
      ? 'bg-blue-50'
      : isCancelled
        ? 'bg-amber-50'
        : isUnknown
          ? 'bg-slate-50'
          : 'bg-red-50';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Kết quả thanh toán"
          description="PayOS quay về web → gọi callback máy chủ → hiển thị kết quả"
        />
        <div className={`rounded-xl border border-slate-200 p-8 text-center ${bgClass}`}>
          <Icon className={`mx-auto h-14 w-14 ${iconClass}`} aria-hidden={isProcessing} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{displayTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{displayMessage}</p>
          {paymentId && (
            <p className="mt-2 font-mono text-xs text-slate-500">Mã thanh toán: {paymentId}</p>
          )}
          {callbackError && phase !== 'processing' && (
            <p className="mt-2 text-xs text-amber-800">{callbackError}</p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/admin/treasury"
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              Kho bạc (admin)
            </Link>
            <Link
              href="/donor/discover"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Khám phá
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-slate-500">Đang tải…</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
