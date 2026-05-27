import { apiService } from './api.service';
import type {
  PaginationResponse,
  UploadChildRequestEntity,
  UploadChildRequest,
  ChildUploadQueryParams,
  VoteRequest,
  MessageResponse,
} from '@/src/types/api.types';

class ChildUploadService {
  async list(params?: ChildUploadQueryParams) {
    return apiService.get<PaginationResponse<UploadChildRequestEntity[]>>('/child-upload-reqs', { params });
  }

  async getById(id: string) {
    return apiService.get<PaginationResponse>(`/child-upload-reqs/${id}`);
  }

  async getByWallet(walletAddress: string, page?: number) {
    return apiService.get<PaginationResponse>(`/child-upload-reqs/user/${walletAddress}`, { params: { page } });
  }

  async create(data: UploadChildRequest) {
    return apiService.post<UploadChildRequestEntity>('/child-upload-reqs', data);
  }

  async review(id: string, data: VoteRequest) {
    return apiService.post<MessageResponse>(`/child-upload-reqs/${id}/review`, data);
  }
}

export const childUploadService = new ChildUploadService();
