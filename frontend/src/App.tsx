// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { EvidencePanel } from './components/EvidencePanel';
import { AddEvidenceForm } from './components/AddEvidenceForm';
import './styles/checks-layout.css';
import './styles/mobile-fixes.css';
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
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  // Split list errors vs search errors (keeps UX clean)
  const [listError, setListError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [searchId, setSearchId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [detail, setDetail] = useState<Check | null>(null);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [verifyOk, setVerifyOk] = useState<boolean | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [evidenceRefreshKey, setEvidenceRefreshKey] = useState(0);

  // NEW: Evidence UI controls
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(false);
  const [evidenceFocus, setEvidenceFocus] = useState(false);

  // Apply focus mode to body (CSS widens right column)
  useEffect(() => {
    document.body.classList.toggle('rg-evidence-focus', evidenceFocus);
    return () => {
      document.body.classList.remove('rg-evidence-focus');
    };
  }, [evidenceFocus]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('take', '50');
    if (status !== 'ALL') params.set('status', status);
    return params.toString();
  }, [status]);

  const handleSearch = () => {
    const raw = searchId.trim();
    if (!raw) {
      setSearchError('Enter Prisoner / Case ID');
      return;
    }

    setSearchError(null);
    setDetailError(null);

    const needle = raw.toLowerCase();
    const getIdStr = (c: any) => String(c?.id ?? '').toLowerCase();
    const getRefStr = (c: any) => String(c?.reference ?? '').toLowerCase();

    // Exact match by reference OR id
    let match =
      checks.find((c: any) => getRefStr(c) === needle) ??
      checks.find((c: any) => getIdStr(c) === needle);

    // Partial match (demo friendly)
    if (!match) {
      match =
        checks.find((c: any) => getRefStr(c).includes(needle)) ??
        checks.find((c: any) => getIdStr(c).includes(needle));
    }

    if (match) {
      setSelectedId(match.id);
      return;
    }

    setSearchError(`No release checks found for: ${raw}`);
  };

  // List
  useEffect(() => {
    let alive = true;

    setLoading(true);
    setListError(null);

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
        setListError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query, role]);

  // Details + Audit
  useEffect(() => {
    if (!selectedId) return;

    let alive = true;

    setDetail(null);
    setAudit([]);
    setVerifyOk(null);
    setDetailError(null);
    setDetailLoading(true);

    // When you open a new check, reset evidence UI
    setEvidenceCollapsed(false);
    setEvidenceFocus(false);

    const h = { 'x-rg-role': role };

    Promise.all([
      http(`/checks/${selectedId}`, { headers: h }).then(async (r) => {
        if (!r.ok) throw new Error(`Details HTTP ${r.status}`);
        return (await r.json()) as Check;
      }),
      http(`/checks/${selectedId}/audit`, { headers: h }).then(async (r) => {
        if (!r.ok) throw new Error(`Audit HTTP ${r.status}`);
        const data: any = await r.json();
        const list = Array.isArray(data) ? data : data.items ?? data.records ?? data.auditRecords ?? [];
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

  // Auto-scroll to details on mobile
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

  const evidenceCount =
    detail && detail._count && typeof detail._count.evidenceItems === 'number'
      ? detail._count.evidenceItems
      : 0;

  const canApprove =
    detail?.status === 'PENDING' &&
    evidenceCount > 0 &&
    (role === 'SUPERVISOR' || role === 'AUDITOR');

  const canReject = detail?.status === 'PENDING' && (role === 'SUPERVISOR' || role === 'AUDITOR');

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
        <div className="page-header rg-header">
          {/* LEFT: Brand */}
          <div className="rg-header__left">
            <div className="page-title">
              <div className="rg-title">
                <img src={logo} alt="ReleaseGuardian" className="rg-logo" />
              </div>

              <div className="rg-title-text">
                <h1>ReleaseGuardian</h1>
                <span className="page-subtitle">Audit &amp; Release Control</span>
              </div>
            </div>
          </div>

          {/* CENTER: Search */}
          <div className="rg-header__center">
            <form
              className="rg-searchcard"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <div className="rg-searchcard__top">
                <div className="rg-searchcard__title">Start new search</div>
                <div className="rg-searchcard__hint">Jump straight to a case or evidence ID</div>
              </div>

              <div className="rg-searchrow">
                <input
                  className="rg-searchinput"
                  placeholder="Enter Prisoner / Case ID"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                />
                <button className="rg-searchbtn" type="submit">
                  Retrieve
                </button>
              </div>

              {searchError && <div className="rg-header-error">Error: {searchError}</div>}
            </form>
          </div>

          {/* RIGHT: Filters + Role */}
          <div className="rg-header__right">
            <div className="rg-filtersblock">
              <div className="rg-filtersmeta">
                <div className="rg-filterstitle">Release status</div>
                <div className="rg-filtershint">Filter cases by decision state</div>
              </div>

              <div className="filters rg-filters">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`filter-btn ${status === s ? 'active' : ''}`}
                    onClick={() => {
                      setStatus(s);
                      setSelectedId(null);
                      setDetail(null);
                      setDetailError(null);
                      setAudit([]);
                      setSearchError(null);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="role-switch rg-rolepill">
              <label>
                Demo role:
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="checks-layout">
          {/* LIST */}
          <div className="checks-table">
            {listError && <p style={{ color: 'red' }}>Error: {listError}</p>}

            <div className="table-shell">
              <table cellPadding={8} cellSpacing={0}>
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
                          <div style={{ fontWeight: 800 }}>{c.reference ?? `${c.id.slice(0, 8)}…`}</div>
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
                                <div style={{ fontWeight: 800 }}>{d.toLocaleDateString()}</div>
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

                      {/* Evidence (collapsible + focus) */}
                      <div className={`evidence-card ${evidenceCollapsed ? 'is-collapsed' : ''}`}>
                        <div className="evidence-card__header">
                          <div className="evidence-card__title">
                            <strong>Evidence</strong>
                            <span className="evidence-card__count">{evidenceCount} item(s)</span>
                          </div>

                          <div className="evidence-card__actions">
                            <button
                              type="button"
                              className="evidence-action-btn"
                              onClick={() => setEvidenceCollapsed((v) => !v)}
                            >
                              {evidenceCollapsed ? 'Expand' : 'Collapse'}
                            </button>

                            <button
                              type="button"
                              className="evidence-action-btn"
                              onClick={() => setEvidenceFocus((v) => !v)}
                              title="Widen the right panel for evidence review"
                            >
                              {evidenceFocus ? 'Unfocus' : 'Focus'}
                            </button>
                          </div>
                        </div>

                        <div className="evidence-card__body">
                          <AddEvidenceForm
                            checkId={selectedId}
                            role={role}
                            checkStatus={detail.status}
                            onAdded={() => {
                              setEvidenceRefreshKey((k) => k + 1);
                              refreshSelectedDetail();
                            }}
                          />

                          <EvidencePanel
                            checkId={selectedId}
                            role={role}
                            refreshKey={evidenceRefreshKey}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
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
                          fontWeight: 800,
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
                          fontWeight: 800,
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
                              <span
                                style={{
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                }}
                              >
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