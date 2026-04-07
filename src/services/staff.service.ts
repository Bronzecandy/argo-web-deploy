import { apiService } from './api.service';
import type { PaginationResponse, Staff, StaffQueryParams } from '@/src/types/api.types';

class StaffService {
  async list(params?: StaffQueryParams) {
    return apiService.get<PaginationResponse<Staff[]>>('/staffs', { params });
  }

  async getById(id: string) {
    return apiService.get<Staff>(`/staffs/${id}`);
  }
}

export const staffService = new StaffService();
