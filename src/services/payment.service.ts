import { apiService } from './api.service';
import type {
  PaginationResponse,
  Payment,
  PaymentQueryParams,
  DonateRequest,
  UrlResponse,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

class PaymentService {
  async donate(data: DonateRequest) {
    return apiService.post<UrlResponse>('/payments/donate', data);
  }

  async list(params?: PaymentQueryParams) {
    return apiService.get<PaginationResponse<Payment[]>>('/payments', { params });
  }

  async getById(id: string) {
    return apiService.get<Payment>(`/payments/${id}`);
  }

  async approve(id: string) {
    return apiService.post<BuildTransactionResponse>(`/payments/${id}/approve`, null);
  }

  async refuse(id: string) {
    return apiService.post<MessageResponse>(`/payments/${id}/refuse`, null);
  }
}

export const paymentService = new PaymentService();
