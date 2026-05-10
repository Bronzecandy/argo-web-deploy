export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://agrotrust-server-production.onrender.com';

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const BLOB_URL = (blobId: string) => `${API_BASE_URL}/blobs/${blobId}`;

/** Path for PayOS `returnUrl` (full URL = site origin + this path). Configure the same URL on the backend. */
export const PAYMENT_RESULT_PATH = '/payment/result';

export const ROLES = {
  ADMIN: 'Admin',
  LOCAL_LEADER: 'LocalLeader',
  VOLUNTEER: 'Volunteer',
  DONOR: 'Donor',
  USER: 'User',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
