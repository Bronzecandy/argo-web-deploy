'use client';

import { Sparkles } from 'lucide-react';
import { getPrimaryAiEvaluation, isAiVerdictNegative } from '@/src/lib/aiFields';

type AiEvaluationBadgeProps = {
  record: object | null | undefined;
  className?: string;
};

/** Compact table cell for AI verdict when present. */
export default function AiEvaluationBadge({ record, className = '' }: AiEvaluationBadgeProps) {
  const value = getPrimaryAiEvaluation(record);
  if (!value) return <span className={`text-slate-400 ${className}`}>—</span>;

  const negative = isAiVerdictNegative(value);
  return (
    <span
      className={`inline-flex max-w-[10rem] items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${className} ${
        negative
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-violet-200 bg-violet-50 text-violet-900'
      }`}
      title={value}
    >
      <Sparkles className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate capitalize">{value}</span>
    </span>
  );
}
