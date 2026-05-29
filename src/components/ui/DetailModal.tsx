'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { btnSecondary } from '@/src/lib/uiClasses';

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
};

export default function DetailModal({
  title,
  open,
  onClose,
  loading,
  error,
  children,
  wide,
  footer,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(90vh,900px)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 id="detail-modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
            </div>
          )}
          {error && !loading && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}
          {!loading && !error && children}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          {footer}
          <button type="button" onClick={onClose} className={btnSecondary}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
