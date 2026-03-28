"use client";
import React from "react";
import Script from "next/script";
import AdminLayout from "@/src/components/AdminLayout";

export default function ChildProfilesPage() {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

      <AdminLayout
        title="Child Profiles"
        headerRight={
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-800 transition"><i className="fa-regular fa-bell" /></button>
            <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"><i className="fa-solid fa-plus mr-1" /> Add New Child</button>
          </div>
        }
      >
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex gap-4">
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Search children..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
              </div>
              <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option>All Statuses</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">Showing <span className="font-bold text-slate-800">24</span> profiles</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Child & Photo</th>
                    <th className="px-6 py-4">Age Details</th>
                    <th className="px-6 py-4">Parents / Guardian</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <img src="https://ui-avatars.com/api/?name=Linh+Dan&background=ffedd5&color=c2410c&size=128" className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-100 shadow-sm" />
                        <div>
                          <p className="font-bold text-slate-900 text-base">Nguyen Linh Dan</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">ID: #CH-8821</p>
                          <div className="mt-2 flex gap-1"><span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-1 rounded">Hanoi</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">
                        <p><span className="text-slate-500 w-12 inline-block">DOB:</span> 12 May 2018</p>
                        <p className="mt-1 font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md inline-block">7 Years, 10 Months</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-2">
                        <div><p className="text-xs text-slate-400 uppercase font-bold">Mother</p><p className="text-slate-800 font-medium">Nguyen Thi Hoa</p></div>
                        <div><p className="text-xs text-slate-400 uppercase font-bold">Father</p><p className="text-slate-800 font-medium">Tran Van Hung</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm text-blue-700 hover:underline cursor-pointer"><i className="fa-solid fa-file-invoice text-slate-400" /> Birth_Certificate.pdf</li>
                        <li className="flex items-center gap-2 text-sm text-blue-700 hover:underline cursor-pointer"><i className="fa-solid fa-file-contract text-slate-400" /> Guardian_Consent.pdf</li>
                        <li className="flex items-center gap-2 text-sm text-blue-700 hover:underline cursor-pointer"><i className="fa-solid fa-image text-slate-400" /> House_Photo_01.jpg</li>
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Verified</span></td>
                    <td className="px-6 py-4 text-right"><button className="text-slate-400 hover:text-blue-800 p-2"><i className="fa-solid fa-pen-to-square" /></button></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <img src="https://ui-avatars.com/api/?name=Van+Binh&background=e0e7ff&color=4338ca&size=128" className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-100 shadow-sm" />
                        <div>
                          <p className="font-bold text-slate-900 text-base">Tran Van Binh</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">ID: #CH-8825</p>
                          <div className="mt-2 flex gap-1"><span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-1 rounded">Lao Cai</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">
                        <p><span className="text-slate-500 w-12 inline-block">DOB:</span> 04 Jan 2015</p>
                        <p className="mt-1 font-medium bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md inline-block">11 Years, 2 Months</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-2">
                        <div><p className="text-xs text-slate-400 uppercase font-bold">Guardian (Aunt)</p><p className="text-slate-800 font-medium">Tran Thi Mai</p></div>
                        <div><p className="text-xs text-slate-400 uppercase font-bold">Father</p><p className="text-slate-400 italic">Deceased</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 text-sm mb-2"><i className="fa-solid fa-triangle-exclamation" /> Missing Documents</div>
                      <ul className="space-y-1 opacity-75"><li className="flex items-center gap-2 text-sm text-slate-600"><i className="fa-solid fa-file text-slate-300" /> Family_Book.pdf</li></ul>
                    </td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Action Req</span></td>
                    <td className="px-6 py-4 text-right"><button className="text-slate-400 hover:text-blue-800 transition p-2"><i className="fa-solid fa-pen-to-square" /></button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-500">Showing 1 to 2 of 24 entries</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-sm disabled:opacity-50">Previous</button>
                <button className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-sm font-medium">1</button>
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-sm">2</button>
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-sm">Next</button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
