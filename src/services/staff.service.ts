import { unwrapEntityFromGetById } from '@/src/lib/paginationUnwrap';
import { apiService } from './api.service';
import type { PaginationResponse, Staff, StaffQueryParams } from '@/src/types/api.types';

class StaffService {
  async list(params?: StaffQueryParams) {
    return apiService.get<PaginationResponse<Staff[]>>('/staffs', { params });
  }

  async getById(id: string) {
    const res = await apiService.get<unknown>(`/staffs/${id}`);
    return { ...res, data: unwrapEntityFromGetById<Staff>(res.data) };
  }
}

export const staffService = new StaffService();
