'use client';



import Link from 'next/link';

import { useState } from 'react';

import PageHeader from '@/src/components/ui/PageHeader';

import { useAppDispatch, useAppSelector } from '@/src/store/hooks';

import { logoutUser } from '@/src/store/authSlice';

import { ROLES } from '@/src/lib/constants';

import { userHasAnyRole } from '@/src/services/auth.service';

import {

  Bell,

  LogOut,

  User,

  Wallet,

  ClipboardCheck,

  ChevronRight,

} from 'lucide-react';



const MORE_LINKS = [

  {

    href: '/volunteer/task-proofs',

    label: 'Task proof history',

    description: 'Submitted proofs and manual entry',

    icon: ClipboardCheck,

  },

  {

    href: '/volunteer/notifications',

    label: 'Notifications',

    description: 'In-app updates',

    icon: Bell,

  },

  {

    href: '/volunteer/profile',

    label: 'Profile',

    description: 'Your volunteer profile',

    icon: User,

  },

];



export default function VolunteerSettingsPage() {

  const dispatch = useAppDispatch();

  const { user } = useAppSelector((s) => s.auth);

  const [notifications, setNotifications] = useState(true);

  const [emailUpdates, setEmailUpdates] = useState(true);



  const showDonorLink = user ? userHasAnyRole(user, [ROLES.DONOR, ROLES.USER]) : false;



  return (

    <div className="mx-auto max-w-xl space-y-6">

      <PageHeader

        title="Volunteer settings"

        description="Shortcuts aligned with mobile — proofs and notifications live here"

      />



      <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">

        <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">More</h2>

        <ul className="divide-y divide-slate-100">

          {MORE_LINKS.map((item) => {

            const Icon = item.icon;

            return (

              <li key={item.href}>

                <Link href={item.href} className="flex items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-slate-50/90">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-800">

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



      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">

        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Account</h2>

        <ul className="divide-y divide-slate-100">

          <li>

            <Link

              href="/volunteer/profile"

              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50/90"

            >

              <User className="h-4 w-4 text-blue-800" /> Edit profile

            </Link>

          </li>

          {showDonorLink && (

            <li>

              <Link href="/donor" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50/90">

                <Wallet className="h-4 w-4 text-blue-800" /> Donor / member area

              </Link>

            </li>

          )}

        </ul>

      </div>



      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">

        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Notifications</h2>

        <div className="flex items-center justify-between px-4 py-3">

          <div className="flex items-center gap-2 text-sm text-slate-800">

            <Bell className="h-4 w-4 text-slate-500" />

            Task alerts (local)

          </div>

          <button

            type="button"

            role="switch"

            aria-checked={notifications}

            onClick={() => setNotifications((v) => !v)}

            className={`relative h-6 w-11 rounded-full transition ${notifications ? 'bg-blue-800' : 'bg-slate-200'}`}

          >

            <span

              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${

                notifications ? 'translate-x-5' : ''

              }`}

            />

          </button>

        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">

          <span className="text-sm text-slate-800">Email summaries (local)</span>

          <button

            type="button"

            role="switch"

            aria-checked={emailUpdates}

            onClick={() => setEmailUpdates((v) => !v)}

            className={`relative h-6 w-11 rounded-full transition ${emailUpdates ? 'bg-blue-800' : 'bg-slate-200'}`}

          >

            <span

              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${

                emailUpdates ? 'translate-x-5' : ''

              }`}

            />

          </button>

        </div>

        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">

          Toggles are UI-only until a notification-preferences API exists.

        </p>

      </div>



      <button

        type="button"

        onClick={() => dispatch(logoutUser())}

        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-red-50/80 py-3 text-sm font-medium text-red-800 transition hover:bg-red-50"

      >

        <LogOut className="h-4 w-4" /> Log out

      </button>

    </div>

  );

}

