'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { paymentService } from '@/src/services/payment.service';
import PageHeader from '@/src/components/ui/PageHeader';
import GroupedNumericInput from '@/src/components/ui/GroupedNumericInput';
import { formatVND, parseDigitsToNumber } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { HandCoins, ExternalLink } from 'lucide-react';
import { savePendingPayOSPayment } from '@/src/lib/paymentSessionStorage';

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function DonorDonatePage() {
  const searchParams = useSearchParams();
  const [poolId, setPoolId] = useState('');

  useEffect(() => {
    const qPoolId = searchParams.get('poolId');
    if (qPoolId) setPoolId(qPoolId);
  }, [searchParams]);
  const [amountDigits, setAmountDigits] = useState('');
  const amount = parseDigitsToNumber(amountDigits) ?? 0;
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDonate = async () => {
    if (!poolId.trim()) {
      toast.error('Vui lòng nhập mã quỹ (pool ID)');
      return;
    }
    if (!amount || amount < 1000) {
      toast.error('Vui lòng nhập số tiền hợp lệ (tối thiểu 1.000 đ)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await paymentService.donate({
        pool_id: poolId.trim(),
        amount,
        message: message.trim() || undefined,
      });
      if (res.data.url) {
        const paymentId = res.data.payment_id ?? res.data.id ?? res.data.order_code;
        if (paymentId !== undefined && paymentId !== null && paymentId !== '') {
          savePendingPayOSPayment({ paymentId: String(paymentId), source: 'donate' });
        }
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
        toast.success('Đã mở trang thanh toán trong tab mới');
      } else {
        toast.success('Quyên góp thành công');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Không xử lý được quyên góp');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Quyên góp"
        description="Quyên góp vào một quỹ cụ thể qua PayOS"
      />

      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <HandCoins className="h-6 w-6 text-blue-800" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quyên góp chung</h2>
              <p className="text-sm text-slate-500">Chọn quỹ bất kỳ trong mạng lưới</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Mã quỹ (Pool ID)</label>
              <input
                type="text"
                placeholder="Nhập mã quỹ"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
              <p className="mt-1 text-xs text-slate-400">
                Bạn có thể tìm mã quỹ ở trang chi tiết trẻ hoặc chiến dịch
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số tiền (VND)</label>
                <GroupedNumericInput
                  placeholder="Nhập số tiền"
                  value={amountDigits}
                  onChange={setAmountDigits}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />

              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountDigits(String(preset))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      amount === preset
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {formatVND(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lời nhắn (tùy chọn)</label>
              <textarea
                placeholder="Để lại lời nhắn cho cộng đồng…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            {amount > 0 && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                <p className="text-sm text-blue-900">
                  Bạn sắp quyên góp <span className="font-bold">{formatVND(amount)}</span>
                </p>
                <p className="mt-1 text-xs text-blue-800">
                  Thanh toán được xử lý an toàn qua PayOS
                </p>
              </div>
            )}

            <button
              onClick={() => void handleDonate()}
              disabled={submitting || !poolId || amount < 1000}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý…
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Quyên góp ngay
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
