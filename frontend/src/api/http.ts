// src/api/http.ts
type MockCheck = { id: string; status: string; createdAt: string };

const MOCK_CHECKS: MockCheck[] = [
  { id: 'EV-CASE-013', status: 'APPROVED', createdAt: '2026-02-20T09:06:00Z' },
  { id: 'EV-CASE-012', status: 'PENDING', createdAt: '2026-02-20T09:04:00Z' },
  { id: 'EV-CASE-011', status: 'PENDING', createdAt: '2026-02-20T09:02:00Z' },
  { id: 'EV-CASE-010', status: 'REJECTED', createdAt: '2026-02-20T09:01:00Z' },
];

type EvidenceItem = any;
const DEMO_STORE: Record<string, EvidenceItem[]> =
  (globalThis as any).__RG_DEMO_EVIDENCE_STORE ?? {};
(globalThis as any).__RG_DEMO_EVIDENCE_STORE = DEMO_STORE;

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function matchCheckId(url: string) {
  const m = url.match(/^\/checks\/([^/?#]+)/);
  return m?.[1] ?? null;
}

export async function http(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input.toString();
  const method = (init?.method ?? 'GET').toUpperCase();

  // Try real backend first
  try {
    const res = await fetch(input, init);
    if (res.ok) return res;
    if (res.status !== 404) return res;
  } catch {}

  // --------------------
  // DEMO MODE FALLBACKS
  // --------------------

  // LIST: /checks?status=PENDING
  if (method === 'GET' && url.startsWith('/checks?')) {
    const u = new URL(url, window.location.origin);
    const status = u.searchParams.get('status');

    const filtered =
      status && status !== 'ALL'
        ? MOCK_CHECKS.filter((c) => c.status === status)
        : MOCK_CHECKS;

    return jsonResponse({ checks: filtered, total: filtered.length });
  }

  const id = matchCheckId(url);

  // DETAILS
  if (method === 'GET' && id && !url.includes('/audit') && !url.includes('/evidence')) {
    const found = MOCK_CHECKS.find((c) => c.id === id) ?? MOCK_CHECKS[0];
    return jsonResponse({
      ...found,
      reference: found.id,
      scheduledReleaseAt: null,
      decidedAt: null,
      decisionReason: null,
      _count: {
        evidenceItems: DEMO_STORE[found.id]?.length ?? 0,
        auditRecords: 2,
      },
    });
  }

  // AUDIT
  if (method === 'GET' && id && url.endsWith('/audit')) {
    const found = MOCK_CHECKS.find((c) => c.id === id) ?? MOCK_CHECKS[0];
    return jsonResponse({
      items: [
        { id: 'AR-1', action: 'CREATED', createdAt: found.createdAt },
        { id: 'AR-2', action: String(found.status), createdAt: found.createdAt },
      ],
    });
  }

  // EVIDENCE GET
  if (method === 'GET' && id && url.includes('/evidence')) {
    return jsonResponse({ items: DEMO_STORE[id] ?? [] });
  }

  // EVIDENCE POST
  if (method === 'POST' && id && url.includes('/evidence')) {
    let body: any = {};
    try {
      body = init?.body ? JSON.parse(String(init.body)) : {};
    } catch {}

    const item = {
      id: `EV-${id}-${Date.now()}`,
      type: body.type ?? 'OTHER',
      value: body.value ?? '',
      source: body.source ?? 'manual',
      createdAt: new Date().toISOString(),
      actorRole: 'OFFICER',
      actorId: 'demo-user',
    };

    const arr = DEMO_STORE[id] ?? (DEMO_STORE[id] = []);
    arr.unshift(item);

    return jsonResponse({ ok: true, item }, 201);
  }

  // APPROVE / REJECT
  if (method === 'POST' && id && (url.endsWith('/approve') || url.endsWith('/reject'))) {
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ message: 'Demo endpoint not implemented', url }, 404);
}