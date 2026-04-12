import { apiService } from './api.service';
import type {
  PaginationResponse,
  Task,
  TaskQueryParams,
  MessageResponse,
} from '@/src/types/api.types';

class TaskService {
  async list(params?: TaskQueryParams) {
    return apiService.get<PaginationResponse<Task[]>>('/tasks', { params });
  }

  async getById(id: string) {
    return apiService.get<Task>(`/tasks/${id}`);
  }

  async create(data: { description: string; region: string; start_period: string; end_period: string }) {
    return apiService.post<PaginationResponse>('/tasks', undefined, { params: data });
  }

  async claim(id: string) {
    return apiService.post<MessageResponse>(`/tasks/${id}/claim`);
  }

  async review(id: string, is_vote_yes: boolean, refuse_reason?: string) {
    return apiService.post<MessageResponse>(`/tasks/${id}/review`, undefined, {
      params: { is_vote_yes, refuse_reason },
    });
  }
}

export const taskService = new TaskService();
