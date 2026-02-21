export type CheckStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReleaseCheck {
  id: string;
  reference: string;
  status: CheckStatus;
  scheduledReleaseAt: string;
  createdAt: string;
  _count: {
    evidenceItems: number;
    auditRecords: number;
  };
}

export interface ListChecksResponse {
  items: ReleaseCheck[];
  nextCursor: string | null;
}
