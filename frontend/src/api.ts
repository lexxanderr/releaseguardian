const API_BASE = 'http://localhost:3000';

/** Demo data used when backend isn't available (Vercel demo) */
const MOCK_CHECKS = [
  { id: 'EV-CASE-013', status: 'APPROVED', createdAt: '2026-02-20T09:06:00Z' },
  { id: 'EV-CASE-012', status: 'PENDING', createdAt: '2026-02-20T09:04:00Z' },
  { id: 'EV-CASE-011', status: 'PENDING', createdAt: '2026-02-20T09:02:00Z' },
  { id: 'EV-CASE-010', status: 'REJECTED', createdAt: '2026-02-20T09:01:00Z' },
];

export async function api<T>(
  path: string,
  options?: RequestInit & { role?: 'OFFICER' | 'SUPERVISOR' | 'AUDITOR' }
): Promise<T> {
  // ✅ Demo: intercept checks endpoint so Vercel works without backend
  if (path.startsWith('/checks')) {
    return { checks: MOCK_CHECKS, total: MOCK_CHECKS.length } as unknown as T;
  }

  try {
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
  } catch (e) {
    // ✅ If backend is unreachable, keep demo usable instead of hard-failing
    if (path.startsWith('/checks')) {
      return { checks: MOCK_CHECKS, total: MOCK_CHECKS.length } as unknown as T;
    }
    throw e;
  }
}