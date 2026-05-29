'use client';

import type { ReactNode } from 'react';

type FilterToolbarProps = {
  children: ReactNode;
  className?: string;
};

/** Horizontal filter row (search, selects, actions) above tables. */
export default function FilterToolbar({ children, className = '' }: FilterToolbarProps) {
  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end ${className}`}
    >
      {children}
    </div>
  );
}
