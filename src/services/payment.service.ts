import { apiService } from './api.service';
import type { DonateRequest, UrlResponse } from '@/src/types/api.types';

class PaymentService {
  async donate(data: DonateRequest) {
    return apiService.post<UrlResponse>('/payments/donate', data);
  }

  async authCallback(id: string, imageBlobId: string) {
    return apiService.get(`/payments/auth-callback/${id}`, { params: { imageBlobId } });
  }

  async callback(id: string) {
    return apiService.get(`/payments/callback/${id}`);
  }
}

export const paymentService = new PaymentService();
