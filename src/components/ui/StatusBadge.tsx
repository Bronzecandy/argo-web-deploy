'use client';

import { getStatusColor } from '@/src/lib/formatters';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(status)} ${className || ''}`}
    >
      {status?.replace(/_/g, ' ') || '-'}
    </span>
  );
}
