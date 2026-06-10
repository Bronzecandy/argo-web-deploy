import type { RegistrationRequest } from '@/src/types/api.types';

/** Nhãn tiếng Việt cho vai trò đăng ký. */
export function formatRegisterRoleVi(role?: string | null): string {
  const key = (role ?? '').trim();
  if (!key) return '—';
  const map: Record<string, string> = {
    Volunteer: 'Tình nguyện viên',
    LocalLeader: 'Trưởng vùng',
    Staff: 'Nhân viên',
    Admin: 'Quản trị viên',
    Donor: 'Nhà hảo tâm',
  };
  return map[key] ?? key.replace(/_/g, ' ');
}

function pickNonEmpty(...values: (string | undefined | null)[]): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

/** Gộp dòng danh sách với GET chi tiết (API đôi khi thiếu URL ảnh hoặc roster). */
export function mergeRegistrationDetail(
  base: RegistrationRequest,
  patch: RegistrationRequest | null | undefined,
): RegistrationRequest {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    avatar_img_url: pickNonEmpty(patch.avatar_img_url, base.avatar_img_url),
    identity_card_img_url: pickNonEmpty(patch.identity_card_img_url, base.identity_card_img_url),
    avatar_blob_id: pickNonEmpty(patch.avatar_blob_id, base.avatar_blob_id) ?? base.avatar_blob_id,
    identity_card_blob_id:
      pickNonEmpty(patch.identity_card_blob_id, base.identity_card_blob_id) ?? base.identity_card_blob_id,
    approvers: patch.approvers?.length ? patch.approvers : base.approvers,
    refusers: patch.refusers?.length ? patch.refusers : base.refusers,
  };
}
