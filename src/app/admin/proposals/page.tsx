"use client";
import React from "react";
import Script from "next/script";
import AdminLayout from "@/src/components/AdminLayout";

export default function ProposalsPage(){
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

      <AdminLayout
        title="Treasury & Proposals"
        headerRight={
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-800 transition"><i className="fa-regular fa-bell" /></button>
            <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"><i className="fa-solid fa-link mr-1" /> Smart Contract Status: Connected</button>
          </div>
        }
      >
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm font-medium text-slate-500N">Total Treasury Balance</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">150,200 VND</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Active Proposals</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">4</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">2</h3>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Withdrawal Proposals</h2>
                <p className="text-sm text-slate-500">Approve funding requests from support centers.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Requesting Center</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Purpose</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">DeadLine</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">Hope Village Central<br/><span className="text-xs text-slate-500">Da Nang, VN</span></td>
                    <td className="px-6 py-4 font-bold text-slate-900">10,000 VND</td>
                    <td className="px-6 py-4 text-sm text-slate-600">School Supplies & Textbooks for Q1</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Pending Admin</span></td>
                    <td className="px-6 py-4 text-sm text-slate-500">2 Days left</td>
                    <td className="px-6 py-4 text-right space-x-2"><button className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">Details</button><button className="px-3 py-1.5 rounded-lg bg-blue-800 text-white">Sign & Approve</button></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">Blue Sky Education<br/><span className="text-xs text-slate-500">Hanoi, VN</span></td>
                    <td className="px-6 py-4 font-bold text-slate-900">2,500 VND</td>
                    <td className="px-6 py-4 text-sm text-slate-600">Emergency Roof Repair</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Pending Admin</span></td>
                    <td className="px-6 py-4 text-sm text-red-500">Today</td>
                    <td className="px-6 py-4 text-right space-x-2"><button className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">Details</button><button className="px-3 py-1.5 rounded-lg bg-blue-800 text-white">Sign & Approve</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </AdminLayout>
    </>
  );
}
