import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import useSegments from '../hooks/useSegments';
import useWorkOrders from '../hooks/useWorkOrders';
import { progressWorkOrder } from '../services/api';
import { roleLabel } from '../utils/roles';

const HOUR_MS = 60 * 60 * 1000;
const swiftOut = [0.23, 1, 0.32, 1];

const WORKER_STATUS_META = {
  unacknowledged: { label: 'unacknowledged', chip: 'chip bg-surface-3 text-ink-3' },
  acknowledged: { label: 'acknowledged', chip: 'chip bg-accent/10 text-accent' },
  in_progress: { label: 'in progress', chip: 'chip bg-accent/10 text-accent' },
  done: { label: 'done', chip: 'chip bg-ok/10 text-ok' },
};

// The one next action for each state — the big tap target on the card
const NEXT_ACTION = {
  unacknowledged: "I'm on it",
  acknowledged: 'Start work',
  in_progress: 'Mark done',
};

function useNowTicker(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function formatClock(ms) {
  const abs = Math.max(0, Math.abs(ms));
  const h = Math.floor(abs / HOUR_MS);
  const m = Math.floor((abs % HOUR_MS) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} ${d.toLocaleTimeString(undefined, { hour12: false })}`;
}

/** Sort key: overdue first, then closing, then soonest deadline. */
function urgency(wo, now) {
  if (!wo.deadline) return Number.MAX_SAFE_INTEGER;
  return new Date(wo.deadline).getTime() - now;
}

/**
 * JEFieldView — the Junior Engineer's mobile-first field console.
 *
 * A JE works on a phone, trackside. Everything here is scoped to the segments
 * they own and built for one-handed use: a single tap-wide column, large
 * action targets, and the work the agent has assigned them front and center.
 * The human-in-the-loop sequence (I'm on it → Start work → Mark done) is the
 * spine of the screen; an unacknowledged SLA escalates, an acknowledged one
 * settles. Senior console instruments (drill, verification, full network) are
 * deliberately absent — this is the field, not the operations room.
 */
export default function JEFieldView() {
  const { user, logout } = useAuth();
  const { segments } = useSegments();
  const { workOrders } = useWorkOrders();
  const reduceMotion = useReducedMotion();

  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [overrides, setOverrides] = useState({});
  // Draft field reports, keyed by workOrderId, captured before "Mark done"
  const [reports, setReports] = useState({});

  // My work orders — strictly the ones dispatched to me (by email)
  const mine = useMemo(
    () =>
      workOrders
        .map((wo) => overrides[wo.workOrderId] || wo)
        .filter((wo) => wo.assignedWorkerEmail === user?.email),
    [workOrders, overrides, user]
  );

  const now = useNowTicker(mine.some((wo) => wo.status === 'pending' && wo.deadline));

  const open = useMemo(
    () => mine.filter((wo) => wo.status === 'pending').sort((a, b) => urgency(a, now) - urgency(b, now)),
    [mine, now]
  );
  const closed = useMemo(() => mine.filter((wo) => wo.status === 'completed'), [mine]);

  // My segment scope — situational awareness strip
  const assignedSet = useMemo(() => new Set(user?.assignedSegments || []), [user]);
  const mySegments = useMemo(
    () => segments.filter((s) => assignedSet.has(s.segmentId)),
    [segments, assignedSet]
  );
  const scope = useMemo(() => {
    let critical = 0, warning = 0;
    mySegments.forEach((s) => {
      if (s.status === 'critical') critical++;
      else if (s.status === 'warning') warning++;
    });
    return { total: assignedSet.size, critical, warning, healthy: mySegments.length - critical - warning };
  }, [mySegments, assignedSet]);

  const handleProgress = async (order) => {
    setBusyId(order.workOrderId);
    setActionError(null);
    try {
      // The in_progress → done step carries the optional field report
      const report =
        order.workerStatus === 'in_progress'
          ? (reports[order.workOrderId] || '').trim()
          : undefined;
      const data = await progressWorkOrder(order.workOrderId, report || undefined);
      setOverrides((prev) => ({ ...prev, [order.workOrderId]: data.workOrder }));
      if (report) {
        setReports((prev) => {
          const next = { ...prev };
          delete next[order.workOrderId];
          return next;
        });
      }
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Could not update — check your connection and retry.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Field header — compact, identity-forward */}
      <header className="sticky top-0 z-40 bg-bg border-b border-line">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight text-ink">RailGuard</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">Field</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-2 truncate max-w-[8rem]">{user?.name}</span>
            <span className="chip bg-accent/10 text-accent">{roleLabel(user?.role)}</span>
            <button onClick={logout} className="btn-ghost px-2.5 py-1">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* My patch — scoped situational awareness */}
        <section className="panel px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-medium text-ink-2">My segments</h1>
            <span className="font-mono text-[10px] text-ink-3">
              {scope.total > 0
                ? `${user?.assignedSegments?.[0]} – ${user?.assignedSegments?.[user.assignedSegments.length - 1]}`
                : 'none assigned'}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 divide-x divide-line border border-line rounded-lg overflow-hidden">
            <ScopeStat label="Critical" value={scope.critical} tone={scope.critical > 0 ? 'crit' : null} />
            <ScopeStat label="Warning" value={scope.warning} tone={scope.warning > 0 ? 'warn' : null} />
            <ScopeStat label="Healthy" value={scope.healthy} tone={null} />
          </div>
        </section>

        {actionError && (
          <p className="px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit">
            {actionError}
          </p>
        )}

        {/* Work queue — the job */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-medium text-ink-2">Assigned to me</h2>
            {open.length > 0 && (
              <span className="font-mono text-[11px] text-warn">{open.length} open</span>
            )}
          </div>

          {open.length === 0 ? (
            <div className="panel px-4 py-10 text-center">
              <p className="text-sm text-ink-2">No open work orders.</p>
              <p className="text-[11px] text-ink-3 mt-1">
                Your track is clear. New jobs appear here the moment the agent dispatches them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {open.map((order) => (
                <FieldCard
                  key={order.workOrderId}
                  order={order}
                  now={now}
                  expanded={expandedId === order.workOrderId}
                  busy={busyId === order.workOrderId}
                  reduceMotion={reduceMotion}
                  reportText={reports[order.workOrderId] || ''}
                  onReportChange={(text) =>
                    setReports((prev) => ({ ...prev, [order.workOrderId]: text }))
                  }
                  onToggle={() =>
                    setExpandedId((cur) => (cur === order.workOrderId ? null : order.workOrderId))
                  }
                  onProgress={() => handleProgress(order)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recently closed — receded */}
        {closed.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-medium text-ink-3 px-1">Completed ({closed.length})</h2>
            <div className="space-y-2 opacity-60">
              {closed.map((order) => (
                <FieldCard
                  key={order.workOrderId}
                  order={order}
                  now={now}
                  expanded={expandedId === order.workOrderId}
                  busy={false}
                  reduceMotion={reduceMotion}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === order.workOrderId ? null : order.workOrderId))
                  }
                  onProgress={null}
                  muted
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ScopeStat({ label, value, tone }) {
  const color = tone === 'crit' ? 'text-crit' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="px-3 py-2.5 bg-surface-1 text-center">
      <p className={`font-mono text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-ink-3">{label}</p>
    </div>
  );
}

function FieldCard({
  order, now, expanded, busy, reduceMotion, muted = false,
  reportText = '', onReportChange, onToggle, onProgress,
}) {
  const isUrgent = order.priority === 'urgent';
  const workerStatus = order.workerStatus || 'unacknowledged';
  const statusMeta = WORKER_STATUS_META[workerStatus] || WORKER_STATUS_META.unacknowledged;
  const acknowledged = workerStatus !== 'unacknowledged';
  const nextLabel = NEXT_ACTION[workerStatus];
  const canAct = !muted && onProgress && workerStatus !== 'done';

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 cursor-pointer hover:bg-surface-2/50 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-ink">{order.segmentId}</span>
          <span className={`ml-auto ${isUrgent ? 'chip-crit' : 'chip-warn'}`}>{order.priority || 'high'}</span>
          <span className={statusMeta.chip}>{statusMeta.label}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-3">{order.workOrderId}</span>
        </div>
        {order.reason && <p className="text-[11px] text-ink-2 mt-1">{order.reason}</p>}

        {!muted && order.deadline && (
          <DeadlineMeter
            createdAt={order.createdAt}
            deadline={order.deadline}
            now={now}
            acknowledged={acknowledged}
            done={workerStatus === 'done'}
          />
        )}
      </button>

      {/* Big primary action — the human-in-the-loop tap */}
      {canAct && nextLabel && (
        <div className="px-4 pb-3 space-y-2">
          {/* Field report — captured on the final step, sent to the SSE for verification */}
          {workerStatus === 'in_progress' && (
            <div>
              <label className="block text-[11px] text-ink-3 mb-1">Field report (optional)</label>
              <textarea
                value={reportText}
                onChange={(e) => onReportChange && onReportChange(e.target.value)}
                rows={2}
                placeholder="What did you do? e.g. Re-tightened fishplate bolts at km 12.3, ground out the hairline crack, recalibrated the vibration sensor."
                className="w-full bg-surface-1 border border-line rounded-lg px-3 py-2 text-xs text-ink
                  placeholder-ink-3 resize-none focus:outline-none focus:border-accent/60
                  transition-colors duration-150"
              />
            </div>
          )}
          <button
            onClick={onProgress}
            disabled={busy}
            className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-[background-color,transform]
              duration-150 ease-swift active:scale-[0.99] disabled:opacity-50 cursor-pointer
              ${workerStatus === 'unacknowledged'
                ? 'bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25'
                : 'bg-surface-2 border border-line text-ink hover:bg-surface-3'}`}
          >
            {busy ? 'Saving…' : nextLabel}
          </button>
        </div>
      )}

      {/* Dossier: telemetry snapshot, action, timeline */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="dossier"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: swiftOut }}
            className="overflow-hidden bg-surface-2/40 border-t border-line"
          >
            <div className="px-4 py-3 space-y-3">
              {order.recommendedAction && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1">Action required</p>
                  <p className="text-xs text-ink-2">{order.recommendedAction}</p>
                </div>
              )}

              {order.telemetrySnapshot && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1.5">
                    Telemetry at detection · {formatTime(order.telemetrySnapshot.capturedAt || order.createdAt)}
                  </p>
                  <div className="grid grid-cols-4 divide-x divide-line border border-line rounded-lg overflow-hidden">
                    <SnapshotCell label="Risk" value={(order.telemetrySnapshot.riskScore ?? 0).toFixed(1)} alert />
                    <SnapshotCell label="Vib" value={`${(order.telemetrySnapshot.vibrationLevel ?? 0).toFixed(1)}`} unit="mm/s" />
                    <SnapshotCell label="Cracks" value={String(order.telemetrySnapshot.crackCount ?? 0)} />
                    <SnapshotCell label="Inc" value={String(order.telemetrySnapshot.incidentCount ?? 0)} />
                  </div>
                </div>
              )}

              {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1.5">Timeline</p>
                  <div className="space-y-1">
                    {order.statusHistory.map((ev, i) => (
                      <div key={`${ev.status}-${i}`} className="flex items-baseline gap-2 font-mono text-[11px]">
                        <span className="text-ink-3 whitespace-nowrap">{formatTime(ev.at)}</span>
                        <span className="text-ink">{ev.status.replace('_', ' ')}</span>
                        <span className="text-accent ml-auto">{ev.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SnapshotCell({ label, value, unit, alert = false }) {
  return (
    <div className="px-2 py-2 bg-surface-1 text-center">
      <p className="text-[9px] text-ink-3 mb-0.5">{label}</p>
      <p className={`font-mono text-xs font-medium ${alert ? 'text-crit' : 'text-ink'}`}>
        {value}
        {unit && <span className="text-[9px] text-ink-3 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * SLA instrument, field-sized. Escalation colors apply only while the order is
 * unacknowledged; once the JE taps "I'm on it" the clock keeps counting in
 * neutral ink. The label always names the state, never color alone.
 */
function DeadlineMeter({ createdAt, deadline, now, acknowledged, done }) {
  const deadlineMs = new Date(deadline).getTime();
  const createdMs = new Date(createdAt).getTime();
  const totalMs = Math.max(deadlineMs - createdMs, 1);
  const remainingMs = deadlineMs - now;

  const overdue = remainingMs <= 0;
  const closing = !overdue && remainingMs < HOUR_MS;
  const frac = Math.min(Math.max(remainingMs / totalMs, 0), 1);

  if (done) {
    return <p className="mt-2 font-mono text-[11px] text-ok">done — awaiting SSE verification</p>;
  }

  let textClass = 'text-ink-2';
  let fillClass = 'bg-ink-3/40';
  let trackClass = 'bg-surface-2';
  let label = overdue ? `overdue ${formatClock(remainingMs)}` : `due in ${formatClock(remainingMs)}`;

  if (!acknowledged && closing) {
    textClass = 'text-warn';
    fillClass = 'bg-warn';
    label = `final hour ${formatClock(remainingMs)}`;
  } else if (!acknowledged && overdue) {
    textClass = 'text-crit';
    fillClass = 'bg-crit';
    trackClass = 'bg-crit/15';
  } else if (acknowledged) {
    label += ' · ack';
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className={`h-1 flex-1 rounded-full overflow-hidden ${trackClass}`}>
        <div className={`h-full ${fillClass}`} style={{ width: `${(overdue && !acknowledged ? 1 : frac) * 100}%` }} />
      </div>
      <span className={`font-mono text-[11px] whitespace-nowrap ${textClass}`}>{label}</span>
    </div>
  );
}
