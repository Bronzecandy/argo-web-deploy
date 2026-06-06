'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PAYMENT_CALLBACK_PATH } from '@/src/lib/constants';

/** Alias — giữ returnUrl cũ `/payment/result` → chuyển sang `/payment/callback` */
function PaymentResultRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`${PAYMENT_CALLBACK_PATH}${q ? `?${q}` : ''}`);
  }, [router, searchParams]);

  return <div className="min-h-screen p-8 text-center text-slate-500">Đang chuyển…</div>;
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-slate-500">Đang tải…</div>}>
      <PaymentResultRedirect />
    </Suspense>
  );
}
