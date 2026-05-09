/** Ordered blob-id field names (Swagger) — first match wins when picking a “primary” image. */
export const GIFT_BLOB_KEYS = ['gift_image_blob_id', 'delivered_image_blob_id'] as const;
export const REGISTRATION_BLOB_KEYS = ['avatar_blob_id', 'identity_card_blob_id'] as const;
export const CHILD_BLOB_KEYS = [
  'avatar_blob_id',
  'home_blob_id',
  'birth_certificate_blob_id',
] as const;
export const TASK_PROOF_BLOB_KEYS = ['image_blob_id'] as const;
export const WITHDRAW_PROOF_KEYS = ['proof_blob_id'] as const;

export function pickFirstBlobId(obj: unknown, keys: readonly string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Vietnamese labels for `*_blob*` fields shown under thumbnails in detail modals. */
const BLOB_FIELD_LABELS_VI: Record<string, string> = {
  avatar_blob_id: 'Ảnh đại diện',
  identity_card_blob_id: 'CCCD / CMND',
  home_blob_id: 'Ảnh nhà / cảnh nhà',
  birth_certificate_blob_id: 'Giấy khai sinh',
  gift_image_blob_id: 'Ảnh quà tặng',
  delivered_image_blob_id: 'Ảnh xác nhận đã nhận hàng',
  image_blob_id: 'Ảnh minh chứng',
  proof_blob_id: 'Ảnh bằng chứng',
  center_image_blob_id: 'Ảnh trung tâm',
};

/** User-facing caption for a blob field key (detail modals). */
function humanizeBlobKeyTail(fieldKey: string): string {
  const known = BLOB_FIELD_LABELS_VI[fieldKey];
  if (known) return known;
  const stripped = fieldKey.replace(/_blob_id$/i, '').replace(/_blob$/i, '').replace(/_id$/i, '');
  const words = stripped.split('_').filter(Boolean);
  if (words.length === 0) return fieldKey;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function blobFieldDisplayLabel(fieldKey: string): string {
  const guardian = fieldKey.match(/^(first_guardian|second_guardian)\.(.+)$/);
  if (guardian)
    return `${humanizeBlobKeyTail(guardian[2])} (${guardian[1] === 'first_guardian' ? 'Giám hộ thứ nhất' : 'Giám hộ thứ hai'})`;
  return humanizeBlobKeyTail(fieldKey);
}

/** All non-empty blob-like string fields on a record (for detail “Images” sections). */
export function collectBlobIdEntries(obj: unknown): { key: string; blobId: string }[] {
  if (!obj || typeof obj !== 'object') return [];
  const o = obj as Record<string, unknown>;
  const out: { key: string; blobId: string }[] = [];
  for (const [key, val] of Object.entries(o)) {
    if (!key.toLowerCase().includes('blob')) continue;
    if (typeof val !== 'string' || !val.trim()) continue;
    out.push({ key, blobId: val.trim() });
  }
  return out;
}
