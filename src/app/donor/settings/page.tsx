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
    label: 'Ví & giao dịch',
    description: 'Xem lịch sử giao dịch',
    icon: History,
  },
  {
    href: '/donor/gifts',
    label: 'Quà tặng',
    description: 'Gửi và theo dõi quà',
    icon: Gift,
  },
  {
    href: '/donor/notifications',
    label: 'Thông báo',
    description: 'Cập nhật và cảnh báo',
    icon: Bell,
  },
  {
    href: '/donor/register',
    label: 'Đăng ký vai trò',
    description: 'Đăng ký nhà hảo tâm, tình nguyện viên hoặc trưởng vùng',
    icon: UserPlus,
  },
  {
    href: '/donor/child-upload',
    label: 'Yêu cầu tải hồ sơ trẻ',
    description: 'Đề xuất hồ sơ trẻ mới',
    icon: FileUp,
  },
  {
    href: '/donor/profile',
    label: 'Hồ sơ',
    description: 'Thông tin cá nhân và tài khoản',
    icon: User,
  },
];

export default function DonorSettingsHubPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Cài đặt"
        description="Ví, thông báo, đăng ký và hồ sơ — tương đương Cài đặt trên ứng dụng di động"
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
        Quyên góp và thanh toán quỹ vẫn cần phiên đăng nhập ví đã xác thực.
      </p>
    </div>
  );
}
