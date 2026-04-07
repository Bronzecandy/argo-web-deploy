import { apiService } from './api.service';
import type {
  PaginationResponse,
  TransactionRecord,
  TxRecordQueryParams,
  ExecuteTransactionRequest,
} from '@/src/types/api.types';

class TransactionService {
  async list(params?: TxRecordQueryParams) {
    return apiService.get<PaginationResponse<TransactionRecord[]>>('/tx-records', { params });
  }

  async getById(id: string) {
    return apiService.get<TransactionRecord>(`/tx-records/${id}`);
  }

  async execute(data: ExecuteTransactionRequest) {
    return apiService.post('/tx/execute', data);
  }
}

export const transactionService = new TransactionService();
