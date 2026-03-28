"use client";
import React from "react";

type Props = {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

export default function AdminLayout({ title, headerRight, children }: Props) {
  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
          <div>
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xl">
                <i className="fa-solid fa-hands-holding-child text-orange-500" />
                <span>RaiseChild</span>
              </div>
            </div>

            <nav className="p-4 space-y-1">
              <a href="/admin" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-900 rounded-xl font-medium border border-blue-100">
                <i className="fa-solid fa-table-cells-large" /> Dashboard
              </a>
              <a href="/admin/centers" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition">
                <i className="fa-solid fa-building" /> Support Centers
              </a>
              <a href="/admin/child_profiles" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition">
                <i className="fa-solid fa-child" /> Child Profiles
              </a>
              <a href="/admin/proposals" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition">
                <i className="fa-solid fa-wallet" /> Treasury & Proposals
              </a>
              <a href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition">
                <i className="fa-solid fa-chart-pie" /> Analytics
              </a>
              <a href="/admin/account" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition">
                <i className="fa-solid fa-user-gear" /> Account Management
              </a>
            </nav>
          </div>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <img src="https://ui-avatars.com/api/?name=Admin+User&background=eff6ff&color=2563eb" className="w-10 h-10 rounded-full border border-blue-100" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Super Admin</p>
                <p className="text-xs text-slate-500">admin@raisechild.org</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-y-auto">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            <div className="flex items-center gap-4">{headerRight}</div>
          </header>

          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}
