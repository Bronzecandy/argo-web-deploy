export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://agrotrust-server-production.onrender.com';

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const BLOB_URL = (blobId: string) => `${API_BASE_URL}/blobs/${blobId}`;

/**
 * Trang web PayOS redirect về (cấu hình returnUrl trên BE / PayOS).
 * Full URL: `NEXT_PUBLIC_APP_URL` + `PAYMENT_CALLBACK_PATH` + `?payment_id={id}`
 */
export const PAYMENT_CALLBACK_PATH =
  process.env.NEXT_PUBLIC_PAYMENT_CALLBACK_PATH?.trim() || '/payment/callback';

/** @deprecated Dùng PAYMENT_CALLBACK_PATH — giữ alias cho link cũ */
export const PAYMENT_RESULT_PATH = PAYMENT_CALLBACK_PATH;

export const APP_URL =
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
  '';

export function paymentCallbackUrl(paymentId?: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || APP_URL || '').trim();
  const path = PAYMENT_CALLBACK_PATH.startsWith('/') ? PAYMENT_CALLBACK_PATH : `/${PAYMENT_CALLBACK_PATH}`;
  const url = base ? `${base}${path}` : path;
  if (!paymentId?.trim()) return url;
  return `${url}?payment_id=${encodeURIComponent(paymentId.trim())}`;
}

/** @deprecated Alias — dùng paymentCallbackUrl */
export function paymentResultUrl(paymentId?: string): string {
  return paymentCallbackUrl(paymentId);
}

export const ROLES = {
  ADMIN: 'Admin',
  LOCAL_LEADER: 'LocalLeader',
  VOLUNTEER: 'Volunteer',
  DONOR: 'Donor',
  USER: 'User',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
