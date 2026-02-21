// src/api/addEvidence.ts
import { http } from './http';

export type EvidenceType =
  | 'COURT_ORDER'
  | 'LICENCE_STATUS'
  | 'RECALL_STATUS'
  | 'IMMIGRATION_HOLD'
  | 'WARRANT_CHECK'
  | 'SAFEGUARDING_CHECK'
  | 'OTHER';

export type AddEvidenceRequest = {
  type: EvidenceType;
  value: string;
  source?: string;
};

export async function addEvidence(
  checkId: string,
  body: AddEvidenceRequest,
  role: string,
) {
  const res = await http(`/checks/${checkId}/evidence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rg-role': role,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return await res.json();
}