'use client';

import { useState } from 'react';
import { giftService } from '@/src/services/gift.service';
import { blobService } from '@/src/services/blob.service';
import PageHeader from '@/src/components/ui/PageHeader';
import { toast } from 'sonner';
import { Gift, Send, Upload, Package } from 'lucide-react';

export default function DonorGiftsPage() {
  const [tab, setTab] = useState<'send' | 'track'>('send');

  // Send gift form
  const [recipient, setRecipient] = useState('');
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

      await giftService.create({
        recipient: recipient.trim(),
        category: category.trim(),
        description: description.trim(),
        message: message.trim(),
        gift_image_blob_id: imageBlobId,
        gift_value: giftValue,
        carrier: carrier.trim(),
        tracking_code: trackingCode.trim(),
      });

      toast.success('Gift sent successfully! Transaction is being processed on-chain.');
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

  const handleTrackGifts = async () => {
    if (!trackChildId.trim()) {
      toast.error('Please enter a child ID');
      return;
    }
    setTracking(true);
    try {
      const res = await giftService.listByChild(trackChildId.trim());
      setTrackedGifts(res.data.data || []);
      if (!res.data.data?.length) {
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
            tab === 'send' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="h-4 w-4" /> Send Gift
        </button>
        <button
          onClick={() => setTab('track')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'track' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Personal message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message for the child..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gift value (VND)</label>
                <input
                  type="number"
                  min={0}
                  value={giftValue || ''}
                  onChange={(e) => setGiftValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tracking code</label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Shipment tracking"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gift photo</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 text-sm text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition">
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
              className="flex-1 max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={() => void handleTrackGifts()}
              disabled={tracking}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
                      g.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
