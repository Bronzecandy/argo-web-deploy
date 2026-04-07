import { apiService } from './api.service';
import { parseJWT } from '@/src/lib/jwt';
import type { LoginRequest, MessageResponse } from '@/src/types/api.types';

export interface AuthUser {
  id: string;
  address: string;
  role: string;
  profileId?: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<{ token: string; user: AuthUser }> {
    const response = await apiService.post<{ token: string }>('/auth/login', credentials);
    const token = response.data.token;
    const decoded = parseJWT(token);

    const user: AuthUser = {
      id: decoded.sub,
      address: decoded.address || credentials.address,
      role: decoded.roles?.[0] || 'User',
      profileId: decoded.profile_id,
    };

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
      return {
        id: decoded.sub,
        address: decoded.address,
        role: decoded.roles?.[0] || 'User',
        profileId: decoded.profile_id,
      };
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
