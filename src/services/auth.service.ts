import { apiService } from './api.service';
import { parseJWT } from '@/src/lib/jwt';
import type { LoginRequest, MessageResponse } from '@/src/types/api.types';

export interface AuthUser {
  id: string;
  address: string;
  role: string;
  profileId?: string;
}

function normalizeRole(raw: string): string {
  const r = raw.toLowerCase().replace(/[_\s-]/g, '');
  if (r === 'admin' || r === 'roleadmin') return 'Admin';
  if (r === 'localleader' || r === 'rolelocalleader' || r === 'leader') return 'LocalLeader';
  if (r === 'volunteer' || r === 'rolevolunteer') return 'Volunteer';
  if (r === 'donor' || r === 'roledonor') return 'Donor';
  return raw;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<{ token: string; user: AuthUser }> {
    const response = await apiService.post<{ token: string }>('/auth/login', credentials);
    const token = response.data.token;
    const decoded = parseJWT(token);
    console.log('[Auth] JWT decoded payload:', decoded);

    const rawRole = decoded.roles?.[0] || decoded.role || 'User';

    const user: AuthUser = {
      id: decoded.sub,
      address: decoded.address || credentials.address,
      role: normalizeRole(rawRole),
      profileId: decoded.profile_id,
    };

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
      await apiService.post('/auth/logout');
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
      const decoded = parseJWT(token);
      const rawRole = decoded.roles?.[0] || decoded.role || 'User';
      return {
        id: decoded.sub,
        address: decoded.address,
        role: normalizeRole(rawRole),
        profileId: decoded.profile_id,
      };
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
