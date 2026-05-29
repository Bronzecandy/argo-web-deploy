export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://agrotrust-server-production.onrender.com';

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const BLOB_URL = (blobId: string) => `${API_BASE_URL}/blobs/${blobId}`;

/**
 * Path for PayOS `returnUrl` (full URL = `NEXT_PUBLIC_APP_URL` + this path).
 * Backend should append `?payment_id={id}` so the web can call server callback then poll status.
 */
export const PAYMENT_RESULT_PATH = '/payment/result';

export const APP_URL =
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  '';

export function paymentResultUrl(paymentId?: string): string {
  const base = APP_URL || '';
  const path = PAYMENT_RESULT_PATH;
  const url = base ? `${base}${path}` : path;
  if (!paymentId?.trim()) return url;
  return `${url}?payment_id=${encodeURIComponent(paymentId.trim())}`;
}

export const ROLES = {
  ADMIN: 'Admin',
  LOCAL_LEADER: 'LocalLeader',
  VOLUNTEER: 'Volunteer',
  DONOR: 'Donor',
  USER: 'User',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
