import { apiService } from './api.service';
import type {
  BankProfile,
  CreateBankProfileRequest,
  UpdateBankProfileRequest,
} from '@/src/types/api.types';

class BankService {
  async create(data: CreateBankProfileRequest) {
    return apiService.post<BankProfile>('/banks', data);
  }

  async getByWallet(walletAddress: string) {
    return apiService.get<BankProfile>(`/banks/user/${walletAddress}`);
  }

  async getById(id: string) {
    return apiService.get<BankProfile>(`/banks/${id}`);
  }

  async update(id: string, data: UpdateBankProfileRequest) {
    return apiService.put<BankProfile>(`/banks/${id}`, data);
  }
}

export const bankService = new BankService();
