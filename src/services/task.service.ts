import { apiService } from './api.service';
import type {
  PaginationResponse,
  Task,
  TaskQueryParams,
  BuildTransactionResponse,
} from '@/src/types/api.types';

class TaskService {
  async list(params?: TaskQueryParams) {
    return apiService.get<PaginationResponse<Task[]>>('/tasks', { params });
  }

  async getById(id: string) {
    return apiService.get<Task>(`/tasks/${id}`);
  }

  async create(data: { description: string; region: string; start_period: string; end_period: string }) {
    return apiService.post<Task>('/tasks', data);
  }
}

export const taskService = new TaskService();
