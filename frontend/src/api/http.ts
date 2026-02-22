// src/api/http.ts

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() ||
  (import.meta as any).env?.VITE_API_BASE_URL?.trim?.() ||
  ""; // empty = same-origin

export function http(path: string, init: RequestInit = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path;

  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });
}