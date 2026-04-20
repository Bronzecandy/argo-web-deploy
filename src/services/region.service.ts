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
    return apiService.get<SupportedRegionSuggestion>(`/regions/supported-suggestions/${id}`);
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
}

export const regionService = new RegionService();
