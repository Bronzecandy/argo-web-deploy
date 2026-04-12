'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/src/components/ui/PageHeader';
import { formatDate, truncateAddress } from '@/src/lib/formatters';
import { toast } from 'sonner';
import { useAppSelector } from '@/src/store/hooks';
import { profileService } from '@/src/services/profile.service';
import type { PersonalProfile, UploadProfileRequest } from '@/src/types/api.types';

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
        toast.error('Failed to load profile');
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
      if (profile) {
        const res = await profileService.upload(profile.id, form);
        setProfile(res.data);
        toast.success('Profile updated');
      } else if (user?.profileId) {
        const res = await profileService.upload(user.profileId, form);
        setProfile(res.data);
        toast.success('Profile created');
      } else {
        toast.error('Profile ID not available');
        return;
      }
      setEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error(profile ? 'Failed to update profile' : 'Failed to upload profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Profile" description="Your leader profile" />
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description={
          user?.address ? `Manage your personal profile · ${truncateAddress(user.address)}` : 'Manage your personal profile'
        }
      />

      {profile && !editMode ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Edit
            </button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">ID</dt>
              <dd className="mt-1 font-mono text-sm text-slate-900">{profile.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">First name</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.first_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Last name</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.last_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Gender</dt>
              <dd className="mt-1 text-sm text-slate-900 capitalize">{profile.gender}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Date of birth</dt>
              <dd className="mt-1 text-sm text-slate-900">{formatDate(profile.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.phone_number}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Identity code</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.identity_code}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-slate-900">{profile ? 'Edit profile' : 'Create profile'}</h2>
            {profile && (
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  void loadProfile();
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
          <form onSubmit={handleSave} className="max-w-xl space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">First name</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Last name</label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
              <input
                required
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date of birth</label>
              <input
                required
                type="date"
                value={form.date_of_birth?.slice(0, 10) || ''}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Phone number</label>
              <input
                required
                value={form.phone_number}
                onChange={(e) => updateField('phone_number', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Identity code</label>
              <input
                required
                value={form.identity_code}
                onChange={(e) => updateField('identity_code', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : profile ? 'Save changes' : 'Upload profile'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
