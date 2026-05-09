import { unwrapEntityFromGetById } from '@/src/lib/paginationUnwrap';
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
    const res = await apiService.get<unknown>(`/tasks/${id}`);
    return { ...res, data: unwrapEntityFromGetById<Task>(res.data) };
  }

  async create(data: { description: string; region: string; start_period: string; end_period: string }) {
    return apiService.post<PaginationResponse>('/tasks', null, { params: data });
  }

  async claim(id: string) {
    return apiService.post<MessageResponse>(`/tasks/${id}/claim`, null);
  }

  /** GET /tasks/staff/{wallet} — tasks assigned to this volunteer (mobile Update screen). */
  async listStaffByWallet(walletAddress: string) {
    return apiService.get<Task[] | PaginationResponse<Task[]>>(`/tasks/staff/${walletAddress}`);
  }

  async review(id: string, is_vote_yes: boolean, refuse_reason?: string) {
    const params: Record<string, any> = { is_vote_yes };
    if (refuse_reason) params.refuse_reason = refuse_reason;
    return apiService.post<MessageResponse>(`/tasks/${id}/review`, null, { params });
  }
}

export const taskService = new TaskService();
