import { apiService } from './api.service';
import { API_BASE_URL } from '@/src/lib/constants';

class BlobService {
  async upload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiService.post<{ blob_id: string }>('/blobs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.blob_id;
  }

  getUrl(blobId: string): string {
    if (!blobId) return '';
    return `${API_BASE_URL}/blobs/${blobId}`;
  }
}

export const blobService = new BlobService();
