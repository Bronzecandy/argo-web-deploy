'use client';

import type { ReactNode } from 'react';

type DetailFieldProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

export default function DetailField({ label, value, className = '' }: DetailFieldProps) {
  return (
    <div className={`border-b border-slate-100 py-2.5 last:border-0 ${className}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
