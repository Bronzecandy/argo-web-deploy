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
    return apiService.post<BuildTransactionResponse>(
      `/withdraw-proposals/${id}/vote`,
      undefined,
      { params: { is_vote_yes, refuse_reason } },
    );
  }

  async confirm(id: string) {
    return apiService.post<any>(`/withdraw-proposals/${id}/confirm`);
  }

  async mainPoolConfirm(id: string, imageBlobId: string) {
    return apiService.post<BuildTransactionResponse>(
      `/withdraw-proposals/${id}/main-pool-confirm`,
      undefined,
      { params: { id: imageBlobId } },
    );
  }
}

export const withdrawService = new WithdrawService();
