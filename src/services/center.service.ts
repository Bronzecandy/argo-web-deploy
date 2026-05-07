import { apiService } from './api.service';
import type {
  PaginationResponse,
  CenterRequest,
  SupportCenter,
  CreateCenterRequest,
  CenterQueryParams,
  CenterReqQueryParams,
  VoteRequest,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

class CenterService {
  async list(params?: CenterQueryParams) {
    return apiService.get<PaginationResponse<SupportCenter[]>>('/centers', { params });
  }

  async listCenterRequests(params?: CenterReqQueryParams) {
    return apiService.get<PaginationResponse<CenterRequest[]>>('/center-reqs', { params });
  }

  async getById(id: string) {
    return apiService.get<SupportCenter>(`/centers/${id}`);
  }

  async getCenterRequestById(id: string) {
    return apiService.get<CenterRequest>(`/center-reqs/${id}`);
  }

  async getByWallet(walletAddress: string, params?: { page?: number; page_size?: number }) {
    return apiService.get<PaginationResponse<SupportCenter[]>>(`/centers/user/${walletAddress}`, { params });
  }

  /** Submit a new center registration request (Local Leader “Register new center”). */
  async create(data: CreateCenterRequest) {
    return apiService.post<CenterRequest>('/center-reqs', data);
  }

  async vote(id: string, data: VoteRequest) {
    return apiService.post<MessageResponse>(`/centers/${id}/vote`, data);
  }

  async confirm(id: string) {
    return apiService.post<BuildTransactionResponse>(`/centers/${id}/confirm`, null);
  }

  async voteCenterRequest(id: string, data: VoteRequest) {
    return apiService.post<MessageResponse>(`/center-reqs/${id}/vote`, data);
  }

  async confirmCenterRequest(id: string) {
    return apiService.post<BuildTransactionResponse>(`/center-reqs/${id}/confirm`, null);
  }
}

export const centerService = new CenterService();
