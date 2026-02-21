export type EvidenceListResponse = {
  items: Array<{
    id: string;
    checkId: string;
    type: string;
    value: string;
    source: string | null;
    createdAt: string;
    createdById: string;
    createdBy?: { id: string; email: string; role: string } | null;
  }>;
  nextCursor: string | null;
};

export async function getEvidence(checkId: string): Promise<EvidenceListResponse> {
  const res = await fetch('/checks/' + checkId + '/evidence');

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('Failed to fetch evidence (' + res.status + '): ' + text);
  }

  return res.json();
}
