'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { btnDanger, btnPrimary, btnSecondary } from '@/src/lib/uiClasses';

type FormModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Primary submit label */
  submitLabel?: string;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitVariant?: 'primary' | 'danger';
  /** Hide default footer when using custom footer only */
  hideFooter?: boolean;
  footer?: ReactNode;
  wide?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
};

const maxW = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
};

export default function FormModal({
  open,
  onClose,
  title,
  children,
  submitLabel,
  onSubmit,
  submitDisabled,
  submitVariant = 'primary',
  hideFooter = false,
  footer,
  wide,
  maxWidth = 'md',
}: FormModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = wide ? 'max-w-3xl' : maxW[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 py-8 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(90vh,900px)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 id="form-modal-title" className="text-lg font-semibold text-slate-900">
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

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {!hideFooter && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            {footer}
            <button type="button" onClick={onClose} className={btnSecondary}>
              Hủy
            </button>
            {submitLabel && onSubmit && (
              <button
                type="button"
                disabled={submitDisabled}
                onClick={onSubmit}
                className={submitVariant === 'danger' ? btnDanger : btnPrimary}
              >
                {submitLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
