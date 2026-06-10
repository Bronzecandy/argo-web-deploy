import { apiService } from './api.service';
import type {
  BankProfile,
  CreateBankProfileRequest,
  UpdateBankProfileRequest,
} from '@/src/types/api.types';

/** BE trả 400 "Invalid data…" khi ví chưa có hồ sơ ngân hàng — không phải lỗi hệ thống. */
export function isBankProfileMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) return false;
  const res = (error as { response?: { status?: number; data?: { message?: string } } }).response;
  const status = res?.status;
  if (status === 404) return true;
  const msg = String(res?.data?.message ?? '').toLowerCase();
  if (status === 400 && msg.includes('invalid data')) return true;
  if (msg.includes('not found') || msg.includes('no bank')) return true;
  return false;
}

class BankService {
  async create(data: CreateBankProfileRequest) {
    return apiService.post<BankProfile>('/banks', data);
  }

  async getByWallet(walletAddress: string) {
    return apiService.get<BankProfile>(`/banks/user/${walletAddress}`);
  }

  /** Trả `null` khi chưa có hồ sơ; ném lại nếu lỗi thật. */
  async getByWalletOrNull(walletAddress: string): Promise<BankProfile | null> {
    try {
      const res = await this.getByWallet(walletAddress);
      const data = res.data;
      if (!data || typeof data !== 'object' || !('id' in data) || !String(data.id).trim()) {
        return null;
      }
      return data;
    } catch (error) {
      if (isBankProfileMissingError(error)) return null;
      throw error;
    }
  }

  async getById(id: string) {
    return apiService.get<BankProfile>(`/banks/${id}`);
  }

  async update(id: string, data: UpdateBankProfileRequest) {
    return apiService.put<BankProfile>(`/banks/${id}`, data);
  }
}

export const bankService = new BankService();
