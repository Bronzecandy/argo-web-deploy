"use client";
import React from "react";
import Script from "next/script";import AdminLayout from "@/src/components/AdminLayout";

export default function AccountPage(){
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

      <AdminLayout
        title="User Management"
        headerRight={
          <div className="flex items-center gap-4">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search users..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
            </div>
            <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"><i className="fa-solid fa-user-plus mr-1" /> Add User</button>
          </div>
        }
      >
        <div className="p-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><img src="https://ui-avatars.com/api/?name=Nguyen+Van+A&background=dbeafe&color=1e40af" className="w-10 h-10 rounded-full" /><div><p className="font-semibold text-slate-900">Nguyen Van A</p><p className="text-xs text-slate-500">nguyenvana@gmail.com</p></div></div></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"><i className="fa-solid fa-hand-holding-heart text-[10px]" /> Volunteer</span></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active</span></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><i className="fa-solid fa-shield-check" /> Verified</div></td>
                  <td className="px-6 py-4 text-sm text-slate-500">Oct 24, 2025</td>
                  <td className="px-6 py-4 text-right"><button className="text-slate-400 hover:text-blue-600 p-2"><i className="fa-solid fa-pen-to-square" /></button><button className="text-slate-400 hover:text-red-600 p-2"><i className="fa-solid fa-trash" /></button></td>
                </tr>

                <tr className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><img src="https://ui-avatars.com/api/?name=Sarah+Smith&background=fce7f3&color=9d174d" className="w-10 h-10 rounded-full" /><div><p className="font-semibold text-slate-900">Sarah Smith</p><p className="text-xs text-slate-500">sarah.s@outlook.com</p></div></div></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"><i className="fa-solid fa-hand-holding-dollar text-[10px]" /> Donor</span></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active</span></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-1 text-slate-400 text-sm"><i className="fa-regular fa-circle" /> Unverified</div></td>
                  <td className="px-6 py-4 text-sm text-slate-500">Dec 12, 2025</td>
                  <td className="px-6 py-4 text-right"><button className="text-slate-400 hover:text-blue-600 p-2"><i className="fa-solid fa-pen-to-square" /></button><button className="text-slate-400 hover:text-red-600 p-2"><i className="fa-solid fa-trash" /></button></td>
                </tr>

                <tr className="hover:bg-slate-50 transition bg-red-50/30">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><img src="https://ui-avatars.com/api/?name=Bad+Actor&background=fee2e2&color=991b1b" className="w-10 h-10 rounded-full grayscale" /><div><p className="font-semibold text-slate-900">Tran Van C</p><p className="text-xs text-slate-500">tranvanc_99@gmail.com</p></div></div></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"><i className="fa-solid fa-hand-holding-heart text-[10px]" /> Volunteer</span></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"><i className="fa-solid fa-ban text-[10px]" /> Banned</span></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-1 text-red-600 text-sm font-medium"><i className="fa-solid fa-triangle-exclamation" /> Flagged</div></td>
                  <td className="px-6 py-4 text-sm text-slate-500">Jan 05, 2026</td>
                  <td className="px-6 py-4 text-right"><button className="text-slate-400 hover:text-blue-600 p-2"><i className="fa-solid fa-pen-to-square" /></button><button className="text-slate-400 hover:text-emerald-600 p-2"><i className="fa-solid fa-rotate-left" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
