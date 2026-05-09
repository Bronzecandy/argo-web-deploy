'use client';

import Link from 'next/link';
import PageHeader from '@/src/components/ui/PageHeader';
import {
  History,
  Gift,
  Bell,
  UserPlus,
  FileUp,
  User,
  ChevronRight,
  Wallet,
} from 'lucide-react';

const LINKS = [
  {
    href: '/donor/transactions',
    label: 'Wallet & transactions',
    description: 'View your transaction history',
    icon: History,
  },
  {
    href: '/donor/gifts',
    label: 'Gifts',
    description: 'Send and track gifts',
    icon: Gift,
  },
  {
    href: '/donor/notifications',
    label: 'Notifications',
    description: 'Updates and alerts',
    icon: Bell,
  },
  {
    href: '/donor/register',
    label: 'Register role',
    description: 'Apply for donor, volunteer, or leader roles',
    icon: UserPlus,
  },
  {
    href: '/donor/child-upload',
    label: 'Request child upload',
    description: 'Propose a new child profile',
    icon: FileUp,
  },
  {
    href: '/donor/profile',
    label: 'Profile',
    description: 'Personal information and account',
    icon: User,
  },
];

export default function DonorSettingsHubPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Settings"
        description="Wallet, notifications, registration, and profile — same scope as mobile Settings"
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <ul className="divide-y divide-slate-100">
          {LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition hover:bg-slate-50/90"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Wallet className="h-3.5 w-3.5" />
        Donations and pool payments still require an authenticated wallet session.
      </p>
    </div>
  );
}
