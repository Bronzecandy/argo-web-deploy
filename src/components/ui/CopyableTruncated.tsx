'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { truncateAddress } from '@/src/lib/formatters';

type CopyableTruncatedProps = {
  /** Full string to copy (e.g. address, id). */
  value: string | null | undefined;
  /** Same as `truncateAddress` middle chars count. */
  chars?: number;
  className?: string;
  mono?: boolean;
};

export default function CopyableTruncated({
  value,
  chars = 6,
  className = '',
  mono = true,
}: CopyableTruncatedProps) {
  const raw = value?.trim() ?? '';
  const [copied, setCopied] = useState(false);

  if (!raw) return <span className="text-slate-400">—</span>;

  const display = truncateAddress(raw, chars);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      toast.success('Đã sao chép');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không sao chép được');
    }
  }

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 ${mono ? 'font-mono text-xs' : 'text-sm'} ${className}`.trim()}
    >
      <span className="min-w-0 truncate" title={raw}>
        {display}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Sao chép"
        title="Sao chép"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
