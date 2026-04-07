import { apiService } from './api.service';
import type { DonateRequest, UrlResponse } from '@/src/types/api.types';

class PaymentService {
  async donate(data: DonateRequest) {
    return apiService.post<UrlResponse>('/payments/donate', data);
  }

  async generatePaymentUrl(data: DonateRequest) {
    return apiService.post<UrlResponse>('/payments/generate-url', data);
  }

  async generateRegistrationPaymentUrl(registrationId: string) {
    return apiService.post<UrlResponse>(`/payments/registration/${registrationId}`);
  }
}

export const paymentService = new PaymentService();
