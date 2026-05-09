import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/src/lib/constants';

/** First request + up to MAX_500_RETRIES retries when the server returns HTTP 500 */
const MAX_500_RETRIES = 5;
const RETRY_500_BASE_DELAY_MS = 500;

type RequestConfigWithRetry = InternalAxiosRequestConfig & { __retryCount500?: number };

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private logFinal500Failure(error: AxiosError, config: RequestConfigWithRetry) {
    const method = (config.method ?? 'GET').toUpperCase();
    const base = config.baseURL ?? '';
    const url = typeof config.url === 'string' ? config.url : '';
    const fullUrl = `${base}${url}`;
    console.error(
      `[API] Still getting HTTP 500 after ${MAX_500_RETRIES + 1} attempt(s):`,
      method,
      fullUrl,
      'response:',
      error.response?.data ?? error.response?.statusText,
      'raw:',
      error.message,
    );
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RequestConfigWithRetry | undefined;

        if (error.response?.status === 500 && config) {
          const retriesSoFar = config.__retryCount500 ?? 0;
          if (retriesSoFar < MAX_500_RETRIES) {
            config.__retryCount500 = retriesSoFar + 1;
            const delayMs = RETRY_500_BASE_DELAY_MS * 2 ** retriesSoFar;
            await new Promise<void>((resolve) => {
              setTimeout(resolve, delayMs);
            });
            return this.axiosInstance.request(config);
          }
          this.logFinal500Failure(error, config);
        }

        if (error.response?.status === 401) {
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      },
    );
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    }
  }

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

export const apiService = new ApiService();
