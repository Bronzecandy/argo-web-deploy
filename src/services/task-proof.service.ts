import { apiService } from './api.service';
import type {
  PaginationResponse,
  TaskProof,
  TaskProofQueryParams,
  BuildTransactionResponse,
  MessageResponse,
} from '@/src/types/api.types';

class TaskProofService {
  async list(params?: TaskProofQueryParams) {
    return apiService.get<PaginationResponse<TaskProof[]>>('/task-proofs', { params });
  }

  async getById(id: string) {
    return apiService.get<TaskProof>(`/task-proofs/${id}`);
  }

  async submit(taskId: string, image_blob_id: string) {
    return apiService.post<MessageResponse>(`/task-proofs/task/${taskId}/submit`, undefined, {
      params: { image_blob_id },
    });
  }

  async approve(id: string) {
    return apiService.post<BuildTransactionResponse>(`/task-proofs/${id}/approve`);
  }

  async refuse(id: string) {
    return apiService.post<MessageResponse>(`/task-proofs/${id}/refuse`);
  }
}

export const taskProofService = new TaskProofService();
