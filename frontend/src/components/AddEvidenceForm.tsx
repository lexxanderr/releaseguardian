import { useMemo, useState } from 'react';
import { addEvidence } from '../api/addEvidence';

const EVIDENCE_TYPES = [
  'COURT_ORDER',
  'LICENCE_STATUS',
  'RECALL_STATUS',
  'IMMIGRATION_HOLD',
  'WARRANT_CHECK',
  'SAFEGUARDING_CHECK',
  'OTHER',
] as const;

type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export function AddEvidenceForm({
  checkId,
  role,
  checkStatus,
  onAdded,
}: {
  checkId: string;
  role: string;
  checkStatus: string;
  onAdded: () => void;
}) {
  const isOfficer = role === 'OFFICER';

  const [type, setType] = useState<EvidenceType>('OTHER');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return isOfficer && checkStatus === 'PENDING' && value.trim().length > 0 && !saving;
  }, [isOfficer, checkStatus, value, saving]);

  // HARD GUARD — never render unless allowed
  if (!isOfficer || checkStatus !== 'PENDING') return null;

  return (
    <section
      style={{
        marginTop: 16,
        padding: 12,
        border: '1px solid #ddd',
        borderRadius: 8,
      }}
    >
      <h3 style={{ margin: 0 }}>Add Evidence (OFFICER)</h3>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <label>
          <div>Type</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EvidenceType)}
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div>Value (required)</div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://example.com/report or free text"
          />
        </label>

        <label>
          <div>Source</div>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="manual"
          />
        </label>

        {error && <div style={{ color: 'crimson' }}>{error}</div>}

        <button
          disabled={!canSubmit}
          onClick={async () => {
            try {
              setSaving(true);
              setError(null);

              await addEvidence(
                checkId,
                { type, value: value.trim(), source },
                role
              );

              // reset only what matters
              setValue('');
              onAdded();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Failed to add evidence');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving…' : 'Add evidence'}
        </button>
      </div>
    </section>
  );
}
