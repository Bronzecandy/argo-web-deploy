import { unwrapEntityFromGetById } from '@/src/lib/paginationUnwrap';
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
    const res = await apiService.get<unknown>(`/task-proofs/${id}`);
    return { ...res, data: unwrapEntityFromGetById<TaskProof>(res.data) };
  }

  async submit(taskId: string, image_blob_id: string) {
    return apiService.post<MessageResponse>(`/task-proofs/task/${taskId}/submit`, null, {
      params: { image_blob_id },
    });
  }

  async approve(id: string) {
    return apiService.post<BuildTransactionResponse>(`/task-proofs/${id}/approve`, null);
  }

  async refuse(id: string) {
    return apiService.post<MessageResponse>(`/task-proofs/${id}/refuse`, null);
  }
}

export const taskProofService = new TaskProofService();
