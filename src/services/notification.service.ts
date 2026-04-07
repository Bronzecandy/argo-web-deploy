import { apiService } from './api.service';
import type { PaginationResponse } from '@/src/types/api.types';

class NotificationService {
  async listByUser(walletAddress: string, params?: { page?: number; page_size?: number }) {
    return apiService.get<PaginationResponse>(`/notis/user/${walletAddress}`, { params });
  }
}

export const notificationService = new NotificationService();
