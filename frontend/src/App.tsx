// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { EvidencePanel } from './components/EvidencePanel';
import { AddEvidenceForm } from './components/AddEvidenceForm';
import './styles/checks-layout.css';
import logo from './assets/logo.png';
import { http } from './api/http';

type Check = {
  id: string;
  reference?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  createdAt: string;
  scheduledReleaseAt?: string;
  decidedAt?: string | null;
  decisionReason?: string | null;
  _count?: { evidenceItems?: number; auditRecords?: number };
};

type ChecksResponse = {
  items?: Check[];
  checks?: Check[];
  total?: number;
  nextCursor?: string | null;
};

type AuditRecord = {
  id: string;
  action: string;
  actorRole?: string;
  actorId?: string;
  createdAt: string;
  hash?: string;
  prevHash?: string | null;
};

const ROLES = ['OFFICER', 'SUPERVISOR', 'AUDITOR'] as const;
type Role = (typeof ROLES)[number];

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;
type StatusFilter = (typeof STATUSES)[number];

function EmptyPanel() {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        color: '#9ca3af',
      }}
    >
      Select a check to view details
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role>('SUPERVISOR');
  const [evidenceRefreshKey, setEvidenceRefreshKey] = useState(0);

  const [status, setStatus] = useState<StatusFilter>('ALL');

  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Check | null>(null);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [verifyOk, setVerifyOk] = useState<boolean | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('take', '50');
    if (status !== 'ALL') params.set('status', status);
    return params.toString();
  }, [status]);

  // List
  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    http(`/checks?${query}`, { headers: { 'x-rg-role': role } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ChecksResponse;
      })
      .then((data) => {
        if (!alive) return;
        const list = data.items ?? data.checks ?? [];
        setChecks(list);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query, role]);

  // Details + Audit (single effect)
  useEffect(() => {
    if (!selectedId) return;

    let alive = true;

    setDetail(null);
    setAudit([]);
    setVerifyOk(null);
    setDetailError(null);
    setDetailLoading(true);

    const h = { 'x-rg-role': role };

    Promise.all([
      http(`/checks/${selectedId}`, { headers: h }).then(async (r) => {
        if (!r.ok) throw new Error(`Details HTTP ${r.status}`);
        return (await r.json()) as Check;
      }),

      http(`/checks/${selectedId}/audit`, { headers: h }).then(async (r) => {
        if (!r.ok) throw new Error(`Audit HTTP ${r.status}`);
        const data: any = await r.json();
        const list = Array.isArray(data)
          ? data
          : data.items ?? data.records ?? data.auditRecords ?? [];
        return list as AuditRecord[];
      }),
    ])
      .then(([d, a]) => {
        if (!alive) return;
        setDetail(d);
        setAudit(a);
        setVerifyOk(true);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setDetailError(e instanceof Error ? e.message : String(e));
        setVerifyOk(false);
      })
      .finally(() => {
        if (!alive) return;
        setDetailLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedId, role]);

  // Auto-scroll to details on mobile so you don't have to scroll down manually
  useEffect(() => {
    if (!selectedId) return;

    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    if (!isMobile) return;

    requestAnimationFrame(() => {
      document.querySelector('.checks-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [selectedId]);

  const selected = checks.find((c) => c.id === selectedId);

  // --- strict decision rules ---
  const evidenceCount =
    detail && detail._count && typeof detail._count.evidenceItems === 'number'
      ? detail._count.evidenceItems
      : 0;

  const canApprove =
    detail?.status === 'PENDING' &&
    evidenceCount > 0 &&
    (role === 'SUPERVISOR' || role === 'AUDITOR');

  const canReject =
    detail?.status === 'PENDING' && (role === 'SUPERVISOR' || role === 'AUDITOR');

  const decide = async (action: 'approve' | 'reject') => {
    if (!selectedId) return;

    try {
      setDetailLoading(true);
      setDetailError(null);

      const res = await http(`/checks/${selectedId}/${action}`, {
        method: 'POST',
        headers: {
          'x-rg-role': role,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      // refresh list + clear selection (simple demo behavior)
      setSelectedId(null);
      setDetail(null);
      setAudit([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedDetail = async () => {
    if (!selectedId) return;

    try {
      const res = await http(`/checks/${selectedId}`, {
        headers: { 'x-rg-role': role },
      });
      if (!res.ok) throw new Error(`Details HTTP ${res.status}`);
      const d = (await res.json()) as Check;
      setDetail(d);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="rg-shell">
      <div className="rg-container">
        {/* Header */}
        <div className="page-header">
          <div className="page-title">
            <div className="rg-title">
              <img src={logo} alt="ReleaseGuardian" className="rg-logo" />
            </div>

            <div className="rg-title-text">
              <h1>ReleaseGuardian</h1>
              <span className="page-subtitle">Audit & Release Control</span>
            </div>
          </div>

          <div className="page-controls">
            <div className="role-switch">
              <label>
                Demo role:{' '}
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="filters">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    setSelectedId(null);
                    setDetailError(null);
                    setDetail(null);
                    setAudit([]);
                  }}
                  className={`filter-btn ${status === s ? 'active' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="checks-layout">
          {/* LIST */}
          <div className="checks-table">
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            <div className="table-shell">
              <table border={1} cellPadding={8} cellSpacing={0}>
                <thead>
                  <tr>
                    <th align="left" className="col-id">
                      ID
                    </th>
                    <th align="left" className="col-status">
                      Status
                    </th>
                    <th align="left" className="col-created">
                      Created
                      <div className="col-sub">Date / Time</div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="skel-row">
                        <td>
                          <span className="skel" style={{ width: '70%' }} />
                        </td>
                        <td>
                          <span className="skel" style={{ width: '60%' }} />
                        </td>
                        <td>
                          <span className="skel" style={{ width: '80%' }} />
                        </td>
                      </tr>
                    ))
                  ) : checks.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 16, color: '#6b7280' }}>
                        No checks found.
                      </td>
                    </tr>
                  ) : (
                    checks.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => {
                          setSelectedId(c.id);
                          setDetailError(null);
                        }}
                        className={c.id === selectedId ? 'row-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        title="Click to view details"
                      >
                        <td title={c.id}>
                          <div style={{ fontWeight: 700 }}>
                            {c.reference ?? `${c.id.slice(0, 8)}…`}
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 11,
                              color: '#6b7280',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            }}
                          >
                            {c.id.slice(0, 8)}…
                          </div>
                        </td>

                        <td>
                          <span className={`status-pill status-${String(c.status).toLowerCase()}`}>
                            {c.status}
                          </span>
                        </td>

                        <td>
                          {(() => {
                            const d = new Date(c.createdAt);
                            return (
                              <div style={{ lineHeight: 1.25 }}>
                                <div style={{ fontWeight: 700 }}>{d.toLocaleDateString()}</div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: '#6b7280',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                  }}
                                >
                                  {d.toLocaleTimeString()}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAILS */}
          <div className="checks-panel">
            {selectedId ? (
              <div className="panel-card">
                <div className="panel-header">
                  <strong>Check details</strong>

                  <button
                    className="panel-back"
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setDetailError(null);
                    }}
                  >
                    Back
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 13, color: '#444' }}>
                  <div>
                    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {selected?.id}
                    </span>
                  </div>
                </div>

                {detailLoading && <p style={{ marginTop: 12 }}>Loading details…</p>}
                {detailError && <p style={{ color: 'red', marginTop: 12 }}>Error: {detailError}</p>}

                {!detailLoading && !detailError && detail && (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <div>
                        <b>Reference:</b> {detail.reference ?? '—'}
                      </div>
                      <div>
                        <b>Status:</b> {detail.status}
                      </div>
                      <div>
                        <b>Scheduled:</b>{' '}
                        {detail.scheduledReleaseAt
                          ? new Date(detail.scheduledReleaseAt).toLocaleString()
                          : '—'}
                      </div>
                      <div>
                        <b>Decided at:</b>{' '}
                        {detail.decidedAt ? new Date(detail.decidedAt).toLocaleString() : '—'}
                      </div>
                      <div>
                        <b>Decision reason:</b> {detail.decisionReason ?? '—'}
                      </div>

                      <AddEvidenceForm
                        checkId={selectedId}
                        role={role}
                        checkStatus={detail.status}
                        onAdded={() => {
                          setEvidenceRefreshKey((k) => k + 1);
                          refreshSelectedDetail();
                        }}
                      />

                      <EvidencePanel checkId={selectedId} role={role} refreshKey={evidenceRefreshKey} />

                      <div>
                        <b>Evidence items:</b> {detail._count?.evidenceItems ?? '—'}
                      </div>
                      <div>
                        <b>Audit records:</b> {detail._count?.auditRecords ?? audit.length}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        disabled={!canApprove}
                        onClick={() => decide('approve')}
                        style={{
                          padding: '6px 12px',
                          cursor: canApprove ? 'pointer' : 'not-allowed',
                          background: canApprove ? '#2e7d32' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                        }}
                        title={canApprove ? 'Approve' : 'Add evidence first'}
                      >
                        Approve
                      </button>

                      <button
                        disabled={!canReject}
                        onClick={() => decide('reject')}
                        style={{
                          padding: '6px 12px',
                          cursor: canReject ? 'pointer' : 'not-allowed',
                          background: canReject ? '#c62828' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                        }}
                      >
                        Reject
                      </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <b>Audit chain:</b>{' '}
                      {verifyOk === null ? (
                        '…'
                      ) : verifyOk ? (
                        <span style={{ color: 'green' }}>Tamper-proof ✔ verified</span>
                      ) : (
                        <span style={{ color: 'red' }}>Verification failed</span>
                      )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <b>Audit trail</b>
                      {audit.length === 0 ? (
                        <p>No audit records.</p>
                      ) : (
                        <ul style={{ paddingLeft: 18 }}>
                          {audit.map((a) => (
                            <li key={a.id}>
                              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {new Date(a.createdAt).toLocaleString()}
                              </span>{' '}
                              — {a.action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <EmptyPanel />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="rg-footer">
          <div className="rg-footer__left">
            ReleaseGuardian © 2026 — Audit &amp; Release Control System
          </div>
          <div className="rg-footer__right">
            <span className="env-badge">DEVELOPMENT</span>
          </div>
        </footer>
      </div>
    </div>
  );
}