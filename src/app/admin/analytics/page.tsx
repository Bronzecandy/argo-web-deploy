"use client";
import React from "react";
import Script from "next/script";
import AdminLayout from "@/src/components/AdminLayout";


export default function AnalyticsPage(){
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

      <AdminLayout
        title="Analytics & Reports"
        headerRight={
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-800 transition"><i className="fa-regular fa-bell" /></button>
            <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"><i className="fa-solid fa-download mr-1" /> Export Report</button>
          </div>
        }
      >
        <div className="p-8 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Stakeholder Growth Index</h2>
              <span className="text-sm text-slate-500">Last 6 months</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-slate-500">Active Donors</p>
                    <h3 className="text-2xl font-bold text-slate-900">1,245</h3>
                  </div>
                  <div className="text-emerald-600 font-bold">+15.2%</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '85%'}} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-slate-500">Volunteers</p>
                    <h3 className="text-2xl font-bold text-slate-900">1,204</h3>
                  </div>
                  <div className="text-blue-600 font-bold">+8.4%</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '62%'}} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-slate-500">Children Supported</p>
                    <h3 className="text-2xl font-bold text-slate-900">8,450</h3>
                  </div>
                  <div className="text-orange-600 font-bold">+4.2%</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{width: '98%'}} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-slate-500">Partner Centers</p>
                    <h3 className="text-2xl font-bold text-slate-900">42</h3>
                  </div>
                  <div className="text-purple-600 font-bold">2 New</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{width: '100%'}} />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Monthly Stakeholder Acquisition</h3>
                <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 text-slate-600">
                  <option>Last 6 Months</option>
                  <option>This Year</option>
                </select>
              </div>
              <div className="h-48 flex items-end gap-2">
                <div className="w-full bg-blue-100 h-16 rounded-t-lg" />
                <div className="w-full bg-blue-200 h-24 rounded-t-lg" />
                <div className="w-full bg-blue-300 h-32 rounded-t-lg" />
                <div className="w-full bg-blue-600 h-40 rounded-t-lg" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">User Base Distribution</h3>
              <div className="flex items-center justify-center h-48 mb-6">
                <div className="relative w-40 h-40 rounded-full bg-gradient-to-r from-orange-200 to-blue-200 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Total Users</p>
                    <p className="text-2xl font-bold text-slate-800">10.6k</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> <span className="text-sm text-slate-600">Children (75%)</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" /> <span className="text-sm text-slate-600">Donors (14%)</span></div>
              </div>
            </div>
          </section>
        </div>
      </AdminLayout>
    </>
  );
}
