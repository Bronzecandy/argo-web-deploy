'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { btnDanger, btnTableAction, btnTablePrimary } from '@/src/lib/uiClasses';

type Variant = 'default' | 'primary' | 'danger';

type TableIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export default function TableIconButton({
  variant = 'default',
  className = '',
  children,
  ...props
}: TableIconButtonProps) {
  const base =
    variant === 'primary' ? btnTablePrimary : variant === 'danger' ? btnDanger : btnTableAction;
  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
