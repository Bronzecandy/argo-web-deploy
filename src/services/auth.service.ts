import { apiService } from './api.service';
import { parseJWT } from '@/src/lib/jwt';
import { ROLES, type UserRole } from '@/src/lib/constants';
import type { LoginRequest, MessageResponse } from '@/src/types/api.types';

export interface AuthUser {
  id: string;
  address: string;
  /** Primary role for default redirect / display (highest privilege in JWT). */
  role: string;
  /** All normalized roles from JWT. */
  roles: string[];
  profileId?: string;
}

export function normalizeRole(raw: string): string {
  const r = raw.toLowerCase().replace(/[_\s-]/g, '');
  if (r === 'admin' || r === 'roleadmin') return ROLES.ADMIN;
  if (r === 'localleader' || r === 'rolelocalleader' || r === 'leader') return ROLES.LOCAL_LEADER;
  if (r === 'volunteer' || r === 'rolevolunteer') return ROLES.VOLUNTEER;
  if (r === 'donor' || r === 'roledonor') return ROLES.DONOR;
  if (r === 'user' || r === 'roleuser') return ROLES.USER;
  return raw;
}

const ROLE_PRIORITY: readonly string[] = [
  ROLES.ADMIN,
  ROLES.LOCAL_LEADER,
  ROLES.VOLUNTEER,
  ROLES.DONOR,
  ROLES.USER,
];

export function pickPrimaryRole(roles: string[]): string {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? ROLES.USER;
}

function normalizedRolesFromDecoded(decoded: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const n = normalizeRole(s);
    if (n && !out.includes(n)) out.push(n);
  };
  const rawRoles = decoded.roles;
  if (Array.isArray(rawRoles)) {
    for (const item of rawRoles) {
      if (item != null && String(item).trim()) push(String(item));
    }
  }
  const single = decoded.role;
  if (typeof single === 'string' && single.trim()) push(single);
  if (out.length === 0) push(ROLES.USER);
  return out;
}

export function userHasAnyRole(user: AuthUser, allowedRoles: UserRole[]): boolean {
  const effective = user.roles?.length ? user.roles : [user.role];
  return allowedRoles.some((r) => effective.includes(r));
}

function buildAuthUser(
  decoded: Record<string, unknown>,
  fallbackAddress: string,
): AuthUser {
  const roles = normalizedRolesFromDecoded(decoded);
  return {
    id: String(decoded.sub ?? ''),
    address: String(decoded.address ?? fallbackAddress),
    role: pickPrimaryRole(roles),
    roles,
    profileId: decoded.profile_id as string | undefined,
  };
}

class AuthService {
  async login(credentials: LoginRequest): Promise<{ token: string; user: AuthUser }> {
    const response = await apiService.post<{ token: string }>('/auth/login', credentials);
    const token = response.data.token;
    const decoded = parseJWT(token) as Record<string, unknown>;
    console.log('[Auth] JWT decoded payload:', decoded);

    const user = buildAuthUser(decoded, credentials.address);

    console.log('[Auth] Parsed user:', user);
    apiService.setAccessToken(token);
    return { token, user };
  }

  async getSalt(sub: string): Promise<string> {
    const response = await apiService.get<{ salt: string }>(`/auth/salt/${sub}`);
    return response.data.salt;
  }

  async getNonce(address: string): Promise<string> {
    const response = await apiService.get<MessageResponse>(`/auth/nonce/${address}`);
    return response.data.message;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout', null);
    } catch {
      // Ignore server errors — logout must always succeed client-side
    } finally {
      apiService.clearTokens();
    }
  }

  getStoredToken(): string | null {
    return apiService.getAccessToken();
  }

  getStoredUser(): AuthUser | null {
    const token = this.getStoredToken();
    if (!token) return null;
    try {
      const decoded = parseJWT(token) as Record<string, unknown>;
      return buildAuthUser(decoded, '');
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
