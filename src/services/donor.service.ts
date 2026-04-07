import { apiService } from './api.service';
import type { PaginationResponse, Donor, DonorQueryParams } from '@/src/types/api.types';

class DonorService {
  async list(params?: DonorQueryParams) {
    return apiService.get<PaginationResponse<Donor[]>>('/donors', { params });
  }

  async getById(id: string) {
    return apiService.get<Donor>(`/donors/${id}`);
  }
}

export const donorService = new DonorService();
