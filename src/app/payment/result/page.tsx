'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import PageHeader from '@/src/components/ui/PageHeader';

/**
 * Public return page for PayOS and similar gateways after browser redirect
 * (donations, **Admin Kho bạc** payout PayOS, etc.).
 * Configure backend / PayOS `returnUrl` to: `${origin}/payment/result` (or NEXT_PUBLIC_APP_URL + `/payment/result`).
 *
 * Handles common query shapes:
 * - PayOS-style: `code=00` success, `cancel=true` user cancelled
 * - Generic: `status=success|failed|cancelled`
 */
function PaymentResultContent() {
  const searchParams = useSearchParams();

  const code = (searchParams.get('code') || '').trim();
  const cancelParam = searchParams.get('cancel');
  const cancelled =
    cancelParam === 'true' ||
    cancelParam === '1' ||
    (searchParams.get('status') || '').toLowerCase() === 'cancelled' ||
    (searchParams.get('status') || '').toLowerCase() === 'canceled';

  const statusParam = (searchParams.get('status') || '').toLowerCase();
  const titleQ = searchParams.get('title');
  const messageQ = searchParams.get('message');
  const descQ = searchParams.get('desc');

  const codeSuccess = code === '00' || code.toUpperCase() === 'SUCCESS';
  const statusSuccess =
    statusParam === 'success' ||
    statusParam === 'paid' ||
    statusParam === 'completed' ||
    statusParam === 'complete';

  const explicitFail =
    (!cancelled &&
      !!code &&
      !codeSuccess &&
      code.toUpperCase() !== 'SUCCESS' &&
      code !== '0') ||
    statusParam === 'failed' ||
    statusParam === 'error' ||
    statusParam === 'failure';

  const isSuccess = !cancelled && !explicitFail && (codeSuccess || statusSuccess);
  const isFailure = !cancelled && explicitFail && !isSuccess;
  const isUnknown = !cancelled && !isSuccess && !isFailure;

  const displayTitle =
    titleQ ||
    (isSuccess
      ? 'Thanh toán thành công'
      : cancelled
        ? 'Giao dịch đã hủy'
        : isFailure
          ? 'Thanh toán thất bại'
          : 'Không xác định trạng thái');
  const displayMessage =
    messageQ ||
    descQ ||
    (isSuccess
      ? 'Giao dịch đã được ghi nhận. Bạn có thể đóng trang này và quay lại ứng dụng. Nếu số dư chưa cập nhật, vui lòng đợi vài phút hoặc dùng nút «Kiểm tra thanh toán» trong ứng dụng.'
      : cancelled
        ? 'Bạn đã hủy hoặc phiên thanh toán đã đóng. Thử lại từ màn hình quyên góp hoặc Kho bạc (quản trị) nếu đang chi trả.'
        : isFailure
          ? 'Cổng thanh toán báo không thành công. Vui lòng kiểm tra trong ứng dụng hoặc thử lại.'
          : 'Không nhận được mã trạng thái rõ ràng từ PayOS. Hãy mở lại ứng dụng và dùng «Kiểm tra thanh toán» hoặc xem lịch sử giao dịch.');

  const Icon = isSuccess ? CheckCircle2 : cancelled || isUnknown ? AlertCircle : XCircle;
  const iconClass = isSuccess ? 'text-blue-800' : cancelled ? 'text-amber-700' : isUnknown ? 'text-slate-600' : 'text-red-700';
  const bgClass = isSuccess ? 'bg-blue-50' : cancelled ? 'bg-amber-50' : isUnknown ? 'bg-slate-50' : 'bg-red-50';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Kết quả thanh toán"
          description="Trang quay về sau PayOS / ngân hàng (quyên góp hoặc chi trả trong Kho bạc quản trị)"
        />
        <div className={`rounded-xl border border-slate-200 p-8 text-center ${bgClass}`}>
          <Icon className={`mx-auto h-14 w-14 ${iconClass}`} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{displayTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{displayMessage}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              Về trang chủ
            </Link>
            <Link
              href="/donor/discover"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Khám phá
            </Link>
            <Link
              href="/admin/treasury"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Kho bạc (admin)
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
