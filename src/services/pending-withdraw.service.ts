import { apiService } from './api.service';
import type {
  PaginationResponse,
  PendingWithdrawProposal,
  CreatePendingWithdrawProposalRequest,
  PendingWithdrawQueryParams,
  BuildTransactionResponse,
} from '@/src/types/api.types';

class PendingWithdrawService {
  async list(params?: PendingWithdrawQueryParams) {
    return apiService.get<PaginationResponse<PendingWithdrawProposal[]>>('/pending-withdraw-proposals', { params });
  }

  async getById(id: string) {
    return apiService.get<PendingWithdrawProposal>(`/pending-withdraw-proposals/${id}`);
  }

  async create(data: CreatePendingWithdrawProposalRequest) {
    return apiService.post<BuildTransactionResponse>('/pending-withdraw-proposals', data);
  }

  async approve(id: string) {
    return apiService.post<BuildTransactionResponse>(`/pending-withdraw-proposals/${id}/approve`, null);
  }

  async refuse(id: string) {
    return apiService.post<BuildTransactionResponse>(`/pending-withdraw-proposals/${id}/refuse`, null);
  }
}

export const pendingWithdrawService = new PendingWithdrawService();
