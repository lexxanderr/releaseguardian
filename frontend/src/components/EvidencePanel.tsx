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

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeValue(value: any) {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function displayValue(value: any) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}

function EvidenceValue({ value }: { value: any }) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return (
      <div className="evidence-fields">
        {Object.entries(value).map(([key, fieldValue]) => (
          <div className="evidence-field" key={key}>
            <span className="evidence-field__label">
              {formatLabel(key)}
            </span>

            <span className="evidence-field__value">
              {displayValue(fieldValue)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  ) {
    return (
      <a
        className="evidence-link"
        href={value}
        target="_blank"
        rel="noreferrer"
      >
        {value}
      </a>
    );
  }

  return <span className="evidence-simple-value">{displayValue(value)}</span>;
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

        const cleaned = list.map((item: EvidenceItem) => ({
          ...item,
          value: normalizeValue(item.value),
        }));

        if (!cancelled) {
          setItems(cleaned);
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Failed to load evidence';

        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [checkId, role, refreshKey]);

  return (
    <section className="evidence-list">
      <div className="evidence-list__header">
        <div>
          <div className="evidence-list__eyebrow">VERIFICATION RECORDS</div>
          <strong>Recorded evidence</strong>
        </div>

        <span className="evidence-list__total">
          {loading ? '…' : items.length}
        </span>
      </div>

      {loading ? (
        <div className="evidence-empty">Loading evidence…</div>
      ) : error ? (
        <div className="evidence-empty evidence-empty--error">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="evidence-empty evidence-empty--no-records">
          <div className="evidence-empty__icon">＋</div>
          <strong>No evidence recorded</strong>
          <span>
            Evidence must be recorded before this release can be approved.
          </span>
        </div>
      ) : (
        <div className="evidence-records">
          {items.map((ev) => (
            <article className="evidence-record" key={ev.id}>
              <div className="evidence-record__top">
                <div className="evidence-record__icon">✓</div>

                <div>
                  <div className="evidence-record__type">
                    {formatLabel(ev.type)}
                  </div>
                  <div className="evidence-record__verified">
                    Evidence recorded
                  </div>
                </div>
              </div>

              <EvidenceValue value={ev.value} />

              <div className="evidence-record__meta">
                <div>
                  <span>Source</span>
                  <strong>{ev.source ?? '—'}</strong>
                </div>

                <div>
                  <span>Recorded</span>
                  <strong>{formatDate(ev.createdAt)}</strong>
                </div>

                <div>
                  <span>Recorded by</span>
                  <strong>{ev.createdBy?.email ?? '—'}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
