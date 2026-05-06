import { apiService } from './api.service';
import type {
  PaginationResponse,
  Child,
  ChildrenQueryParams,
  UpdateChildNeedRequest,
  CreateNormalNeedWithdrawProposalRequest,
  CreateSpecialNeedProposalRequest,
  CreateSpecialNeedWithdrawProposalRequest,
  BuildTransactionResponse,
  MessageResponse,
  UrlResponse,
  UploadChildRequest,
  VoteRequest,
  PendingSpecialNeedProposal,
} from '@/src/types/api.types';

type TxOrMessage = BuildTransactionResponse | MessageResponse;

class ChildrenService {
  async list(params?: ChildrenQueryParams) {
    return apiService.get<PaginationResponse<Child[]>>('/children', { params });
  }

  async getById(id: string) {
    return apiService.get<Child>(`/children/${id}`);
  }

  async upload(data: UploadChildRequest) {
    return apiService.post<BuildTransactionResponse>('/children', data);
  }

  // ─── Meal need ─────────────────────────────────────────
  async updateMealNeed(data: UpdateChildNeedRequest) {
    return apiService.put<BuildTransactionResponse>('/children/meal-need', data);
  }

  async createMealWithdrawProposal(data: CreateNormalNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/meal-need/withdraw-proposal', data);
  }

  async supportMealNeed(needId: string, months: number) {
    return apiService.post<UrlResponse>(`/children/meal-need/${needId}/support`, { months });
  }

  async confirmProvideMeal(childId: string, image_blob_id: string) {
    return apiService.post<BuildTransactionResponse>(`/children/${childId}/provide-meal/confirm`, { image_blob_id });
  }

  // ─── Books need ────────────────────────────────────────
  async updateBooksNeed(data: UpdateChildNeedRequest) {
    return apiService.put<BuildTransactionResponse>('/children/books-need', data);
  }

  async createBooksWithdrawProposal(data: CreateNormalNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/books-need/withdraw-proposal', data);
  }

  async supportBooksNeed(needId: string) {
    return apiService.post<UrlResponse>(`/children/books-need/${needId}/support`, null);
  }

  // ─── Health insurance need ─────────────────────────────
  async updateHealthInsuranceNeed(data: UpdateChildNeedRequest) {
    return apiService.put<BuildTransactionResponse>('/children/health-insurance-need', data);
  }

  async createHealthInsuranceWithdrawProposal(data: CreateNormalNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/health-insurance-need/withdraw-proposal', data);
  }

  async supportHealthInsuranceNeed(needId: string) {
    return apiService.post<UrlResponse>(`/children/health-insurance-need/${needId}/support`, null);
  }

  // ─── Special need ──────────────────────────────────────
  async createSpecialNeedProposal(data: CreateSpecialNeedProposalRequest) {
    return apiService.post<PendingSpecialNeedProposal | TxOrMessage>('/children/special-need/proposal', data);
  }

  async voteSpecialNeedProposal(id: string, data: VoteRequest) {
    return apiService.post<BuildTransactionResponse>(`/children/special-need/proposal/${id}/vote`, data);
  }

  async confirmSpecialNeedProposal(id: string) {
    return apiService.post<BuildTransactionResponse>(`/children/special-need/proposal/${id}/confirm`, null);
  }

  async createSpecialNeedWithdrawProposal(data: CreateSpecialNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/special-need/withdraw-proposal', data);
  }

  async supportSpecialNeed(campaignId: string, data: { amount: number; description: string }) {
    return apiService.post<UrlResponse>(`/children/special-need/${campaignId}/support`, data);
  }

  // ─── Metadata ──────────────────────────────────────────
  async addStringMetadata(childId: string, data: { key: string; value: string }) {
    return apiService.put<BuildTransactionResponse>(`/children/metadata/string/${childId}`, data);
  }

  async addNumberMetadata(childId: string, data: { key: string; value: string }) {
    return apiService.put<BuildTransactionResponse>(`/children/metadata/number/${childId}`, data);
  }
}

export const childrenService = new ChildrenService();
