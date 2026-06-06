'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type ListPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function ListPagination({ page, totalPages, onPageChange, className = '' }: ListPaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  if (safeTotal <= 1 && page <= 0) return null;

  return (
    <div
      className={`flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5 ${className}`}
    >
      <span className="text-xs text-slate-600">
        Trang <span className="font-medium text-slate-800">{page + 1}</span> / {safeTotal}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0}
          aria-label="Trang trước"
          className="rounded-lg border border-transparent p-1.5 text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotal - 1}
          aria-label="Trang sau"
          className="rounded-lg border border-transparent p-1.5 text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
