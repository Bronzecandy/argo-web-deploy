'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { registrationService } from '@/src/services/registration.service';
import { regionService } from '@/src/services/region.service';
import { ROLES } from '@/src/lib/constants';

const ROLE_OPTIONS = [
  { value: ROLES.VOLUNTEER, label: 'Volunteer' },
  { value: ROLES.LOCAL_LEADER, label: 'Local leader' },
  { value: ROLES.DONOR, label: 'Donor' },
] as const;

export default function DonorRegisterPage() {
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [registerRole, setRegisterRole] = useState<string>(ROLES.VOLUNTEER);
  const [avatarBlobId, setAvatarBlobId] = useState('');
  const [identityBlobId, setIdentityBlobId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    regionService
      .listRegions()
      .then((res) => setRegions(res.data.regions || []))
      .catch(() => toast.error('Failed to load regions'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim()) {
      toast.error('Select a region');
      return;
    }
    if (!avatarBlobId.trim() || !identityBlobId.trim()) {
      toast.error('Avatar and identity document are required');
      return;
    }
    setSubmitting(true);
    try {
      await registrationService.create({
        avatar_blob_id: avatarBlobId.trim(),
        identity_card_blob_id: identityBlobId.trim(),
        region: region.trim(),
        register_role: registerRole,
      });
      toast.success('Registration submitted');
      setAvatarBlobId('');
      setIdentityBlobId('');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Register role"
        description="Submit KYC-style documents and choose a role (parity with mobile registration form). Confirm on-chain from Regions → My registrations when available."
      />
      <p className="text-sm text-slate-600">
        After submitting, track status under{' '}
        <Link href="/donor/regions" className="font-medium text-blue-800 hover:underline">
          Regions → My registrations
        </Link>
        .
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="reg-region" className="mb-1 block text-xs font-medium text-slate-500">
            Region
          </label>
          <select
            id="reg-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            required
          >
            <option value="">Select region</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reg-role" className="mb-1 block text-xs font-medium text-slate-500">
            Role to register
          </label>
          <select
            id="reg-role"
            value={registerRole}
            onChange={(e) => setRegisterRole(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <FileUploadInput
          label="Avatar (photo)"
          value={avatarBlobId}
          onChange={setAvatarBlobId}
          accept="image/*"
        />
        <FileUploadInput
          label="Identity document (image)"
          value={identityBlobId}
          onChange={setIdentityBlobId}
          accept="image/*"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-800 py-2.5 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit registration'}
        </button>
      </form>
    </div>
  );
}
