import { apiService } from './api.service';

export interface BookNeed {
  id: string;
  child_id: string;
  value: number;
  pool_id: string;
  pool_name: string;
  balance: number;
  total_donation: number;
  total_withdraw: number;
  updated_at: string;
}

export interface HealthInsuranceNeed {
  id: string;
  child_id: string;
  value: number;
  pool_id: string;
  pool_name: string;
  balance: number;
  total_donation: number;
  total_withdraw: number;
  updated_at: string;
}

export interface MealNeed {
  id: string;
  child_id: string;
  value: number;
  remaining_months: number;
  pool_id: string;
  pool_name: string;
  balance: number;
  total_donation: number;
  total_withdraw: number;
  updated_at: string;
}

class ChildNeedsService {
  async getBooksNeed(id: string) {
    return apiService.get<BookNeed>(`/child-needs/books-need/${id}`);
  }

  async getHealthInsuranceNeed(id: string) {
    return apiService.get<HealthInsuranceNeed>(`/child-needs/health-insurance-need/${id}`);
  }

  async getMealNeed(id: string) {
    return apiService.get<MealNeed>(`/child-needs/meal-need/${id}`);
  }
}

export const childNeedsService = new ChildNeedsService();
