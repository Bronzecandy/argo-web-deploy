import { apiService } from './api.service';
import type {
  PaginationResponse,
  WithdrawProposal,
  CreateWithdrawProposalRequest,
  WithdrawQueryParams,
  BuildTransactionResponse,
} from '@/src/types/api.types';

class WithdrawService {
  async list(params?: WithdrawQueryParams) {
    return apiService.get<PaginationResponse<WithdrawProposal[]>>('/withdraw-proposals', { params });
  }

  async getById(id: string) {
    return apiService.get<WithdrawProposal>(`/withdraw-proposals/${id}`);
  }

  async create(data: CreateWithdrawProposalRequest) {
    return apiService.post<BuildTransactionResponse>('/withdraw-proposals', data);
  }

  async vote(id: string, is_vote_yes: boolean, refuse_reason?: string) {
    const params: Record<string, any> = { is_vote_yes };
    if (refuse_reason) params.refuse_reason = refuse_reason;
    return apiService.post<BuildTransactionResponse>(
      `/withdraw-proposals/${id}/vote`,
      null,
      { params },
    );
  }

  async confirm(id: string) {
    return apiService.post<any>(`/withdraw-proposals/${id}/confirm`, null);
  }

  async mainPoolConfirm(id: string, imageBlobId: string) {
    return apiService.post<BuildTransactionResponse>(
      `/withdraw-proposals/${id}/main-pool-confirm`,
      null,
      { params: { id: imageBlobId } },
    );
  }
}

export const withdrawService = new WithdrawService();
