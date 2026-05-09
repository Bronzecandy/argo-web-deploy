/** Prevent open redirects: only allow same-origin relative paths. */
export function getSafeReturnPath(raw: string | null): string | null {
  if (!raw || raw.trim() === '') return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
  return decoded;
}
