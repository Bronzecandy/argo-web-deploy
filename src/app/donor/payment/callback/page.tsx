'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/src/components/ui/PageHeader';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') || 'success').toLowerCase();
  const title = searchParams.get('title');
  const message = searchParams.get('message');

  const isSuccess = status === 'success';
  const isCancelled = status === 'cancelled' || status === 'canceled';

  const displayTitle =
    title ||
    (isSuccess ? 'Payment successful' : isCancelled ? 'Transaction cancelled' : 'Something went wrong');
  const displayMessage =
    message ||
    (isSuccess
      ? 'Your payment was recorded. You can continue exploring or check your transactions.'
      : isCancelled
        ? 'You cancelled the transaction or the payment provider closed the session.'
        : 'Please try again or contact support if the problem persists.');

  const Icon = isSuccess ? CheckCircle2 : isCancelled ? AlertCircle : XCircle;
  const iconClass = isSuccess ? 'text-blue-800' : isCancelled ? 'text-amber-700' : 'text-red-700';
  const bgClass = isSuccess ? 'bg-blue-50' : isCancelled ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div>
      <PageHeader title="Payment result" description="Return URL after PayOS or similar checkout" />
      <div className={`mx-auto max-w-md rounded-xl border border-slate-200 p-8 text-center ${bgClass}`}>
        <Icon className={`mx-auto h-14 w-14 ${iconClass}`} />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">{displayTitle}</h2>
        <p className="mt-2 text-sm text-slate-700">{displayMessage}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/donor/discover"
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Discover
          </Link>
          <Link href="/donor/transactions" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">
            Transactions
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DonorPaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải…</div>}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
