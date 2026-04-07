import { apiService } from './api.service';
import type { UpdateChildEditNeedDatesRequest, MessageResponse } from '@/src/types/api.types';

class ConfigService {
  async getEditNeedDates() {
    return apiService.get('/configs/edit-need-dates');
  }

  async updateEditNeedDates(data: UpdateChildEditNeedDatesRequest) {
    return apiService.put<MessageResponse>('/configs/edit-need-dates', data);
  }

  async getBlobStore() {
    return apiService.get('/configs/blob-store');
  }

  async getAllConfigs() {
    return apiService.get('/configs');
  }
}

export const configService = new ConfigService();
