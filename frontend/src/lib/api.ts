import { clearAuth, getAccessToken, getRefreshToken, updateAccessToken } from './auth';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

export const API_BASE = rawApiBase.replace(/\/$/, '');

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    return null;
  }

  const response = await fetch(`${API_BASE}/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (!payload?.access) {
    return null;
  }

  updateAccessToken(payload.access);
  return payload.access as string;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  const bodyIsFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!headers.has('Content-Type') && !bodyIsFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !path.startsWith('/login/') && !path.startsWith('/register/')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status !== 401 || !retry || path.startsWith('/token/refresh')) {
    return response;
  }

  const nextAccess = await refreshAccessToken();
  if (!nextAccess) {
    clearAuth();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return apiFetch(path, options, false);
}
