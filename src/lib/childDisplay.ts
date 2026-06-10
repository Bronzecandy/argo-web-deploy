import type {
  Child,
  ChildGuardianProfile,
  GuardianInput,
  UploadChildRequestEntity,
} from '@/src/types/api.types';

export type NormalizedGuardian = {
  fullName: string;
  phone: string;
  relation: string;
  relationLabel: string;
  identityCardImgUrl?: string;
  identityCardBlobId?: string;
};

function pickNonEmpty(...values: (string | undefined | null)[]): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

const GENDER_VI: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

const RELATION_VI: Record<string, string> = {
  father: 'Cha',
  mother: 'Mẹ',
  grandfather: 'Ông',
  grandmother: 'Bà',
  uncle: 'Chú / Bác',
  aunt: 'Cô / Dì',
  sibling: 'Anh / Chị / Em',
  guardian: 'Người giám hộ',
};

export function formatGenderVi(gender?: string | null): string {
  const key = (gender ?? '').trim().toLowerCase();
  if (!key) return '—';
  return GENDER_VI[key] ?? gender!;
}

export function formatGuardianRelationVi(relation?: string | null): string {
  const key = (relation ?? '').trim().toLowerCase();
  if (!key) return '—';
  return RELATION_VI[key] ?? relation!;
}

type GuardianRaw = ChildGuardianProfile | GuardianInput;

export function normalizeGuardian(raw?: GuardianRaw | null): NormalizedGuardian | null {
  if (!raw) return null;
  const g = raw as GuardianInput & ChildGuardianProfile;
  const fullName = pickNonEmpty(g.guardian_full_name, g.full_name);
  const phone = pickNonEmpty(g.guardian_phone_number, g.phone_number);
  const relation = pickNonEmpty(g.guardian_relation, g.relation) ?? '';
  const identityCardImgUrl = pickNonEmpty(g.identity_card_img_url);
  const identityCardBlobId = pickNonEmpty(g.identity_card_blob_id);

  if (!fullName && !phone && !identityCardImgUrl && !identityCardBlobId) return null;

  return {
    fullName: fullName ?? '—',
    phone: phone ?? '—',
    relation,
    relationLabel: formatGuardianRelationVi(relation),
    identityCardImgUrl,
    identityCardBlobId,
  };
}

export function mergeUploadChildDetail(
  base: UploadChildRequestEntity,
  patch: UploadChildRequestEntity | null | undefined,
): UploadChildRequestEntity {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    avatar_img_url: pickNonEmpty(patch.avatar_img_url, base.avatar_img_url),
    birth_certificate_img_url: pickNonEmpty(patch.birth_certificate_img_url, base.birth_certificate_img_url),
    home_img_url: pickNonEmpty(patch.home_img_url, base.home_img_url),
    avatar_blob_id: pickNonEmpty(patch.avatar_blob_id, base.avatar_blob_id) ?? base.avatar_blob_id,
    birth_certificate_blob_id:
      pickNonEmpty(patch.birth_certificate_blob_id, base.birth_certificate_blob_id) ??
      base.birth_certificate_blob_id,
    home_blob_id: pickNonEmpty(patch.home_blob_id, base.home_blob_id) ?? base.home_blob_id,
    first_guardian_profile: patch.first_guardian_profile ?? base.first_guardian_profile,
    second_guardian_profile: patch.second_guardian_profile ?? base.second_guardian_profile,
    approvers: patch.approvers?.length ? patch.approvers : base.approvers,
    refusers: patch.refusers?.length ? patch.refusers : base.refusers,
  };
}

export function mergeChildProfileDetail(base: Child, patch: Child | null | undefined): Child {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    avatar_img_url: pickNonEmpty(patch.avatar_img_url, base.avatar_img_url),
    birth_certificate_img_url: pickNonEmpty(patch.birth_certificate_img_url, base.birth_certificate_img_url),
    home_img_url: pickNonEmpty(patch.home_img_url, base.home_img_url),
    avatar_blob_id: pickNonEmpty(patch.avatar_blob_id, base.avatar_blob_id) ?? base.avatar_blob_id,
    birth_certificate_blob_id:
      pickNonEmpty(patch.birth_certificate_blob_id, base.birth_certificate_blob_id) ??
      base.birth_certificate_blob_id,
    home_blob_id: pickNonEmpty(patch.home_blob_id, base.home_blob_id) ?? base.home_blob_id,
    first_guardian: patch.first_guardian ?? base.first_guardian,
    second_guardian: patch.second_guardian ?? base.second_guardian,
  };
}
