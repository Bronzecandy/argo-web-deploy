'use client';

import { createContext, useContext, type ReactNode } from 'react';

type PageSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Table/content flush to section edges; title keeps normal padding. DataTable auto-embeds. */
  noPadding?: boolean;
};

const PageSectionEmbedContext = createContext(false);

/** True when rendered inside `<PageSection noPadding>` — DataTable drops duplicate card chrome. */
export function usePageSectionEmbed() {
  return useContext(PageSectionEmbedContext);
}

/** White card section used across Admin / Leader pages. */
export default function PageSection({
  title,
  description,
  actions,
  children,
  className = '',
  noPadding = false,
}: PageSectionProps) {
  return (
    <PageSectionEmbedContext.Provider value={noPadding}>
      <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
        {(title || actions) && (
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className={noPadding ? 'min-w-0' : 'p-5'}>{children}</div>
      </section>
    </PageSectionEmbedContext.Provider>
  );
}
