'use client';

import { Suspense } from 'react';
import PaymentCallbackContent from '@/src/components/payment/PaymentCallbackContent';

/**
 * PayOS returnUrl → `${NEXT_PUBLIC_APP_URL}/payment/callback?payment_id={id}`
 * Trang này gọi GET `/payments/callback/{payment_id}` (NEXT_PUBLIC_PAYMENT_SERVER_CALLBACK_PATH).
 */
export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-slate-500">Đang tải…</div>}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
