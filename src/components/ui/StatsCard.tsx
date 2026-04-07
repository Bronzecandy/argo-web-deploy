'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export default function StatsCard({ label, value, icon: Icon, trend, trendUp, className }: StatsCardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className || ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}
