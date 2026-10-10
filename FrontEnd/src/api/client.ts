/**
 * lawagent.api REST 与 SSE 客户端基础设施
 * 遵循技术方案第3.4节与第7.4节安全规范（Bearer令牌鉴权、案件归属校验、429限流与超时治理）
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(status: number, message: string, code?: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

const DEFAULT_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
const DEFAULT_TOKEN = 'token_practitioner_demo_secret_2026';

export function isBackendConfigured(): boolean {
  return Boolean((import.meta as any).env?.VITE_API_BASE_URL);
}

let currentAuthToken = DEFAULT_TOKEN;

export function setAuthToken(token: string) {
  currentAuthToken = token;
}

export function getAuthToken(): string {
  return currentAuthToken;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 25000, params, headers, ...customConfig } = options;

  let url = `${DEFAULT_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) searchParams.append(key, String(val));
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${currentAuthToken}`,
    ...((headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: mergedHeaders,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new ApiError(
        404,
        '接口返回了 HTML 页面（SPA 前端路由回退），当前独立前端尚未挂载后端服务',
        'HTML_SPA_FALLBACK'
      );
    }

    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      let errorMsg = `接口请求失败 (${response.status})`;
      if (typeof data === 'object' && data !== null) {
        errorMsg = data.detail || data.message || errorMsg;
      }
      if (response.status === 401) {
        errorMsg = '身份令牌无效或已过期，请重新配置访问凭证';
      } else if (response.status === 403) {
        errorMsg = '当前角色权限不足，无法执行该操作 (403 Forbidden)';
      } else if (response.status === 404) {
        errorMsg = '所请求的案件数据不存在或不归属当前主体 (404 Not Found)';
      } else if (response.status === 429) {
        errorMsg = '超出系统请求频次限制，请稍后重试 (429 Too Many Requests)';
      }
      throw new ApiError(response.status, errorMsg, data?.code, JSON.stringify(data));
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new ApiError(408, `请求超时（${timeoutMs}ms），请检查网络连接或服务器负载`);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, err.message || '网络连接异常，无法访问德国法查明服务');
  }
}
