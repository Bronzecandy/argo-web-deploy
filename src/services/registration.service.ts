import { unwrapEntityFromGetById } from '@/src/lib/paginationUnwrap';
import { apiService } from './api.service';
import type {
  PaginationResponse,
  RegistrationRequest,
  CreateRegistrationRequest,
  RegistrationQueryParams,
  VoteRequest,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

class RegistrationService {
  async list(params?: RegistrationQueryParams) {
    return apiService.get<PaginationResponse<RegistrationRequest[]>>('/registrations', { params });
  }

  /** GET may return entity or PaginationDataResponse wrapper — normalized to single registration or null. */
  async getById(id: string) {
    const res = await apiService.get<unknown>(`/registrations/${id}`);
    return { ...res, data: unwrapEntityFromGetById<RegistrationRequest>(res.data) };
  }

  async getByWallet(walletAddress: string) {
    return apiService.get<PaginationResponse>(`/registrations/user/${walletAddress}`);
  }

  async create(data: CreateRegistrationRequest) {
    return apiService.post<RegistrationRequest>('/registrations', data);
  }

  async vote(id: string, data: VoteRequest) {
    return apiService.post<MessageResponse>(`/registrations/${id}/vote`, data);
  }

  async confirm(id: string) {
    return apiService.post<BuildTransactionResponse>(`/registrations/${id}/confirm`, null);
  }
}

export const registrationService = new RegistrationService();
