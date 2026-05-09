'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/src/components/ui/PageHeader';
import FileUploadInput from '@/src/components/ui/FileUploadInput';
import { childUploadService } from '@/src/services/child-upload.service';
import { regionService } from '@/src/services/region.service';
import type { GuardianInput } from '@/src/types/api.types';
import { toDDMMYYYY } from '@/src/lib/formatters';

const emptyGuardian = (): GuardianInput => ({
  guardian_full_name: '',
  guardian_phone_number: '',
  guardian_relation: '',
  identity_card_blob_id: '',
});

export default function DonorChildUploadPage() {
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('other');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [identityCode, setIdentityCode] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [avatarBlobId, setAvatarBlobId] = useState('');
  const [homeBlobId, setHomeBlobId] = useState('');
  const [firstGuardian, setFirstGuardian] = useState<GuardianInput>(emptyGuardian);
  const [secondGuardian, setSecondGuardian] = useState<GuardianInput>(emptyGuardian);
  const [includeSecondGuardian, setIncludeSecondGuardian] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    regionService
      .listRegions()
      .then((res) => setRegions(res.data.regions || []))
      .catch(() => toast.error('Failed to load regions'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !region.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !dateOfBirth.trim() ||
      !identityCode.trim() ||
      !homeAddress.trim() ||
      !avatarBlobId.trim() ||
      !homeBlobId.trim()
    ) {
      toast.error('Fill required child and home fields, and upload avatar + home photo');
      return;
    }
    const g1 = firstGuardian;
    if (
      !g1.guardian_full_name.trim() ||
      !g1.guardian_phone_number.trim() ||
      !g1.guardian_relation.trim() ||
      !g1.identity_card_blob_id.trim()
    ) {
      toast.error('Complete primary guardian details and ID image');
      return;
    }
    if (includeSecondGuardian) {
      const g2 = secondGuardian;
      if (
        !g2.guardian_full_name.trim() ||
        !g2.guardian_phone_number.trim() ||
        !g2.guardian_relation.trim() ||
        !g2.identity_card_blob_id.trim()
      ) {
        toast.error('Complete second guardian or turn off “Second guardian”');
        return;
      }
    }

    setSubmitting(true);
    try {
      await childUploadService.create({
        avatar_blob_id: avatarBlobId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender.trim(),
        date_of_birth: toDDMMYYYY(dateOfBirth.trim()),
        region: region.trim(),
        home_address: homeAddress.trim(),
        home_blob_id: homeBlobId.trim(),
        identity_code: identityCode.trim(),
        first_guardian: {
          guardian_full_name: g1.guardian_full_name.trim(),
          guardian_phone_number: g1.guardian_phone_number.trim(),
          guardian_relation: g1.guardian_relation.trim(),
          identity_card_blob_id: g1.identity_card_blob_id.trim(),
        },
        ...(includeSecondGuardian
          ? {
              second_guardian: {
                guardian_full_name: secondGuardian.guardian_full_name.trim(),
                guardian_phone_number: secondGuardian.guardian_phone_number.trim(),
                guardian_relation: secondGuardian.guardian_relation.trim(),
                identity_card_blob_id: secondGuardian.identity_card_blob_id.trim(),
              },
            }
          : {}),
      });
      toast.success('Child upload request submitted');
      setFirstName('');
      setLastName('');
      setDateOfBirth('');
      setIdentityCode('');
      setHomeAddress('');
      setAvatarBlobId('');
      setHomeBlobId('');
      setFirstGuardian(emptyGuardian());
      setSecondGuardian(emptyGuardian());
      setIncludeSecondGuardian(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      toast.error(msg || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Request child upload"
        description="Propose a new child profile for review (parity with mobile child upload request). Voting and confirmation follow API rules."
      />

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Child</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Submitted as <span className="font-medium">DD/MM/YYYY</span> for the API (same as mobile).
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Identity code</label>
            <input
              value={identityCode}
              onChange={(e) => setIdentityCode(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-slate-500">Home address</label>
            <input
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <FileUploadInput label="Child avatar" value={avatarBlobId} onChange={setAvatarBlobId} accept="image/*" />
          <FileUploadInput
            label="Home / residence photo"
            value={homeBlobId}
            onChange={setHomeBlobId}
            accept="image/*"
          />
        </fieldset>

        <fieldset className="space-y-3 border-t border-slate-100 pt-4">
          <legend className="text-sm font-semibold text-slate-900">Primary guardian</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Full name</label>
              <input
                value={firstGuardian.guardian_full_name}
                onChange={(e) => setFirstGuardian({ ...firstGuardian, guardian_full_name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Phone</label>
              <input
                value={firstGuardian.guardian_phone_number}
                onChange={(e) => setFirstGuardian({ ...firstGuardian, guardian_phone_number: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Relation to child</label>
            <input
              value={firstGuardian.guardian_relation}
              onChange={(e) => setFirstGuardian({ ...firstGuardian, guardian_relation: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <FileUploadInput
            label="Guardian ID document"
            value={firstGuardian.identity_card_blob_id}
            onChange={(id) => setFirstGuardian({ ...firstGuardian, identity_card_blob_id: id })}
            accept="image/*"
          />
        </fieldset>

        <div className="border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={includeSecondGuardian}
              onChange={(e) => setIncludeSecondGuardian(e.target.checked)}
              className="rounded border-slate-300"
            />
            Second guardian
          </label>
          {includeSecondGuardian && (
            <fieldset className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Full name</label>
                  <input
                    value={secondGuardian.guardian_full_name}
                    onChange={(e) => setSecondGuardian({ ...secondGuardian, guardian_full_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Phone</label>
                  <input
                    value={secondGuardian.guardian_phone_number}
                    onChange={(e) => setSecondGuardian({ ...secondGuardian, guardian_phone_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Relation</label>
                <input
                  value={secondGuardian.guardian_relation}
                  onChange={(e) => setSecondGuardian({ ...secondGuardian, guardian_relation: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <FileUploadInput
                label="Guardian ID document"
                value={secondGuardian.identity_card_blob_id}
                onChange={(id) => setSecondGuardian({ ...secondGuardian, identity_card_blob_id: id })}
                accept="image/*"
              />
            </fieldset>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-800 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </div>
  );
}
