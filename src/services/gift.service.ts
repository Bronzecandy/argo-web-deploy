import { apiService } from './api.service';
import type {
  PaginationResponse,
  Gift,
  GiftQueryParams,
  BuildTransactionResponse,
} from '@/src/types/api.types';

class GiftService {
  async listByChild(childId: string, params?: GiftQueryParams) {
    return apiService.get<PaginationResponse<Gift[]>>(`/gifts/child/${childId}`, { params });
  }

  async getById(id: string) {
    return apiService.get<Gift>(`/gifts/${id}`);
  }

  async create(data: {
    recipient: string;
    category: string;
    description: string;
    message: string;
    gift_image_blob_id: string;
    gift_value: number;
    carrier: string;
    tracking_code: string;
  }) {
    return apiService.post<BuildTransactionResponse>('/gifts', data);
  }

  async confirmReceive(id: string, delivered_image_blob_id: string) {
    return apiService.post<BuildTransactionResponse>(`/gifts/${id}/confirm`, { delivered_image_blob_id });
  }
}

export const giftService = new GiftService();
