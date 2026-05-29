'use client';

import { Inbox } from 'lucide-react';

type EmptyStateProps = {
  message: string;
  hint?: string;
  className?: string;
};

export default function EmptyState({ message, hint, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
