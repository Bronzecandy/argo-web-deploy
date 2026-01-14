// src/services/user.service.ts

import { apiService } from "./api.services";


export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

class UserService {
  async getProfile(): Promise<User> {
    const response = await apiService.get<User>('/users/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiService.put<User>('/users/profile', data);
    return response.data;
  }

  async getAllUsers(): Promise<User[]> {
    const response = await apiService.get<User[]>('/users');
    return response.data;
  }
}

export const userService = new UserService();