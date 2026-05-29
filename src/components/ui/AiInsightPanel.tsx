'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { collectAiFields, isAiVerdictNegative } from '@/src/lib/aiFields';

type AiInsightPanelProps = {
  record: object | null | undefined;
  className?: string;
  /** Shown when there are no AI fields (default: hide section). */
  emptyFallback?: ReactNode;
};

export default function AiInsightPanel({ record, className = '', emptyFallback = null }: AiInsightPanelProps) {
  const fields = collectAiFields(record);
  if (!fields.length) return <>{emptyFallback}</>;

  return (
    <div
      className={`rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 to-indigo-50/50 p-4 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-violet-950">Đánh giá AI</h4>
          <p className="text-[11px] text-violet-700/80">Tham khảo khi duyệt — không thay thế quyết định của bạn</p>
        </div>
      </div>
      <dl className="space-y-3">
        {fields.map(({ key, label, value }) => {
          const negative =
            (key.toLowerCase().includes('evaluation') || key === 'aievaluation') && isAiVerdictNegative(value);
          return (
            <div key={key}>
              <dt className="text-xs font-medium text-violet-800/90">{label}</dt>
              <dd
                className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                  negative ? 'font-medium text-amber-900' : 'text-slate-800'
                }`}
              >
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
