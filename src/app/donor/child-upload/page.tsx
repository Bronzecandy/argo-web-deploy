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
      .catch(() => toast.error('Không tải được danh sách vùng'));
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
      toast.error('Vui lòng điền đủ thông tin trẻ và nhà ở, tải ảnh đại diện + ảnh nhà ở');
      return;
    }
    const g1 = firstGuardian;
    if (
      !g1.guardian_full_name.trim() ||
      !g1.guardian_phone_number.trim() ||
      !g1.guardian_relation.trim() ||
      !g1.identity_card_blob_id.trim()
    ) {
      toast.error('Vui lòng nhập đủ thông tin người giám hộ chính và ảnh giấy tờ');
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
        toast.error('Hoàn thành thông tin người giám hộ thứ hai hoặc bỏ chọn «Người giám hộ thứ hai»');
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
      toast.success('Đã gửi yêu cầu tải hồ sơ trẻ');
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
      toast.error(msg || 'Gửi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Yêu cầu tải hồ sơ trẻ"
        description="Đề xuất hồ sơ trẻ mới để được xem xét và bỏ phiếu duyệt."
      />

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Trẻ</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tên</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Họ</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-500">Giới tính</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ngày sinh</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Ngày sinh gửi theo định dạng ngày/tháng/năm.
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Số CMND/CCCD</label>
            <input
              value={identityCode}
              onChange={(e) => setIdentityCode(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Vùng</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              <option value="">Chọn vùng</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Địa chỉ nhà</label>
            <input
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <FileUploadInput label="Ảnh đại diện trẻ" value={avatarBlobId} onChange={setAvatarBlobId} accept="image/*" />
          <FileUploadInput
            label="Ảnh nhà ở / nơi cư trú"
            value={homeBlobId}
            onChange={setHomeBlobId}
            accept="image/*"
          />
        </fieldset>

        <fieldset className="space-y-3 border-t border-slate-100 pt-4">
          <legend className="text-sm font-semibold text-slate-900">Người giám hộ chính</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Họ và tên</label>
              <input
                value={firstGuardian.guardian_full_name}
                onChange={(e) => setFirstGuardian({ ...firstGuardian, guardian_full_name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Điện thoại</label>
              <input
                value={firstGuardian.guardian_phone_number}
                onChange={(e) => setFirstGuardian({ ...firstGuardian, guardian_phone_number: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Quan hệ với trẻ</label>
            <input
              value={firstGuardian.guardian_relation}
              onChange={(e) => setFirstGuardian({ ...firstGuardian, guardian_relation: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <FileUploadInput
            label="Giấy tờ tùy thân người giám hộ"
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
            Người giám hộ thứ hai
          </label>
          {includeSecondGuardian && (
            <fieldset className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Họ và tên</label>
                  <input
                    value={secondGuardian.guardian_full_name}
                    onChange={(e) => setSecondGuardian({ ...secondGuardian, guardian_full_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Điện thoại</label>
                  <input
                    value={secondGuardian.guardian_phone_number}
                    onChange={(e) => setSecondGuardian({ ...secondGuardian, guardian_phone_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Quan hệ</label>
                <input
                  value={secondGuardian.guardian_relation}
                  onChange={(e) => setSecondGuardian({ ...secondGuardian, guardian_relation: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <FileUploadInput
                label="Giấy tờ tùy thân người giám hộ"
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
          {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </button>
      </form>
    </div>
  );
}
