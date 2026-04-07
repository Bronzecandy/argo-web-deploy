import { apiService } from './api.service';
import type {
  PaginationResponse,
  UpdatePublisherInfoRequest,
  BuildTransactionResponse,
} from '@/src/types/api.types';

class AdminService {
  async list(params?: { page?: number; page_size?: number; keyword?: string; gender?: string; year_of_birth?: number }) {
    return apiService.get<PaginationResponse>('/admins', { params });
  }

  async updatePublisherInfo(data: UpdatePublisherInfoRequest) {
    return apiService.post<BuildTransactionResponse>('/admins', data);
  }
}

export const adminService = new AdminService();
