'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { giftService } from '@/src/services/gift.service';
import { blobService } from '@/src/services/blob.service';
import { useExecuteTransaction } from '@/src/hooks/useExecuteTransaction';
import PageHeader from '@/src/components/ui/PageHeader';
import { toast } from 'sonner';
import { Gift, Send, Upload, Package } from 'lucide-react';

export default function DonorGiftsPage() {
  const { execute } = useExecuteTransaction();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'send' | 'track'>('send');

  // Send gift form
  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    const childId = searchParams.get('childId');
    if (childId) setRecipient(childId);
  }, [searchParams]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [giftValue, setGiftValue] = useState(0);
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  // Track gift
  const [trackChildId, setTrackChildId] = useState('');
  const [trackedGifts, setTrackedGifts] = useState<any[]>([]);
  const [tracking, setTracking] = useState(false);
  const [giftPage, setGiftPage] = useState(0);
  const [giftTotalPages, setGiftTotalPages] = useState(1);

  const handleSendGift = async () => {
    if (!recipient.trim()) {
      toast.error('Please enter the child ID (recipient)');
      return;
    }
    if (!category.trim()) {
      toast.error('Please select a category');
      return;
    }

    setSending(true);
    try {
      let imageBlobId = '';
      if (imageFile) {
        imageBlobId = await blobService.upload(imageFile);
      }

      const ok = await execute(
        () => giftService.create({
          recipient: recipient.trim(),
          category: category.trim(),
          description: description.trim(),
          message: message.trim(),
          gift_image_blob_id: imageBlobId,
          gift_value: giftValue,
          carrier: carrier.trim(),
          tracking_code: trackingCode.trim(),
        }),
        { successMessage: 'Gift sent & recorded on-chain' },
      );
      if (!ok) { setSending(false); return; }
      setRecipient('');
      setCategory('');
      setDescription('');
      setMessage('');
      setGiftValue(0);
      setCarrier('');
      setTrackingCode('');
      setImageFile(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const GIFT_PAGE_SIZE = 20;

  const handleTrackGifts = async (pageOverride?: number) => {
    if (!trackChildId.trim()) {
      toast.error('Please enter a child ID');
      return;
    }
    const p = pageOverride ?? giftPage;
    setTracking(true);
    try {
      const res = await giftService.listByChild(trackChildId.trim(), {
        page: p,
        page_size: GIFT_PAGE_SIZE,
        sort_order: 'desc',
      });
      setTrackedGifts(res.data.data || []);
      setGiftTotalPages(Math.max(1, res.data.total_pages ?? 1));
      if (pageOverride === undefined && p === 0 && !res.data.data?.length) {
        toast.info('No gifts found for this child');
      }
    } catch {
      toast.error('Failed to load gifts');
    } finally {
      setTracking(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Gifts"
        description="Send gifts to children and track delivery status"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('send')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'send' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="h-4 w-4" /> Send Gift
        </button>
        <button
          onClick={() => setTab('track')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'track' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="h-4 w-4" /> Track Gifts
        </button>
      </div>

      {tab === 'send' ? (
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
                <Gift className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send a Gift</h2>
                <p className="text-sm text-slate-500">Brighten a child&apos;s day</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Child ID (recipient)</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter child ID"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                >
                  <option value="">Select category</option>
                  <option value="clothing">Clothing</option>
                  <option value="food">Food</option>
                  <option value="school_supplies">School Supplies</option>
                  <option value="toys">Toys</option>
                  <option value="books">Books</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you sending?"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Personal message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message for the child..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gift value (VND)</label>
                <input
                  type="number"
                  min={0}
                  value={giftValue || ''}
                  onChange={(e) => setGiftValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Carrier</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g. VNPost, GHN"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tracking code</label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Shipment tracking"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gift photo</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-800 transition">
                  <Upload className="h-4 w-4" />
                  {imageFile ? imageFile.name : 'Click to upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button
                onClick={() => void handleSendGift()}
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50 transition"
              >
                {sending ? 'Sending...' : <><Send className="h-4 w-4" /> Send Gift</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={trackChildId}
              onChange={(e) => setTrackChildId(e.target.value)}
              placeholder="Enter child ID to see their gifts"
              className="flex-1 max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
            <button
              onClick={() => {
                setGiftPage(0);
                void handleTrackGifts(0);
              }}
              disabled={tracking}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {tracking ? 'Loading...' : 'Search'}
            </button>
          </div>

          {trackedGifts.length > 0 && (
            <div className="space-y-3">
              {trackedGifts.map((g: any) => (
                <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700 border border-pink-200 capitalize">
                        {g.category}
                      </span>
                      <p className="mt-1 font-medium text-slate-900">{g.description}</p>
                      {g.message && <p className="mt-0.5 text-sm text-slate-500 italic">&ldquo;{g.message}&rdquo;</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      g.status === 'delivered' ? 'bg-blue-50 text-blue-900 border border-blue-200' :
                      g.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                    {g.carrier && <span>Carrier: {g.carrier}</span>}
                    {g.tracking_code && <span>Tracking: {g.tracking_code}</span>}
                  </div>
                </div>
              ))}
              {trackedGifts.length > 0 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, giftPage - 1);
                      setGiftPage(next);
                      void handleTrackGifts(next);
                    }}
                    disabled={tracking || giftPage <= 0}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-500">
                    Page {giftPage + 1} of {giftTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(giftTotalPages - 1, giftPage + 1);
                      setGiftPage(next);
                      void handleTrackGifts(next);
                    }}
                    disabled={tracking || giftPage >= giftTotalPages - 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
