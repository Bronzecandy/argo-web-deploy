export function parseJWT(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = parts[1];
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const decoded = atob(padded);

  return JSON.parse(decoded);
}

export function getSubFromJWT(token: string): string {
  if (!token) throw new Error('Token is null or undefined');
  const payload = parseJWT(token);
  if (!payload.sub) throw new Error('JWT does not contain sub claim');
  return payload.sub;
}

export function getJWTClaims(token: string) {
  return parseJWT(token);
}
