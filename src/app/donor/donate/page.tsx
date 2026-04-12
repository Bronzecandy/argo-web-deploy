'use client';

import { useState } from 'react';
import { paymentService } from '@/src/services/payment.service';
import PageHeader from '@/src/components/ui/PageHeader';
import { formatVND } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { HandCoins, ExternalLink } from 'lucide-react';

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function DonorDonatePage() {
  const [poolId, setPoolId] = useState('');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDonate = async () => {
    if (!poolId.trim()) {
      toast.error('Please enter a pool ID');
      return;
    }
    if (!amount || amount < 1000) {
      toast.error('Please enter a valid amount (minimum 1,000 VND)');
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
        window.open(res.data.url, '_blank');
        toast.success('Payment page opened in a new tab');
      } else {
        toast.success('Donation submitted successfully');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to process donation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Donate"
        description="Make a donation to a specific pool via PayOS"
      />

      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <HandCoins className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">General Donation</h2>
              <p className="text-sm text-slate-500">Donate to any pool in the network</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pool ID</label>
              <input
                type="text"
                placeholder="Enter pool ID"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                You can find pool IDs on the child detail or campaign pages
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount (VND)</label>
              <input
                type="number"
                placeholder="Enter amount"
                min={1000}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      amount === preset
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {formatVND(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Message (optional)</label>
              <textarea
                placeholder="Leave a message for the community..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {amount > 0 && (
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
                <p className="text-sm text-emerald-800">
                  You are about to donate <span className="font-bold">{formatVND(amount)}</span>
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  Payment will be processed securely via PayOS
                </p>
              </div>
            )}

            <button
              onClick={() => void handleDonate()}
              disabled={submitting || !poolId || !amount}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Donate Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
