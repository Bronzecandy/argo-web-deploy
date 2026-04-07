import { apiService } from './api.service';
import type {
  PersonalProfile,
  PersonalWalletProfile,
  UploadProfileRequest,
} from '@/src/types/api.types';

class ProfileService {
  async get() {
    return apiService.get<PersonalProfile>('/profiles');
  }

  async getByWallet(walletAddress: string, params?: { page?: number; page_size?: number }) {
    return apiService.get<PersonalWalletProfile>(`/profiles/${walletAddress}`, { params });
  }

  async upload(data: UploadProfileRequest) {
    return apiService.post<PersonalProfile>('/profiles', data);
  }

  async update(data: Partial<UploadProfileRequest>) {
    return apiService.put<PersonalProfile>('/profiles', data);
  }
}

export const profileService = new ProfileService();
