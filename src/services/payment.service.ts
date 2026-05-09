import { API_BASE_URL } from '@/src/lib/constants';
import { apiService } from './api.service';
import type {
  PaginationResponse,
  Payment,
  PaymentQueryParams,
  DonateRequest,
  PaymentRedirectResponse,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

function resolvePaymentCallbackUrl(callback: string): string {
  const c = callback.trim();
  if (!c) return c;
  if (/^https?:\/\//i.test(c)) return c;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}${c.startsWith('/') ? c : `/${c}`}`;
}

class PaymentService {
  async donate(data: DonateRequest) {
    return apiService.post<PaymentRedirectResponse>('/payments/donate', data);
  }

  async list(params?: PaymentQueryParams) {
    return apiService.get<PaginationResponse<Payment[]>>('/payments', { params });
  }

  async getById(id: string) {
    return apiService.get<Payment>(`/payments/${id}`);
  }

  /** Poll PayOS / payment status (same as GET /payments/:id). */
  async getPaymentStatus(id: string | number) {
    return apiService.get<Payment>(`/payments/${id}`);
  }

  async approve(id: string) {
    return apiService.post<BuildTransactionResponse>(`/payments/${id}/approve`, null);
  }

  async refuse(id: string) {
    return apiService.post<MessageResponse>(`/payments/${id}/refuse`, null);
  }

  /** Manual bank transfer: POST proof blob to `payment_callback` from withdraw confirm response. */
  async submitWithdrawAuthCallback(callbackUrl: string, blobId: string) {
    const url = resolvePaymentCallbackUrl(callbackUrl);
    return apiService.post(url, { blob_id: blobId.trim() });
  }
}

export const paymentService = new PaymentService();
