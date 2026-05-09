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
