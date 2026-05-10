'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { profileService } from '@/src/services/profile.service';
import { truncateAddress, toDDMMYYYY } from '@/src/lib/formatters';
import PageHeader from '@/src/components/ui/PageHeader';
import type { PersonalWalletProfile, UploadProfileRequest } from '@/src/types/api.types';
import { Wallet, Save } from 'lucide-react';

export default function VolunteerProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<PersonalWalletProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityCode, setIdentityCode] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const res = await profileService.getByWallet(user.address);
      setProfile(res.data);
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!user?.profileId) {
      toast.error('Không tìm thấy ID hồ sơ');
      return;
    }
    setSaving(true);
    try {
      const data: UploadProfileRequest = {
        first_name: firstName,
        last_name: lastName,
        gender: gender || '',
        date_of_birth: dob ? toDDMMYYYY(dob) : '',
        phone_number: phone || '',
        email: email || '',
        identity_code: identityCode || '',
      };
      await profileService.upload(user.profileId, data);
      toast.success('Đã cập nhật hồ sơ');
      void loadProfile();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ" description="Xem và chỉnh sửa thông tin cá nhân" />

      {/* Wallet overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Wallet className="h-5 w-5 text-blue-900" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-slate-500 font-mono">{truncateAddress(user?.address || '')}</p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Chỉnh sửa thông tin</h2>
        <div className="grid gap-4 max-w-2xl sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tên</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Họ</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Giới tính</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">Chọn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Ngày sinh</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Số định danh</label>
            <input
              type="text"
              value={identityCode}
              onChange={(e) => setIdentityCode(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}
