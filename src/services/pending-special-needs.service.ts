import { apiService } from './api.service';
import type {
  PaginationResponse,
  PendingSpecialNeedProposal,
  PendingSpecialNeedQueryParams,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

class PendingSpecialNeedsService {
  async list(params?: PendingSpecialNeedQueryParams) {
    return apiService.get<PaginationResponse<PendingSpecialNeedProposal[]>>('/pending-special-needs', { params });
  }

  async getById(id: string) {
    return apiService.get<PendingSpecialNeedProposal>(`/pending-special-needs/${id}`);
  }

  async approve(id: string) {
    return apiService.post<BuildTransactionResponse>(`/pending-special-needs/${id}/approve`, null);
  }

  async refuse(id: string) {
    return apiService.post<MessageResponse>(`/pending-special-needs/${id}/refuse`, null);
  }
}

export const pendingSpecialNeedsService = new PendingSpecialNeedsService();
