import { apiService } from './api.service';
import type { LeaderPoolDetail } from '@/src/types/api.types';

class PoolService {
  async getLeaderPool(walletAddress: string) {
    return apiService.get<LeaderPoolDetail>(`/pools/leader/${walletAddress}`);
  }
}

export const poolService = new PoolService();
