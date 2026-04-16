import { apiService } from './api.service';
import type {
  PaginationResponse,
  CenterRequest,
  CreateCenterRequest,
  CenterQueryParams,
  VoteRequest,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

class CenterService {
  async list(params?: CenterQueryParams) {
    return apiService.get<PaginationResponse<CenterRequest[]>>('/centers', { params });
  }

  async getById(id: string) {
    return apiService.get<PaginationResponse>(`/centers/${id}`);
  }

  async getByWallet(walletAddress: string) {
    return apiService.get<PaginationResponse>(`/centers/user/${walletAddress}`);
  }

  async create(data: CreateCenterRequest) {
    return apiService.post<CenterRequest>('/centers', data);
  }

  async vote(id: string, data: VoteRequest) {
    return apiService.post<MessageResponse>(`/centers/${id}/vote`, data);
  }

  async confirm(id: string) {
    return apiService.post<BuildTransactionResponse>(`/centers/${id}/confirm`, null);
  }
}

export const centerService = new CenterService();
