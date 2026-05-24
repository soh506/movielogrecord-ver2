const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(public status: number, message?: string) {
    super(message ?? `API error: ${status}`);
  }
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('access', data.access);
  localStorage.setItem('refresh', data.refresh);
}

export function logout() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

export async function fetchCurrentUser(): Promise<{ id: number; username: string }> {
  return fetchWithAuth('/me/');
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  localStorage.setItem('access', data.access);
  return true;
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const access = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...(extra as Record<string, string>),
  };
}

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const { headers: extraHeaders, ...rest } = options;
  let res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: authHeaders(extraHeaders),
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired');
    }
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: authHeaders(extraHeaders),
    });
  }

  if (!res.ok) throw new ApiError(res.status);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
