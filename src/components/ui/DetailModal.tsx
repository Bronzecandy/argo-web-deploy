'use client';

import { X } from 'lucide-react';

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  wide?: boolean;
};

export default function DetailModal({
  title,
  open,
  onClose,
  loading,
  error,
  children,
  wide,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading && <p className="text-sm text-slate-500">Đang tải…</p>}
        {error && !loading && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {!loading && !error && children}
      </div>
    </div>
  );
}
