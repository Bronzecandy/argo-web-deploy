import { apiService } from './api.service';
import type {
  PersonalProfile,
  PersonalWalletProfile,
  UploadProfileRequest,
} from '@/src/types/api.types';

class ProfileService {
  async getByWallet(walletAddress: string, params?: { page?: number; page_size?: number; action_type?: string; actor?: string; keyword?: string; min_amount?: number; max_amount?: number; pool_id?: string; sort_criteria?: string; sort_order?: string }) {
    return apiService.get<PersonalWalletProfile>(`/profiles/personal-wallet-profile/${walletAddress}`, { params });
  }

  async upload(profileId: string, data: UploadProfileRequest) {
    return apiService.post<PersonalProfile>(`/profiles/${profileId}`, data);
  }
}

export const profileService = new ProfileService();
