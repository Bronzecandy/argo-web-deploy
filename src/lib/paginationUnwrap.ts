/**
 * Some GET-by-id endpoints return `PaginationDataResponse` (data array or single object).
 * Normalizes the response body to a single entity or null.
 */
export function unwrapEntityFromGetById<T>(body: unknown): T | null {
  if (body == null) return null;
  if (typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!('data' in b)) {
    return body as T;
  }
  const d = b.data;
  if (Array.isArray(d)) {
    if (d.length === 0) return null;
    return d[0] as T;
  }
  if (d != null && typeof d === 'object') {
    return d as T;
  }
  return null;
}
