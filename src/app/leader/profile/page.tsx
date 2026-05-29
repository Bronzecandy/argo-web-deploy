'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import { formatDate, truncateAddress, toDDMMYYYY } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { profileService } from '@/src/services/profile.service';
import type { PersonalProfile, UploadProfileRequest } from '@/src/types/api.types';
import PageSection from '@/src/components/ui/PageSection';
import { btnPrimary, btnSecondary, inputClass } from '@/src/lib/uiClasses';

const emptyForm: UploadProfileRequest = {
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  phone_number: '',
  email: '',
  identity_code: '',
};

export default function LeaderProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<UploadProfileRequest>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const res = await profileService.getByWallet(user.address);
      const data = res.data;
      setProfile({
        id: data.wallet_address ?? user.address,
        first_name: data.first_name,
        last_name: data.last_name,
        gender: '',
        date_of_birth: '',
        phone_number: '',
        email: '',
        identity_code: '',
      });
      setForm({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        gender: '',
        date_of_birth: '',
        phone_number: '',
        email: '',
        identity_code: '',
      });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setProfile(null);
        setForm(emptyForm);
      } else {
        console.error(e);
        toast.error('Không tải được hồ sơ');
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateField = (key: keyof UploadProfileRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, date_of_birth: toDDMMYYYY(form.date_of_birth) };
      if (profile) {
        const res = await profileService.upload(profile.id, payload);
        setProfile(res.data);
        toast.success('Đã cập nhật hồ sơ');
      } else if (user?.profileId) {
        const res = await profileService.upload(user.profileId, payload);
        setProfile(res.data);
        toast.success('Đã tạo hồ sơ');
      } else {
        toast.error('Không có mã hồ sơ (profile ID)');
        return;
      }
      setEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error(profile ? 'Không cập nhật được hồ sơ' : 'Không tải lên được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Hồ sơ" description="Hồ sơ trưởng vùng" />
        <PageSection className="flex items-center justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
        </PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hồ sơ"
        description={
          user?.address ? `Quản lý hồ sơ cá nhân · ${truncateAddress(user.address)}` : 'Quản lý hồ sơ cá nhân'
        }
      />

      {profile && !editMode ? (
        <PageSection>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-slate-900">Thông tin cá nhân</h2>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className={btnSecondary}
            >
              Chỉnh sửa
            </button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">ID</dt>
              <dd className="mt-1 font-mono text-sm text-slate-900">{profile.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tên</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.first_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Họ</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.last_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Giới tính</dt>
              <dd className="mt-1 text-sm text-slate-900 capitalize">{profile.gender}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày sinh</dt>
              <dd className="mt-1 text-sm text-slate-900">{formatDate(profile.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Điện thoại</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.phone_number}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Số CMND/CCCD</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.identity_code}</dd>
            </div>
          </dl>
        </PageSection>
      ) : (
        <PageSection>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-slate-900">{profile ? 'Sửa hồ sơ' : 'Tạo hồ sơ'}</h2>
            {profile && (
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  void loadProfile();
                }}
                className={btnSecondary}
              >
                Hủy
              </button>
            )}
          </div>
          <form onSubmit={handleSave} className="max-w-xl space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tên</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Họ</label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Giới tính</label>
              <input
                required
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ngày sinh</label>
              <input
                required
                type="date"
                value={form.date_of_birth?.slice(0, 10) || ''}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Số điện thoại</label>
              <input
                required
                value={form.phone_number}
                onChange={(e) => updateField('phone_number', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Số CMND/CCCD</label>
              <input
                required
                value={form.identity_code}
                onChange={(e) => updateField('identity_code', e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className={btnPrimary}
            >
              {saving ? 'Đang lưu…' : profile ? 'Lưu thay đổi' : 'Tải lên hồ sơ'}
            </button>
          </form>
        </PageSection>
      )}
    </div>
  );
}
