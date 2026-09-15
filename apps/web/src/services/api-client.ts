import type { PaginatedResponse } from '@school-syllabus/types';
import { env } from '@/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

let accessTokenGetter: () => string | null = () => null;

export function setAccessTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (res.ok && data.success && data.data?.accessToken) {
      return data.data.accessToken as string;
    }
  } catch {
    // ignore
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { params, skipAuth, ...init } = options;
  const url = new URL(`${env.apiUrl}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  // Try to get token from auth store first, then fallback to cookies
  let token = skipAuth ? null : accessTokenGetter();
  
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  
  // Only add Content-Type for JSON requests (not for file uploads)
  if (!(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Only add Authorization header if we have a real token from the store
  // The string 'cookie-session' is used as a sentinel in a few places to
  // indicate cookie-based auth — don't send that as a Bearer token.
  if (token && token !== 'cookie-session') headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url.toString(), {
    ...init,
    credentials: 'include',
    headers,
  });

  const data = await response.json();

  if (response.status === 401 && !retried && !skipAuth && !endpoint.includes('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const { useAuthStore } = await import('@/store/auth-store');
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.getState().setAuth(user, newToken);
      return request<T>(endpoint, options, true);
    }
  }

  if (!response.ok || !data.success) {
    let errorMessage = 'Request failed';
    if (typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (data.error) {
      errorMessage = JSON.stringify(data.error);
    } else if (data.message && typeof data.message === 'string') {
      errorMessage = data.message;
    }
    
    console.error(`[API Error] ${response.status} ${endpoint}: ${errorMessage}`);
    throw new ApiError(errorMessage, response.status);
  }

  return data.data as T;
}

function sanitizePayload<T>(val: T): T {
  if (val === null || val === undefined) {
    return undefined as unknown as T;
  }
  if (Array.isArray(val)) {
    return val
      .map(item => sanitizePayload(item))
      .filter(item => item !== undefined && item !== null) as unknown as T;
  }
  if (typeof val === 'object') {
    const res: any = {};
    for (const key of Object.keys(val)) {
      const cleaned = sanitizePayload((val as any)[key]);
      if (cleaned !== undefined && cleaned !== null) {
        res[key] = cleaned;
      }
    }
    return res;
  }
  return val;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  getPaginated: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<PaginatedResponse<T>>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown, skipAuth?: boolean) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(sanitizePayload(body)), skipAuth }),

  postFormData: <T>(endpoint: string, formData: FormData, skipAuth?: boolean) =>
    request<T>(endpoint, { method: 'POST', body: formData, skipAuth }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(sanitizePayload(body)) }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
