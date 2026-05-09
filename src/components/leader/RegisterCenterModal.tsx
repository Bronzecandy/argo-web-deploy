'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { regionService } from '@/src/services/region.service';
import { centerService } from '@/src/services/center.service';
import type { CreateCenterRequest } from '@/src/types/api.types';

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-800/20 transition focus:border-blue-800 focus:ring-2';

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export interface RegisterCenterModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, region is fixed (read-only) — e.g. leader’s assigned region. */
  lockedRegion?: string;
  onSuccess?: () => void;
}

export default function RegisterCenterModal({
  open,
  onClose,
  lockedRegion,
  onSuccess,
}: RegisterCenterModalProps) {
  const [regions, setRegions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    region: '',
    address: '',
    phone_number: '',
    image_blob_id: '',
  });

  useEffect(() => {
    if (!open) return;
    if (lockedRegion?.trim()) {
      setForm((f) => ({ ...f, region: lockedRegion.trim() }));
      return;
    }
    regionService.listRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, [open, lockedRegion]);

  useEffect(() => {
    if (!open) {
      setForm({ region: '', address: '', phone_number: '', image_blob_id: '' });
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const regionVal = (lockedRegion?.trim() || form.region.trim());
    if (!form.address.trim() || !form.image_blob_id.trim() || !form.phone_number.trim() || !regionVal) {
      toast.error('All fields are required');
      return;
    }
    const data: CreateCenterRequest = {
      address: form.address.trim(),
      image_blob_id: form.image_blob_id.trim(),
      phone_number: form.phone_number.trim(),
      region: regionVal,
    };
    setSubmitting(true);
    try {
      await centerService.create(data);
      toast.success('Center registration submitted');
      setForm({ region: lockedRegion?.trim() || '', address: '', phone_number: '', image_blob_id: '' });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  const regionReadOnly = Boolean(lockedRegion?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Register center</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Region</label>
            {regionReadOnly ? (
              <input
                className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-700`}
                value={lockedRegion!.trim()}
                readOnly
                tabIndex={-1}
              />
            ) : (
              <select
                className={inputClass}
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                required
              >
                <option value="">Select region…</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
            <input
              className={inputClass}
              value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
              required
            />
          </div>
          <FileUploadInput
            label="Center image"
            value={form.image_blob_id}
            onChange={(val) => setForm((f) => ({ ...f, image_blob_id: val }))}
            accept="image/*"
            placeholder="Upload center image or paste blob ID"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Register center'}
          </button>
        </form>
      </div>
    </div>
  );
}
