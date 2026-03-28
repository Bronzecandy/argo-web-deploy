"use client";
import React from "react";
import Script from "next/script";
import AdminLayout from "@/src/components/AdminLayout";

export default function CentersPage() {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

      <AdminLayout
        title="Support Center Management"
        headerRight={
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-800 transition"><i className="fa-regular fa-bell" /></button>
            <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"><i className="fa-solid fa-link mr-1" /> Smart Contract Status: Connected</button>
          </div>
        }
      >
        <div className="p-8 space-y-8">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Center Proposals</h2>
                <p className="text-sm text-slate-500">Review requests to open new support centers.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-slate-100 rounded">Filter</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Center Name</th>
                    <th className="px-6 py-4">Proposer</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Required Staff</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">Sunshine Highlands Center</td>
                    <td className="px-6 py-4 text-sm text-slate-600">Sarah Mitchell</td>
                    <td className="px-6 py-4 text-sm text-slate-600">Ha Giang, VN</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">12 Staff</span></td>
                    <td className="px-6 py-4 text-sm text-slate-500">Community center focused on primary education support...</td>
                    <td className="px-6 py-4 text-right space-x-2"><button className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">Details</button><button className="px-3 py-1.5 rounded-lg bg-blue-800 text-white">Approve</button></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">River Delta Care Home</td>
                    <td className="px-6 py-4 text-sm text-slate-600">Tuan Pham</td>
                    <td className="px-6 py-4 text-sm text-slate-600">Can Tho, VN</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">8 Staff</span></td>
                    <td className="px-6 py-4 text-sm text-slate-500">Shelter for homeless youth in the delta region...</td>
                    <td className="px-6 py-4 text-right space-x-2"><button className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">Details</button><button className="px-3 py-1.5 rounded-lg bg-blue-800 text-white">Approve</button></td>
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
