'use client';

import type { ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';

type Variant = 'info' | 'warning' | 'error';

type ContextBannerProps = {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  className?: string;
};

const styles: Record<Variant, { box: string; icon: string; Icon: typeof Info }> = {
  info: {
    box: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: 'text-blue-700',
    Icon: Info,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'text-amber-800',
    Icon: AlertCircle,
  },
  error: {
    box: 'border-red-200 bg-red-50 text-red-900',
    icon: 'text-red-700',
    Icon: AlertCircle,
  },
};

export default function ContextBanner({
  variant = 'info',
  title,
  children,
  className = '',
}: ContextBannerProps) {
  const { box, icon, Icon } = styles[variant];
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${box} ${className}`} role="status">
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden />
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          <div className={title ? 'mt-1 text-[13px] leading-relaxed opacity-90' : ''}>{children}</div>
        </div>
      </div>
    </div>
  );
}
