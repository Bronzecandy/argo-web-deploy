'use client';

import type { ReactNode } from 'react';
import { tabSegmentActive, tabSegmentContainer, tabSegmentInactive } from '@/src/lib/uiClasses';

export type TabBarItem<T extends string> = {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
};

type TabBarProps<T extends string> = {
  items: TabBarItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  fullWidth?: boolean;
};

export default function TabBar<T extends string>({
  items,
  value,
  onChange,
  className = '',
  fullWidth = true,
}: TabBarProps<T>) {
  return (
    <div className={`${tabSegmentContainer} ${fullWidth ? 'w-full' : ''} ${className}`} role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:flex-none ${
              active ? tabSegmentActive : tabSegmentInactive
            }`}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
