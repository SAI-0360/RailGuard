import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * AttentionQueue — the primary worklist. Replaces the 100-cell status grid.
 *
 * Work-by-exception inversion: degraded segments get full incident rows,
 * triaged by severity then risk score; the 97 healthy segments collapse
 * into a single searchable summary line. Pixels follow priority.
 */
export default function AttentionQueue({ segments = [], workOrders = [], selectedId, onSelect, loading }) {
  const { critical, warning, healthy } = useMemo(() => {
    const byRisk = (a, b) => (b.riskScore || 0) - (a.riskScore || 0);
    return {
      critical: segments.filter((s) => s.status === 'critical').sort(byRisk),
      warning: segments.filter((s) => s.status === 'warning').sort(byRisk),
      healthy: segments.filter((s) => s.status === 'healthy'),
    };
  }, [segments]);

  // Join: which degraded segments already have a pending work order drafted by the agent
  const pendingWoBySegment = useMemo(() => {
    const map = {};
    workOrders.forEach((wo) => {
      if (wo.status === 'pending' && !map[wo.segmentId]) map[wo.segmentId] = wo.workOrderId;
    });
    return map;
  }, [workOrders]);

  if (loading && segments.length === 0) {
    return (
      <section className="panel p-4">
        <h2 className="panel-title mb-3">Attention queue</h2>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const degradedCount = critical.length + warning.length;

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="panel-title">Attention queue</h2>
        <span className="font-mono text-[11px] text-ink-3">
          {degradedCount} active
        </span>
      </div>

      <div className="px-2 py-2">
        {degradedCount === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-ink-2">All {segments.length} segments nominal.</p>
            <p className="text-xs text-ink-3 mt-1">
              Degraded segments will surface here as the agent detects them.
            </p>
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <SeverityGroup label="Critical" count={critical.length} tone="crit">
                {critical.map((s) => (
                  <IncidentRow
                    key={s.segmentId}
                    segment={s}
                    workOrderId={pendingWoBySegment[s.segmentId]}
                    selected={selectedId === s.segmentId}
                    onSelect={onSelect}
                    expanded
                  />
                ))}
              </SeverityGroup>
            )}
            {warning.length > 0 && (
              <SeverityGroup label="Warning" count={warning.length} tone="warn">
                {warning.map((s) => (
                  <IncidentRow
                    key={s.segmentId}
                    segment={s}
                    workOrderId={pendingWoBySegment[s.segmentId]}
                    selected={selectedId === s.segmentId}
                    onSelect={onSelect}
                  />
                ))}
              </SeverityGroup>
            )}
          </>
        )}

        <HealthySummary healthy={healthy} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </section>
  );
}

/** Severity group header: real semantic state, not a decorative eyebrow. */
function SeverityGroup({ label, count, tone, children }) {
  const toneText = tone === 'crit' ? 'text-crit' : 'text-warn';
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={`font-mono text-[10px] uppercase tracking-wide ${toneText}`}>
          {label}
        </span>
        <span className="font-mono text-[10px] text-ink-3">{count}</span>
        <span className="flex-1 border-t border-line" />
      </div>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </div>
    </div>
  );
}

/**
 * IncidentRow — one degraded segment as a triage row: identity, risk, trend,
 * salient telemetry, and the agent's current disposition. Click binds the Focus Panel.
 */
function IncidentRow({ segment, workOrderId, selected, onSelect, expanded = false }) {
  const reduceMotion = useReducedMotion();
  const {
    segmentId, status, riskScore, vibrationLevel, crackCount, incidentCount, prediction,
  } = segment;

  const isCrit = status === 'critical';
  const trend = prediction?.trendDirection;
  const trendGlyph = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : null;

  return (
    <motion.button
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => onSelect && onSelect(segmentId)}
      className={`relative w-full text-left rounded-lg border overflow-hidden cursor-pointer
        transition-[background-color,border-color,transform] duration-150 ease-swift active:scale-[0.99]
        ${selected
          ? 'border-accent/60 bg-surface-3'
          : isCrit
            ? 'border-crit/25 bg-crit/[0.06] hover:bg-crit/10'
            : 'border-line bg-surface-2 hover:bg-surface-3'
        }`}
    >
      <div className={`px-3 ${expanded ? 'py-3' : 'py-2'}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-ink">{segmentId}</span>
          <span className={isCrit ? 'chip-crit' : 'chip-warn'}>{status}</span>

          <span className="ml-auto flex items-baseline gap-1 font-mono">
            <span className={`text-base font-semibold ${isCrit ? 'text-crit' : 'text-warn'}`}>
              {riskScore !== undefined ? riskScore.toFixed(1) : '0.0'}
            </span>
            {trendGlyph && (
              <span className={`text-xs ${trend === 'increasing' ? 'text-crit' : 'text-ok'}`}>
                {trendGlyph}
              </span>
            )}
            <span className="text-[10px] text-ink-3 uppercase">risk</span>
          </span>
        </div>

        {expanded && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-2">
            {vibrationLevel !== undefined && (
              <span>vib {vibrationLevel.toFixed(1)} mm/s</span>
            )}
            {crackCount !== undefined && <span>{crackCount} crack{crackCount === 1 ? '' : 's'}</span>}
            {incidentCount !== undefined && incidentCount > 0 && (
              <span>{incidentCount} incident{incidentCount === 1 ? '' : 's'}</span>
            )}
            {prediction?.predictedDaysToCritical != null && (
              <span className="text-crit">
                critical in ~{prediction.predictedDaysToCritical}d
              </span>
            )}
            {workOrderId && (
              <span className="text-accent">agent drafted {workOrderId}</span>
            )}
          </div>
        )}

        {!expanded && workOrderId && (
          <div className="mt-1 font-mono text-[11px] text-accent">
            agent drafted {workOrderId}
          </div>
        )}
      </div>
    </motion.button>
  );
}

/**
 * HealthySummary — the inversion made physical: 97 healthy segments cost
 * one quiet row. Expandable into a search for direct segment lookup.
 */
function HealthySummary({ healthy, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return healthy.filter((s) => s.segmentId.toLowerCase().includes(q)).slice(0, 12);
  }, [healthy, query]);

  return (
    <div className="border-t border-line mt-1 pt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-surface-2
          transition-colors duration-150 cursor-pointer"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ok/60" aria-hidden="true" />
        <span className="text-xs text-ink-2">
          Nominal <span className="font-mono">{healthy.length}</span> segments
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-3">
          {open ? 'hide' : 'search'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to segment, e.g. 088"
            autoFocus
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 font-mono text-xs
              text-ink placeholder-ink-3 focus:outline-none focus:border-accent/60"
          />
          {query.trim() && (
            <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1">
              {matches.length === 0 ? (
                <p className="col-span-full text-xs text-ink-3 px-1 py-1.5">
                  No healthy segment matches "{query.trim()}".
                </p>
              ) : (
                matches.map((s) => (
                  <button
                    key={s.segmentId}
                    onClick={() => onSelect && onSelect(s.segmentId)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5
                      font-mono text-[11px] transition-colors duration-150 cursor-pointer
                      ${selectedId === s.segmentId
                        ? 'border-accent/60 bg-surface-3 text-ink'
                        : 'border-line bg-surface-2 text-ink-2 hover:bg-surface-3'}`}
                  >
                    <span>{s.segmentId}</span>
                    <span className="text-ink-3">{(s.riskScore ?? 0).toFixed(0)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
