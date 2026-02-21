// src/api/getEvidence.ts
import { http } from './http';

export async function getEvidence(checkId: string) {
  const res = await http(`/checks/${checkId}/evidence`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch evidence (${res.status}): ${text}`);
  }

  const data: any = await res.json();

  // Support both [] and { items: [] }
  return Array.isArray(data) ? data : data.items ?? [];
}