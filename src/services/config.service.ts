import { apiService } from './api.service';
import type { UpdateChildEditNeedDatesRequest, BuildTransactionResponse } from '@/src/types/api.types';

class ConfigService {
  async updateBooksNeedEditDates(data: UpdateChildEditNeedDatesRequest) {
    return apiService.put<BuildTransactionResponse>('/configs/books-need-edit-dates', data);
  }

  async updateHealthInsuranceNeedEditDates(data: UpdateChildEditNeedDatesRequest) {
    return apiService.put<BuildTransactionResponse>('/configs/health-insurance-need-edit-dates', data);
  }

  async updateMealNeedEditDates(data: UpdateChildEditNeedDatesRequest) {
    return apiService.put<BuildTransactionResponse>('/configs/meal-need-edit-dates', data);
  }
}

export const configService = new ConfigService();
