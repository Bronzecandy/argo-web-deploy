/**
 * Paths where a 401 from the API should not force a full redirect to /login
 * (guest browsing, login page, etc.).
 */
const PUBLIC_PATHNAMES = new Set<string>(['/', '/login', '/unauthorized', '/explore']);

function stripQuery(pathname: string) {
  const q = pathname.indexOf('?');
  return q === -1 ? pathname : pathname.slice(0, q);
}

/** True if current URL pathname is treated as publicly browseable (no auth redirect on 401). */
export function isPublicPath(pathname: string): boolean {
  const p = stripQuery(pathname);
  if (PUBLIC_PATHNAMES.has(p)) return true;
  if (p.startsWith('/children/')) return true;
  if (p.startsWith('/campaigns/')) return true;
  if (p.startsWith('/donor/payment/')) return true;
  return false;
}
