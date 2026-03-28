"use client";
import React from "react";
import Script from "next/script";
import AdminLayout from "@/src/components/AdminLayout";

export default function AdminDashboard() {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

      <AdminLayout
        title="System Overview"
        headerRight={
          <>
            <button className="p-2 text-slate-400 hover:text-blue-800 transition"><i className="fa-regular fa-bell" /></button>
            <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"><i className="fa-solid fa-link mr-1" /> Smart Contract Status: Connected</button>
          </>
        }
      >
        <div className="p-8 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Platform Analytics</h2>
              <span className="text-sm text-slate-500">Updated: Just now</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total Donation Pool</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">1,240,500 VND</h3>
                <div className="mt-4 text-sm text-green-600"><i className="fa-solid fa-arrow-trend-up mr-1" /> +12.5% this month</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Children Supported</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">8,450</h3>
                <div className="mt-4 text-sm text-slate-500">Active across 12 provinces</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">18</h3>
                <div className="mt-4 text-sm text-orange-600">Needs immediate attention</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Active Volunteers</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">1,204</h3>
                <div className="mt-4 text-sm text-green-600">+12 this week</div>
              </div>
            </div>
          </section>

          <section>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Child Profile Verification Queue</h2>
                <button className="text-blue-800 text-sm font-medium hover:text-blue-900">View All</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-6 py-4">Child Info</th>
                      <th className="px-6 py-4">Submitted By</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">AI Confidence</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name=Linh+Dan&background=ffedd5&color=c2410c" className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-semibold text-slate-900">Nguyen Linh Dan</p>
                          <p className="text-xs text-slate-500">ID: #CH-8821</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">Volunteer A (Rep: 98%)</td>
                      <td className="px-6 py-4 text-sm text-slate-600">Ha Giang, VN</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"> <i className="fa-solid fa-robot" /> 92% Match</span></td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><i className="fa-solid fa-xmark" /></button>
                        <button className="p-2 rounded-lg text-blue-800 hover:bg-blue-50 border border-blue-200 font-medium text-sm">Verify Profile</button>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name=Van+Binh&background=e0e7ff&color=4338ca" className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-semibold text-slate-900">Tran Van Binh</p>
                          <p className="text-xs text-slate-500">ID: #CH-8822</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">Volunteer B (Rep: 75%)</td>
                      <td className="px-6 py-4 text-sm text-slate-600">Lao Cai, VN</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"> <i className="fa-solid fa-robot" /> 45% Flagged</span></td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><i className="fa-solid fa-xmark" /></button>
                        <button className="p-2 rounded-lg text-blue-800 hover:bg-blue-50 border border-blue-200 font-medium text-sm">Investigate</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </AdminLayout>
    </>
  );
}
