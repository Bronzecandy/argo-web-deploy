import { unwrapEntityFromGetById } from '@/src/lib/paginationUnwrap';
import { apiService } from './api.service';
import type {
  PaginationResponse,
  RegionsResponse,
  SupportedRegionSuggestion,
  CreateSupportedRegionSuggestionRequest,
  VoteRequest,
  MessageResponse,
} from '@/src/types/api.types';

class RegionService {
  async listRegions() {
    return apiService.get<RegionsResponse>('/regions');
  }

  async listSuggestions(params?: { page?: number; page_size?: number; keyword?: string; created_by?: string; sort_order?: string }) {
    return apiService.get<PaginationResponse<SupportedRegionSuggestion[]>>('/regions/supported-suggestions', { params });
  }

  async adminListSuggestions(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    keyword?: string;
    created_by?: string;
    sort_order?: string;
  }) {
    return apiService.get<PaginationResponse<SupportedRegionSuggestion[]>>('/regions/admin/supported-suggestions', {
      params,
    });
  }

  async getSuggestionById(id: string) {
    const res = await apiService.get<unknown>(`/regions/supported-suggestions/${id}`);
    return { ...res, data: unwrapEntityFromGetById<SupportedRegionSuggestion>(res.data) };
  }

  async createSuggestion(data: CreateSupportedRegionSuggestionRequest) {
    return apiService.post<SupportedRegionSuggestion>('/regions/supported-suggestions', data);
  }

  async reviewSuggestion(id: string, data: VoteRequest) {
    return apiService.post<MessageResponse>(`/regions/supported-suggestions/${id}/review`, data);
  }

  async getUserSuggestions(walletAddress: string, params?: { page?: number; page_size?: number }) {
    return apiService.get<PaginationResponse>(`/regions/user/${walletAddress}/supported-suggestions`, { params });
  }

  /** GET /regions/established — regions that accept child submissions (mobile). */
  async listEstablishedRegions() {
    return apiService.get<string[] | { regions?: string[]; data?: string[] }>('/regions/established');
  }
}

export const regionService = new RegionService();
