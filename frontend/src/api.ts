const API_BASE = 'http://localhost:3000';

export async function api<T>(
  path: string,
  options?: RequestInit & { role?: 'OFFICER' | 'SUPERVISOR' | 'AUDITOR' }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.role ? { 'x-rg-role': options.role } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}
