'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { profileService } from '@/src/services/profile.service';
import PageHeader from '@/src/components/ui/PageHeader';
import type { PersonalWalletProfile, UploadProfileRequest } from '@/src/types/api.types';
import { toast } from 'sonner';
import { User, Wallet, Save } from 'lucide-react';
import { formatVND, formatDateTime, toDDMMYYYY } from '@/src/lib/formatters';

export default function DonorProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<PersonalWalletProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<UploadProfileRequest>({
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    phone_number: '',
    email: '',
    identity_code: '',
  });

  const loadProfile = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const res = await profileService.getByWallet(user.address);
      setProfile(res.data);
      setForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        gender: '',
        date_of_birth: '',
        phone_number: '',
        email: '',
        identity_code: '',
      });
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
      toast.error('Profile ID not available');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, date_of_birth: toDDMMYYYY(form.date_of_birth) };
      await profileService.upload(user.profileId, payload);
      toast.success('Profile updated successfully');
      setEditing(false);
      void loadProfile();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="View and manage your donor profile"
        actions={
          !editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              Edit Profile
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Wallet overview card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Wallet className="h-5 w-5 text-blue-800" />
            </div>
            <h3 className="font-semibold text-slate-900">Wallet</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500">Address</p>
              <p className="font-mono text-xs text-slate-700 break-all">{user?.address || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Total Donated</p>
              <p className="text-xl font-bold text-blue-900">{formatVND(profile?.total_donation || 0)}</p>
            </div>
            <div>
              <p className="text-slate-500">Total Transactions</p>
              <p className="font-semibold text-slate-900">{profile?.record_amount || 0}</p>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <User className="h-5 w-5 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Personal Information</h3>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Date of birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
                  <input
                    type="tel"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Identity code</label>
                  <input
                    type="text"
                    value={form.identity_code}
                    onChange={(e) => setForm({ ...form, identity_code: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{profile?.first_name} {profile?.last_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Wallet</p>
                <p className="font-mono text-xs text-slate-700">{profile?.wallet_address || user?.address || '-'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions from profile */}
      {profile?.transaction_records && profile.transaction_records.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-slate-900">Recent Activity</h3>
          <div className="space-y-2">
            {profile.transaction_records.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <span className="font-medium capitalize text-slate-700">{tx.action_type?.replace(/_/g, ' ')}</span>
                  <span className="ml-2 text-slate-400">{tx.pool_name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-900">{formatVND(tx.amount)}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
