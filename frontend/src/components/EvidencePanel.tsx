import { useEffect, useState } from 'react';
import { getEvidence } from '../api/getEvidence';

type EvidenceItem = {
  id: string;
  type: string;
  value: any;
  source?: string | null;
  createdAt: string;
  createdBy?: { email?: string } | null;
};

type EvidenceListResponse = {
  items: EvidenceItem[];
  nextCursor?: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function normalizeValue(v: any) {
  if (typeof v === 'string') {
    const t = v.trim();
    // Handles legacy JSON-string rows like "\"https://example.com\""
    if (t.startsWith('"') && t.endsWith('"')) {
      try {
        const parsed = JSON.parse(t);
        return typeof parsed === 'string' ? parsed : v;
      } catch {
        return v;
      }
    }
    return v;
  }
  return v;
}

export function EvidencePanel({
  checkId,
  role,
  refreshKey,
}: {
  checkId: string;
  role: string;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = (await getEvidence(checkId)) as EvidenceListResponse;
        const list = Array.isArray(data) ? (data as any) : data.items ?? [];
        const cleaned = list.map((x: EvidenceItem) => ({
          ...x,
          value: normalizeValue(x.value),
        }));

        if (!cancelled) setItems(cleaned);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load evidence';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [checkId, role, refreshKey]);

  return (
    <section
      style={{
        marginTop: 16,
        padding: 12,
        border: '1px solid #ddd',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <strong>Evidence</strong>
        <span style={{ fontSize: 12, color: '#666' }}>
          {loading ? '…' : items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading evidence…</p>
      ) : error ? (
        <p style={{ marginTop: 12, color: 'crimson' }}>{error}</p>
      ) : items.length === 0 ? (
        <p style={{ marginTop: 12 }}>No evidence yet.</p>
      ) : (
        <ul style={{ marginTop: 12, paddingLeft: 18 }}>
          {items.map((ev) => (
            <li key={ev.id} style={{ marginBottom: 10 }}>
              <div>
                <b>{ev.type}</b>
              </div>

              <div style={{ marginTop: 4 }}>
                {typeof ev.value === 'string' &&
                (ev.value.startsWith('http://') ||
                  ev.value.startsWith('https://')) ? (
                  <a href={ev.value} target="_blank" rel="noreferrer">
                    {ev.value}
                  </a>
                ) : (
                  <span
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  >
                    {String(ev.value)}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Source: {ev.source ?? '—'} · Recorded:{' '}
                {formatDate(ev.createdAt)} · By:{' '}
                {ev.createdBy?.email ?? '—'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
