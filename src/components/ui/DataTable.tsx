'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '@/src/components/ui/EmptyState';
import { usePageSectionEmbed } from '@/src/components/ui/PageSection';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  emptyHint?: string;
  onRowClick?: (item: T) => void;
  /** Strip outer card when inside PageSection (auto when parent has noPadding). */
  embedded?: boolean;
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, row) => (
        <tr key={row} className="animate-pulse">
          {Array.from({ length: cols }).map((__, col) => (
            <td key={col} className="px-4 py-3">
              <div className="h-4 max-w-[12rem] rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Hidden row so empty-state colspan inherits sensible column widths from header labels. */
function EmptyColumnSizer({ columns }: { columns: Column<unknown>[] }) {
  return (
    <tr aria-hidden className="pointer-events-none h-0 border-0">
      {columns.map((col) => (
        <td key={col.key} className="h-0 overflow-hidden border-0 p-0">
          <span className="invisible block whitespace-nowrap px-4 text-xs font-semibold uppercase tracking-wide">
            {col.label}
          </span>
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  page = 0,
  totalPages = 1,
  onPageChange,
  emptyMessage = 'Không có dữ liệu',
  emptyHint,
  onRowClick,
  embedded: embeddedProp,
}: DataTableProps<T>) {
  const safeTotal = Math.max(1, totalPages);
  const embedded = embeddedProp ?? usePageSectionEmbed();
  const isEmpty = !loading && data.length === 0;

  const shellClass = embedded
    ? 'min-w-0 bg-white'
    : 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm';

  return (
    <div className={shellClass}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton cols={columns.length} />
            ) : isEmpty ? (
              <>
                <EmptyColumnSizer columns={columns as Column<unknown>[]} />
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <EmptyState message={emptyMessage} hint={emptyHint} />
                  </td>
                </tr>
              </>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={(item as { id?: string }).id ?? idx}
                  className={`transition-colors hover:bg-blue-50/40 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => {
                    const nowrap =
                      col.className?.includes('whitespace-nowrap') ||
                      col.key === 'actions' ||
                      col.key.includes('action');
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 align-middle text-sm text-slate-700 ${nowrap ? 'whitespace-nowrap' : 'max-w-xs'} ${col.className || ''}`}
                      >
                        {col.render ? col.render(item, idx) : (item[col.key] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && !loading && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3">
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
      )}
    </div>
  );
}
