// src/App.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
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

type RoleMeta = { label: string; can: string[]; cannot: string[] };
const ROLE_META: Record<Role, RoleMeta> = {
  OFFICER: {
    label: 'Officer',
    can: ['Create a release check', 'Add evidence to a check', 'View check details & audit trail'],
    cannot: ['Approve or reject a check'],
  },
  SUPERVISOR: {
    label: 'Supervisor',
    can: [
      'View checks by status',
      'Review evidence',
      'Approve / Reject (only when evidence exists)',
      'View audit trail + tamper verification',
    ],
    cannot: ['Create new checks (demo: restricted)'],
  },
  AUDITOR: {
    label: 'Auditor',
    can: [
      'View checks by status',
      'Verify tamper-proof audit chain',
      'Approve / Reject (only when evidence exists)',
      'Review evidence and decisions',
    ],
    cannot: ['Create new checks (demo: restricted)'],
  },
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    // Safari supports addListener/removeListener
    if (m.addEventListener) m.addEventListener('change', onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener('change', onChange);
      else m.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

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

function EmptyListState({
  role,
  onShowAll,
  checks,
  isMobile,
}: {
  role: Role;
  onShowAll: () => void;
  checks: Check[];
  isMobile: boolean;
}) {
  const meta = ROLE_META[role];

  const pendingCount = checks.filter((check) => check.status === 'PENDING').length;
  const approvedCount = checks.filter((check) => check.status === 'APPROVED').length;
  const rejectedCount = checks.filter((check) => check.status === 'REJECTED').length;

  if (isMobile) {
    return (
      <div className="rg-mobile-workspace">
        <section className="rg-mobile-workspace__intro">
          <div className="rg-mobile-workspace__eyebrow">YOUR WORKSPACE</div>

          <div className="rg-mobile-workspace__heading">
            <div>
              <h2>{checks.length} release cases</h2>
              <p>
                {pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? 'case requires' : 'cases require'} review`
                  : 'No cases currently require review'}
              </p>
            </div>

            <div className="rg-mobile-workspace__total">
              <span>{checks.length}</span>
              <small>Total</small>
            </div>
          </div>

          <button
            type="button"
            className="rg-mobile-workspace__primary"
            onClick={onShowAll}
          >
            <span>View all release cases</span>
            <span aria-hidden="true">→</span>
          </button>
        </section>

        <section className="rg-mobile-workspace__stats" aria-label="Release case status">
          <div className="rg-mobile-stat rg-mobile-stat--pending">
            <span className="rg-mobile-stat__dot" />
            <strong>{pendingCount}</strong>
            <div>
              <b>Pending</b>
              <small>Needs review</small>
            </div>
          </div>

          <div className="rg-mobile-stat rg-mobile-stat--approved">
            <span className="rg-mobile-stat__dot" />
            <strong>{approvedCount}</strong>
            <div>
              <b>Approved</b>
              <small>Completed</small>
            </div>
          </div>

          <div className="rg-mobile-stat rg-mobile-stat--rejected">
            <span className="rg-mobile-stat__dot" />
            <strong>{rejectedCount}</strong>
            <div>
              <b>Rejected</b>
              <small>Completed</small>
            </div>
          </div>
        </section>

        <section className="rg-mobile-workspace__access">
          <div className="rg-mobile-workspace__access-head">
            <span className="rg-mobile-workspace__check">✓</span>
            <div>
              <small>YOUR ACCESS</small>
              <strong>{meta.label}</strong>
            </div>
          </div>

          <div className="rg-mobile-workspace__permissions">
            {meta.can.slice(0, 4).map((permission) => (
              <span key={permission}>
                <i aria-hidden="true">✓</i>
                {permission}
              </span>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="rg-landing">
      <div className="rg-landing__hero">
        <div className="rg-landing__eyebrow">RELEASE CONTROL WORKSPACE</div>

        <h2>Review with confidence. Decide with evidence.</h2>

        <p>
          Search for a release case, review compliance evidence and verify
          the audit trail before a release decision is authorised.
        </p>

        <div className="rg-landing__actions">
          <button
            type="button"
            className="rg-landing__primary"
            onClick={onShowAll}
          >
            View release cases
            <span aria-hidden="true">→</span>
          </button>

          <span className="rg-landing__hint">
            Or use the search bar above to retrieve a specific case
          </span>
        </div>
      </div>

      <div className="rg-capability-grid">
        <article className="rg-capability-card">
          <div className="rg-capability-card__icon">01</div>
          <div className="rg-capability-card__eyebrow">CASE CONTROL</div>
          <h3>Review cases</h3>
          <p>
            Inspect pending, approved and rejected release checks from one
            controlled workspace.
          </p>
        </article>

        <article className="rg-capability-card">
          <div className="rg-capability-card__icon">02</div>
          <div className="rg-capability-card__eyebrow">COMPLIANCE</div>
          <h3>Verify evidence</h3>
          <p>
            Review recorded evidence, source information and release
            conditions before making a decision.
          </p>
        </article>

        <article className="rg-capability-card">
          <div className="rg-capability-card__icon">03</div>
          <div className="rg-capability-card__eyebrow">INTEGRITY</div>
          <h3>Audit integrity</h3>
          <p>
            Follow case activity and verify the tamper-resistant audit chain
            behind every release check.
          </p>
        </article>
      </div>

      <div className="rg-access-strip">
        <div className="rg-access-strip__identity">
          <div className="rg-access-strip__indicator">✓</div>

          <div>
            <div className="rg-access-strip__eyebrow">YOUR ACCESS</div>
            <div className="rg-access-strip__role">
              {meta.label}
              <span>{role}</span>
            </div>
          </div>
        </div>

        <div className="rg-access-strip__permissions">
          {meta.can.slice(0, 4).map((permission) => (
            <span key={permission}>
              <i aria-hidden="true">✓</i>
              {permission}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isDesktop = useMediaQuery('(min-width: 901px)');
  const isMobile = useMediaQuery('(max-width: 900px)');

  const [role, setRole] = useState<Role>('SUPERVISOR');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(false);

  // UX: list starts hidden until user filters or searches
  const [hasEngaged, setHasEngaged] = useState(false);

  // search-mode: when searching, show only the matched case in the list
  const [searchMode, setSearchMode] = useState(false);

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

  // Evidence UI controls
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(false);

  /**
   * Resizable right panel (replaces Focus UX).
   * Button becomes Focus/Unfocus based on width.
   */
  const DEFAULT_RIGHT_COL = 440;
  const MIN_RIGHT_COL = 360;
  const MAX_RIGHT_COL = 780;
  const FOCUS_PRESET = 620;

  const [fullReview, setFullReview] = useState(false);

  const [rightCol, setRightCol] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_RIGHT_COL;
    const saved = Number(localStorage.getItem('rg:rightCol'));
    return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_RIGHT_COL;
  });

  const isFocused = rightCol >= FOCUS_PRESET - 10;

  // Persist right col width to CSS var + storage
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--rg-right-col', `${rightCol}px`);
    if (typeof window !== 'undefined') localStorage.setItem('rg:rightCol', String(rightCol));
  }, [rightCol]);

  // If switching to mobile, snap to default (prevents weird widths on small screens)
  useEffect(() => {
    if (!isDesktop) {
      setRightCol(DEFAULT_RIGHT_COL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  // Resizer drag
  const startResize = (clientX: number) => {
    if (!isDesktop) return;

    document.body.classList.add('rg-resizing');

    const onMove = (x: number) => {
      const vw = window.innerWidth;
      // right column width = distance from pointer to right edge
      const next = clamp(vw - x, MIN_RIGHT_COL, MAX_RIGHT_COL);
      setRightCol(next);
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0]?.clientX ?? clientX);

    const stop = () => {
      document.body.classList.remove('rg-resizing');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('touchcancel', stop);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stop);

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', stop);
    window.addEventListener('touchcancel', stop);
  };

  const toggleFocusPreset = () => {
    if (!isDesktop) return;
    setRightCol((w) => (w >= FOCUS_PRESET ? DEFAULT_RIGHT_COL : FOCUS_PRESET));
  };

  // Query string for list
  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('take', '50');
    if (status !== 'ALL') params.set('status', status);
    return params.toString();
  }, [status]);

  // Keep the last "full" list so search can temporarily show 1 result without losing context
  const fullListRef = useRef<Check[]>([]);

  const findMatch = (list: Check[], raw: string) => {
    const needle = raw.toLowerCase();
    const getIdStr = (c: any) => String(c?.id ?? '').toLowerCase();
    const getRefStr = (c: any) => String(c?.reference ?? '').toLowerCase();

    // exact
    let m =
      list.find((c: any) => getRefStr(c) === needle) ?? list.find((c: any) => getIdStr(c) === needle);

    // partial
    if (!m) {
      m =
        list.find((c: any) => getRefStr(c).includes(needle)) ??
        list.find((c: any) => getIdStr(c).includes(needle));
    }

    return m ?? null;
  };

  // Load release data immediately so the workspace summary always
  // reflects the real API state. hasEngaged controls list visibility only.
  useEffect(() => {
    if (searchMode) return; // search mode manages its own list display

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
        fullListRef.current = list;
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
  }, [query, role, searchMode]);

  const exitSearchMode = () => {
    setSearchMode(false);
    setSearchError(null);
    // restore previous list (or trigger fetch if empty)
    if (fullListRef.current.length > 0) setChecks(fullListRef.current);
  };

  // Search:
  // - engages list
  // - fetches list (if needed)
  // - shows ONLY the matched case on the left
  const handleSearch = async () => {
    const raw = searchId.trim();
    if (!raw) {
      setSearchError('Enter Prisoner / Case ID');
      return;
    }

    setSearchError(null);
    setDetailError(null);

    if (!hasEngaged) setHasEngaged(true);

    // Try current list, then ref list
    const current = checks.length ? checks : fullListRef.current;
    const local = current.length ? findMatch(current, raw) : null;

    if (local) {
      setSearchMode(true);
      setChecks([local]); // IMPORTANT: show only one on the left
      setSelectedId(local.id);

      return;
    }

    // Otherwise fetch a list and try again
    try {
      setLoading(true);
      setListError(null);

      const res = await http(`/checks?${query}`, { headers: { 'x-rg-role': role } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as ChecksResponse;
      const list = data.items ?? data.checks ?? [];
      fullListRef.current = list;

      const match = findMatch(list, raw);

      if (match) {
        setSearchMode(true);
        setChecks([match]);
        setSelectedId(match.id);

        return;
      }

      setSearchError(`No release checks found for: ${raw}`);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Details + Audit
  useEffect(() => {
    if (!selectedId) return;

    let alive = true;

    setDetail(null);
    setAudit([]);
    setVerifyOk(null);
    setDetailError(null);
    setDetailLoading(true);

    setEvidenceCollapsed(isMobile);

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

  // Mobile: selecting a case navigates directly to the case screen.
  // Do not reuse the desktop Full Review mode.
  useEffect(() => {
    if (!selectedId || !isMobile) return;

    setFullReview(false);
    setEvidenceCollapsed(true);

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [selectedId, isMobile]);

  const selected = checks.find((c) => c.id === selectedId);

  const evidenceCount =
    detail && detail._count && typeof detail._count.evidenceItems === 'number' ? detail._count.evidenceItems : 0;

  const canApprove =
    detail?.status === 'PENDING' && evidenceCount > 0 && (role === 'SUPERVISOR' || role === 'AUDITOR');

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

      // Keep list open, clear selection
      setSelectedId(null);
      setDetail(null);
      setAudit([]);

      // If we were showing just one search result, keep it (nice demo flow).
      // Otherwise we stay on the current list.
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

  const goToDashboard = () => {
    setHasEngaged(true);
    setSearchMode(false);
    setSearchId('');
    setSearchError(null);
    setListError(null);
    setStatus('ALL');

    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setAudit([]);
    setVerifyOk(null);
    setFullReview(false);
    setEvidenceCollapsed(false);

    // Restore the already-loaded dashboard list immediately.
    if (fullListRef.current.length > 0) {
      setChecks(fullListRef.current);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showList = hasEngaged;

  // Mobile: scroll-to-top button
  const [showToTop, setShowToTop] = useState(false);
  useEffect(() => {
    if (!isMobile) return;

    const onScroll = () => {
      setShowToTop(window.scrollY > 700);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile]);

  return (
    <div className="rg-shell">
      <div className="rg-container">
        {/* Header */}
        <div className="page-header rg-header">
          {/* LEFT: Brand */}
          <button
            type="button"
            className="rg-header__left rg-dashboard-link"
            onClick={goToDashboard}
            aria-label="Return to dashboard"
            title="Dashboard"
          >
            <div className="page-title">
              <div className="rg-title">
                <img src={logo} alt="ReleaseGuardian" className="rg-logo" />
              </div>

              <div className="rg-title-text">
                <h1>ReleaseGuardian</h1>
                <span className="page-subtitle">Audit &amp; Release Control</span>
              </div>
            </div>
          </button>

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
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchId(v);
                    // if user clears input, restore list
                    if (!v.trim() && searchMode) exitSearchMode();
                  }}
                />
                <button className="rg-searchbtn" type="submit">
                  Retrieve
                </button>
              </div>

              {searchMode && (
                <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Showing search result</div>
                  <button
                    type="button"
                    className="panel-back"
                    onClick={() => {
                      setSearchId('');
                      exitSearchMode();
                    }}
                    style={{ height: 32, padding: '0 10px' }}
                  >
                    Clear
                  </button>
                </div>
              )}

              {searchError && <div className="rg-header-error">Error: {searchError}</div>}
            </form>
          </div>

          {/* RIGHT: Filters + Role */}
          <div className="rg-header__right">
            <div className="role-switch rg-rolepill">
              <label>
                <span className="rg-rolepill__label">
                  <small>Viewing as</small>
                  <strong>{role.charAt(0) + role.slice(1).toLowerCase()}</strong>
                </span>
                <select
                  aria-label="Change demo role" 
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role);
                    setHasEngaged(true);
                    // role switch exits search mode (keeps flow predictable)
                    setSearchMode(false);
                    setSearchId('');
                    setSearchError(null);
                    setSelectedId(null);
                    setDetail(null);
                    setDetailError(null);
                    setAudit([]);
                  }}
                >
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

        {/* Release checks workspace */}
        <section
          className={`rg-workspace-heading ${
            isMobile && selectedId ? 'mobile-case-open-hidden' : ''
          }`}
        >
          <div className="rg-workspace-heading__copy">
            <span className="rg-eyebrow">
              <span className="rg-eyebrow__mark" aria-hidden="true" />
              Release control
            </span>

            <h2>Case workspace</h2>
            <p>Review release cases, evidence and authorisation status.</p>

            <div className="rg-workspace-meta" aria-label="Release case summary">
              <span className="rg-workspace-meta__review">
                <i aria-hidden="true" />
                {checks.filter((c) => c.status === 'PENDING').length} require review
              </span>

              <span className="rg-workspace-meta__divider" aria-hidden="true" />

              <span>{checks.length} total cases</span>
            </div>
          </div>

          <div className="rg-status-toolbar" aria-label="Filter release checks by status">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`rg-status-filter ${status === s ? 'is-active' : ''}`}
                onClick={() => {
                  setHasEngaged(true);
                  setSearchMode(false);
                  setSearchId('');
                  setSearchError(null);
                  setStatus(s);
                  setSelectedId(null);
                  setDetail(null);
                  setDetailError(null);
                  setAudit([]);
                }}
              >
                <span className={`rg-status-dot rg-status-dot--${s.toLowerCase()}`} />
                {s === 'ALL' ? 'All cases' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Cases + review workspace */}
        <div
            className={`checks-layout ${
              selectedId ? 'has-selection' : 'no-selection'
            } ${fullReview && selectedId ? 'full-review' : ''} ${
              isMobile && selectedId ? 'mobile-case-mode' : ''
            }`}
          >
          {/* Desktop-only resize handle */}
          {isDesktop && !fullReview && (
            <div
              className="rg-split-handle"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize details panel"
              onMouseDown={(e) => startResize(e.clientX)}
              onTouchStart={(e) => startResize(e.touches[0]?.clientX ?? 0)}
            />
          )}

          {/* LIST */}
          <div className={`checks-table ${isMobile && selectedId ? 'mobile-case-list-hidden' : ''}`}>
            {listError && <p style={{ color: 'red' }}>Error: {listError}</p>}

            {!showList ? (
              <EmptyListState
                role={role}
                checks={checks}
                isMobile={isMobile}
                onShowAll={() => {
                  setHasEngaged(true);
                  setSearchMode(false);
                  setStatus('ALL');
                  setSearchError(null);
                }}
              />
            ) : (
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
                            setFullReview(false);
                            setDetailError(null);

                            if (isMobile) {
                              setEvidenceCollapsed(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
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
                            <span className={`status-pill status-${String(c.status).toLowerCase()}`}>{c.status}</span>
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
            )}
          </div>

          {/* DETAILS */}
          <div className="checks-panel">
            {selectedId ? (
              <div className="panel-card">
                <div className={`panel-header ${isMobile ? 'mobile-case-nav' : ''}`}>
                  <div className="panel-header__identity">
                    {!isMobile && (
                      <>
                        <strong>{fullReview ? 'Case review' : 'Check details'}</strong>

                        {fullReview && detail?.reference && (
                          <span className="panel-header__reference">
                            {detail.reference}
                          </span>
                        )}
                      </>
                    )}

                    {isMobile && (
                      <span className="mobile-case-nav__label">Case review</span>
                    )}
                  </div>

                  <div className="panel-header__actions">
                    {!fullReview && !isMobile && (
                      <button
                        className="panel-full-review"
                        type="button"
                        onClick={() => setFullReview(true)}
                        title="Open this case in the full review workspace"
                      >
                        <span aria-hidden="true">↗</span>
                        Full page
                      </button>
                    )}

                    {fullReview ? (
                      <button
                        className="panel-back"
                        type="button"
                        onClick={() => setFullReview(false)}
                      >
                        ← Back to checks
                      </button>
                    ) : (
                      <button
                        className="panel-back"
                        type="button"
                        onClick={() => {
                          setSelectedId(null);
                          setFullReview(false);
                          setDetailError(null);

                          if (isMobile) {
                            requestAnimationFrame(() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            });
                          }
                        }}
                      >
                        {isMobile ? '← Cases' : 'Back'}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="case-technical-id"
                  style={{ marginTop: 8, fontSize: 13, color: '#444' }}
                >
                  <div>
                    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{selected?.id}</span>
                  </div>
                </div>

                {detailLoading && <p style={{ marginTop: 12 }}>Loading details…</p>}
                {detailError && <p style={{ color: 'red', marginTop: 12 }}>Error: {detailError}</p>}

                {!detailLoading && !detailError && detail && (
                  <>
                    <div className="case-review">

                      {/* CASE SUMMARY */}
                      <section className="case-summary-card">
                        <div className="case-summary-card__top">
                          <div>
                            <div className="case-section-eyebrow">CASE SUMMARY</div>
                            <h2>{detail.reference ?? 'Unnamed release check'}</h2>
                          </div>

                          <span
                            className={`status-pill status-${String(detail.status).toLowerCase()}`}
                          >
                            {detail.status}
                          </span>
                        </div>

                        <div className="case-summary-grid">
                          <div className="case-summary-field">
                            <span>Scheduled release</span>
                            <strong>
                              {detail.scheduledReleaseAt
                                ? new Date(detail.scheduledReleaseAt).toLocaleString()
                                : 'Not scheduled'}
                            </strong>
                          </div>

                          <div className="case-summary-field">
                            <span>Decision date</span>
                            <strong>
                              {detail.decidedAt
                                ? new Date(detail.decidedAt).toLocaleString()
                                : 'Awaiting decision'}
                            </strong>
                          </div>

                          <div className="case-summary-field case-summary-field--wide">
                            <span>Decision reason</span>
                            <strong>
                              {detail.decisionReason ?? 'No decision reason recorded'}
                            </strong>
                          </div>
                        </div>
                      </section>

                      {/* EVIDENCE */}
                      <div className={`evidence-card ${evidenceCollapsed ? 'is-collapsed' : ''}`}>
                        <div className="evidence-card__header">
                          <div className="evidence-card__title">
                            <div>
                              <div className="case-section-eyebrow">COMPLIANCE REVIEW</div>
                              <strong>Evidence</strong>
                            </div>

                            <span className="evidence-card__count">
                              {evidenceCount} item{evidenceCount === 1 ? '' : 's'}
                            </span>
                          </div>

                          <div className="evidence-card__actions">
                            <button
                              type="button"
                              className="evidence-action-btn"
                              onClick={() => setEvidenceCollapsed((v) => !v)}
                            >
                              {evidenceCollapsed ? 'Expand' : 'Collapse'}
                            </button>

                            {isDesktop && !fullReview && (
                              <button
                                type="button"
                                className="evidence-action-btn evidence-focus-btn"
                                onClick={toggleFocusPreset}
                                title="Widen the right panel for evidence review"
                              >
                                {isFocused ? 'Unfocus' : 'Focus'}
                              </button>
                            )}
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

                      {/* DECISION CONTROL */}
                      <section className="decision-card">
                        <div className="decision-card__header">
                          <div>
                            <div className="case-section-eyebrow">AUTHORISATION</div>
                            <h3>Release decision</h3>
                          </div>

                          <span className="decision-card__evidence">
                            {detail._count?.evidenceItems ?? 0} evidence item
                            {(detail._count?.evidenceItems ?? 0) === 1 ? '' : 's'}
                          </span>
                        </div>

                        {detail.status === 'PENDING' ? (
                          <>
                            <p className="decision-card__description">
                              Review the available evidence before authorising or rejecting this release.
                            </p>

                            <div className="decision-actions">
                              <button
                                type="button"
                                className="decision-btn decision-btn--approve"
                                disabled={!canApprove}
                                onClick={() => decide('approve')}
                                title={canApprove ? 'Approve release' : 'Approval is not currently available'}
                              >
                                <span className="decision-btn__icon">✓</span>
                                Approve release
                              </button>

                              <button
                                type="button"
                                className="decision-btn decision-btn--reject"
                                disabled={!canReject}
                                onClick={() => decide('reject')}
                              >
                                <span className="decision-btn__icon">×</span>
                                Reject release
                              </button>
                            </div>
                          </>
                        ) : (
                          <div
                            className={`decision-complete decision-complete--${String(
                              detail.status
                            ).toLowerCase()}`}
                          >
                            <div className="decision-complete__icon">
                              {detail.status === 'APPROVED' ? '✓' : '×'}
                            </div>

                            <div className="decision-complete__body">
                              <div className="decision-complete__title">
                                Release {String(detail.status).toLowerCase()}
                              </div>

                              <div className="decision-complete__meta">
                                {detail.decidedAt
                                  ? `Decision recorded ${new Date(detail.decidedAt).toLocaleString()}`
                                  : 'Decision recorded'}
                              </div>

                              {detail.decisionReason && (
                                <div className="decision-complete__reason">
                                  <span>Decision reason</span>
                                  <strong>{detail.decisionReason}</strong>
                                </div>
                              )}

                              <div className="decision-complete__readonly">
                                This case is read-only following authorisation.
                              </div>
                            </div>
                          </div>
                        )}
                      </section>

                      {/* AUDIT + INTEGRITY */}
                      <section className="integrity-card">
                        <div className="integrity-card__header">
                          <div>
                            <div className="case-section-eyebrow">SYSTEM INTEGRITY</div>
                            <h3>Audit &amp; verification</h3>
                          </div>

                          {verifyOk === null ? (
                            <span className="integrity-badge integrity-badge--checking">
                              Checking…
                            </span>
                          ) : verifyOk ? (
                            <span className="integrity-badge integrity-badge--verified">
                              ✓ Chain verified
                            </span>
                          ) : (
                            <span className="integrity-badge integrity-badge--failed">
                              Verification failed
                            </span>
                          )}
                        </div>

                        <div className="integrity-stats">
                          <div>
                            <span>Audit records</span>
                            <strong>{detail._count?.auditRecords ?? audit.length}</strong>
                          </div>

                          <div>
                            <span>Evidence records</span>
                            <strong>{detail._count?.evidenceItems ?? '—'}</strong>
                          </div>
                        </div>

                        <div className="audit-timeline">
                          <div className="audit-timeline__title">Activity timeline</div>

                          {audit.length === 0 ? (
                            <div className="audit-empty">No audit records.</div>
                          ) : (
                            <ul>
                              {audit.map((a) => (
                                <li key={a.id}>
                                  <div className="audit-event">
                                    <strong>{a.action.replace(/_/g, ' ')}</strong>
                                    <span>{new Date(a.createdAt).toLocaleString()}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </section>

                    </div>
                  </>
                )}
              </div>
            ) : (
              <EmptyPanel />
            )}
          </div>
        </div>

        {/* Mobile scroll-to-top */}
        {isMobile && showToTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed',
              right: 16,
              bottom: 18,
              zIndex: 50,
              height: 44,
              padding: '0 14px',
              borderRadius: 999,
              border: '1px solid rgba(226,232,240,0.9)',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 14px 30px rgba(15,23,42,0.16)',
              fontWeight: 900,
              cursor: 'pointer',
            }}
            aria-label="Scroll to top"
            title="Back to top"
          >
            ↑ Top
          </button>
        )}

        {/* Footer */}
        <footer className="rg-footer">
          <div className="rg-footer__left">ReleaseGuardian © 2026 — Audit &amp; Release Control System</div>
          <div className="rg-footer__right">
            <span className="env-badge">DEVELOPMENT</span>
          </div>
        </footer>
      </div>
    </div>
  );
}