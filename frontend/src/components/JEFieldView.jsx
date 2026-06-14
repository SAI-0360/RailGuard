import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import useSegments from '../hooks/useSegments';
import useWorkOrders from '../hooks/useWorkOrders';
import { progressWorkOrder, escalateWorkOrder } from '../services/api';
import { roleLabel } from '../utils/roles';

const HOUR_MS = 60 * 60 * 1000;
const swiftOut = [0.23, 1, 0.32, 1];

const WORKER_STATUS_META = {
  unacknowledged: { label: 'unacknowledged', chip: 'chip bg-surface-3 text-ink-3' },
  acknowledged: { label: 'acknowledged', chip: 'chip bg-accent/10 text-accent' },
  in_progress: { label: 'in progress', chip: 'chip bg-accent/10 text-accent' },
  awaiting_guidance: { label: 'awaiting guidance', chip: 'chip bg-warn/10 text-warn' },
  done: { label: 'done', chip: 'chip bg-ok/10 text-ok' },
};

// The one next action for each state — the big tap target on the card
const NEXT_ACTION = {
  unacknowledged: "I'm on it",
  acknowledged: 'Start Work',
  in_progress: 'Mark Done',
};

// One-tap completion-report templates for the field report, keyed to the common
// anomaly types. Trackside on a phone, typing a full report is slow; these fill
// the textarea instantly and the JE edits in specifics (km marker, bolt count).
const REPORT_PRESETS = [
  {
    key: 'vibration',
    label: 'Vibration',
    text: 'Tightened all loose fishplate bolts at coordinates, packed shifting ballast beneath the sleepers to stabilize track alignment, and confirmed vibration readings normalized.',
  },
  {
    key: 'crack',
    label: 'Crack',
    text: 'Executed thermit weld repair to close structural cracks, ground the weld flush with the rail profile, and verified structural integrity.',
  },
  {
    key: 'general',
    label: 'General wear',
    text: 'Repacked track ballast bed, replaced worn out elastic rail clips (ERC), and secured the rubber pad base under the rail seat.',
  },
];

/** Pick the preset matching a segment's dominant anomaly, to highlight as suggested. */
function suggestedPresetKey(segment) {
  if (!segment) return null;
  if ((segment.crackCount || 0) > 0) return 'crack';
  if ((segment.vibrationLevel || 0) >= 4.1) return 'vibration';
  return 'general';
}

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
  // Draft guidance notes, keyed by workOrderId, captured before "I need guidance"
  const [guidanceNotes, setGuidanceNotes] = useState({});

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
  // Segment lookup so each card can show where its job physically is
  const segById = useMemo(
    () => new Map(mySegments.map((s) => [s.segmentId, s])),
    [mySegments]
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

  const handleEscalate = async (order) => {
    const note = (guidanceNotes[order.workOrderId] || '').trim();
    if (!note) return;
    setBusyId(order.workOrderId);
    setActionError(null);
    try {
      const data = await escalateWorkOrder(order.workOrderId, note);
      setOverrides((prev) => ({ ...prev, [order.workOrderId]: data.workOrder }));
      setGuidanceNotes((prev) => {
        const next = { ...prev };
        delete next[order.workOrderId];
        return next;
      });
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Could not send — check your connection and retry.');
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
                  segment={segById.get(order.segmentId)}
                  now={now}
                  expanded={expandedId === order.workOrderId}
                  busy={busyId === order.workOrderId}
                  reduceMotion={reduceMotion}
                  reportText={reports[order.workOrderId] || ''}
                  onReportChange={(text) =>
                    setReports((prev) => ({ ...prev, [order.workOrderId]: text }))
                  }
                  guidanceNote={guidanceNotes[order.workOrderId] || ''}
                  onGuidanceChange={(text) =>
                    setGuidanceNotes((prev) => ({ ...prev, [order.workOrderId]: text }))
                  }
                  onEscalate={() => handleEscalate(order)}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === order.workOrderId ? null : order.workOrderId))
                  }
                  onProgress={() => handleProgress(order)}
                />
              ))}
            </div>
          )}
        </section>

        {/* My patch — scoped situational awareness. Below the queue: at 2am
            the page exists because of a work order, so the job renders first. */}
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

        {/* Recently closed — receded */}
        {closed.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-medium text-ink-3 px-1">Completed ({closed.length})</h2>
            <div className="space-y-2 opacity-60">
              {closed.map((order) => (
                <FieldCard
                  key={order.workOrderId}
                  order={order}
                  segment={segById.get(order.segmentId)}
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
  order, segment, now, expanded, busy, reduceMotion, muted = false,
  reportText = '', onReportChange,
  guidanceNote = '', onGuidanceChange, onEscalate,
  onToggle, onProgress,
}) {
  const [askGuidance, setAskGuidance] = useState(false);
  const isUrgent = order.priority === 'urgent';
  const workerStatus = order.workerStatus || 'unacknowledged';
  const statusMeta = WORKER_STATUS_META[workerStatus] || WORKER_STATUS_META.unacknowledged;
  const acknowledged = workerStatus !== 'unacknowledged';
  const nextLabel = NEXT_ACTION[workerStatus];
  const canAct = !muted && onProgress && workerStatus !== 'done';

  // Structured escalation states
  const escalationStatus = order.escalationStatus || null;
  const isAwaiting = !muted && escalationStatus === 'requested';
  const isResolved = !muted && escalationStatus === 'resolved';
  // Guidance can be requested once the JE has acknowledged but hasn't escalated
  const canRequestGuidance =
    !muted && onEscalate && workerStatus === 'acknowledged' && !escalationStatus;
  const showPrimary = canAct && nextLabel; // awaiting_guidance has no nextLabel

  // The completion report is mandatory on the "Mark Done" step: an empty report
  // would reach the SSE's AI verifier as an empty string and be rejected
  // outright. Gate the button until the JE has written what they did.
  const reportRequired = workerStatus === 'in_progress';
  const primaryDisabled = busy || (reportRequired && !reportText.trim());
  // Which quick-fill preset to highlight, inferred from the segment's anomaly.
  const suggestedPreset = suggestedPresetKey(segment);
  // Set by the backend when the AI verifier bounces a submitted repair; the
  // work order is rolled back to in_progress so the JE can correct and re-submit.
  const rejectionReason = !muted ? order.rejectionReason : null;

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
        {order.reason && <p className="text-[11px] text-ink-2 mt-1">{order.reason}</p>}

        {!muted && order.deadline && (
          <DeadlineMeter
            createdAt={order.createdAt}
            deadline={order.deadline}
            now={now}
            acknowledged={acknowledged}
            done={workerStatus === 'done'}
            awaiting={isAwaiting}
            escalationRequestedAt={order.escalationRequestedAt}
          />
        )}
      </button>

      {/* Action / escalation area */}
      {!muted && (isAwaiting || isResolved || showPrimary || canRequestGuidance) && (
        <div className="px-4 pb-3 space-y-2">
          {/* SSE guidance received — the JE's go-ahead, highlighted */}
          {isResolved && order.sseInstruction && (
            <div className="rounded-lg border border-accent/30 bg-accent/[0.07] px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-accent mb-1">
                SSE Instruction
              </p>
              <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">
                {order.sseInstruction}
              </p>
            </div>
          )}

          {/* Proactive SSE directives — shown when the order was manually dispatched
              with pre-filled instructions, but the escalation flow hasn't been used yet */}
          {!isResolved && order.type === 'proactive' && order.sseInstruction && (
            <div className="rounded-lg border border-warn/30 bg-warn/[0.06] px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-warn mb-1">
                SSE Directive — Proactive Dispatch
              </p>
              <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">
                {order.sseInstruction}
              </p>
            </div>
          )}

          {/* Blocked — waiting on the section engineer */}
          {isAwaiting && (
            <div className="rounded-lg border border-warn/30 bg-warn/[0.08] px-3 py-3 text-center">
              <p className="text-sm font-medium text-warn">⏳ Awaiting SSE Instruction…</p>
              {order.jeNote && (
                <p className="text-[11px] text-ink-3 mt-1">Your note: “{order.jeNote}”</p>
              )}
            </div>
          )}

          {/* AI verifier bounced a prior submission — show why, so the JE can
              correct the work before reporting done again. */}
          {rejectionReason && workerStatus === 'in_progress' && (
            <div className="rounded-lg border border-crit/30 bg-crit/[0.07] px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-crit mb-1">
                ⚠ Verification rejected
              </p>
              <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">
                {rejectionReason}
              </p>
            </div>
          )}

          {/* Field report — captured on the final step, sent to the SSE for
              verification. Required: an empty report is rejected by the verifier. */}
          {showPrimary && workerStatus === 'in_progress' && (
            <div>
              <label className="block text-[11px] text-ink-3 mb-1">Field report (required)</label>

              {/* One-tap presets — the suggested one (by live telemetry) is accented */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-[10px] text-ink-3">Quick fill:</span>
                {REPORT_PRESETS.map((p) => {
                  const isSuggested = p.key === suggestedPreset;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => onReportChange && onReportChange(p.text)}
                      title={isSuggested ? 'Suggested for this segment' : `Fill ${p.label} repair report`}
                      className={`px-2 py-0.5 rounded border font-mono text-[10px] cursor-pointer
                        transition-colors duration-150
                        ${isSuggested
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-line bg-surface-2 text-ink-3 hover:text-ink-2'}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={reportText}
                onChange={(e) => onReportChange && onReportChange(e.target.value)}
                rows={2}
                placeholder="What did you do? e.g. Re-tightened fishplate bolts at km 12.3, ground out the hairline crack, recalibrated the vibration sensor."
                className="w-full bg-surface-1 border border-line rounded-lg px-3 py-2 text-xs text-ink
                  placeholder-ink-3 resize-none focus:outline-none focus:border-accent/60
                  transition-colors duration-150"
              />
              <p className="mt-1 text-[10px] text-ink-3">
                Describe the repair before marking done — the SSE verifies against this report.
              </p>
            </div>
          )}

          {/* Primary action — I'm on it / Start Work / Mark Done */}
          {showPrimary && (
            <button
              onClick={onProgress}
              disabled={primaryDisabled}
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-[background-color,transform]
                duration-150 ease-swift active:scale-[0.99] disabled:opacity-50 cursor-pointer
                ${workerStatus === 'unacknowledged'
                  ? 'bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25'
                  : 'bg-surface-2 border border-line text-ink hover:bg-surface-3'}`}
            >
              {busy ? 'Saving…' : (
                workerStatus === 'acknowledged' ? 'Start Work' :
                workerStatus === 'in_progress' ? 'Mark Done' :
                nextLabel
              )}
            </button>
          )}

          {/* Secondary — "I need guidance" (acknowledged, not yet escalated) */}
          {canRequestGuidance && !askGuidance && (
            <button
              onClick={() => setAskGuidance(true)}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-warn/30
                bg-warn/5 text-warn hover:bg-warn/10 transition-colors duration-150 cursor-pointer"
            >
              I need guidance →
            </button>
          )}
          {canRequestGuidance && askGuidance && (
            <div className="space-y-2">
              <textarea
                value={guidanceNote}
                onChange={(e) => onGuidanceChange && onGuidanceChange(e.target.value)}
                rows={2}
                autoFocus
                placeholder="What's blocking you? e.g. Crack pattern doesn't match any standard defect — unsure if this is fatigue or a weld failure."
                className="w-full bg-surface-1 border border-line rounded-lg px-3 py-2 text-xs text-ink
                  placeholder-ink-3 resize-none focus:outline-none focus:border-warn/60
                  transition-colors duration-150"
              />
              <div className="flex gap-2">
                <button
                  onClick={onEscalate}
                  disabled={busy || !guidanceNote.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-warn/30
                    bg-warn/10 text-warn hover:bg-warn/15 disabled:opacity-50 transition-colors
                    duration-150 cursor-pointer"
                >
                  {busy ? 'Sending…' : 'Send to SSE'}
                </button>
                <button
                  onClick={() => setAskGuidance(false)}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border border-line
                    bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors
                    duration-150 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
              {/* Where the job is — a navigable position, not just an ID.
                  Coords exist once route geometry has been computed. */}
              {segment?.startCoord && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1">Location</p>
                  <a
                    href={`https://www.google.com/maps?q=${segment.startCoord.lat},${segment.startCoord.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-accent hover:underline"
                  >
                    {segment.startCoord.lat.toFixed(4)}, {segment.startCoord.lon.toFixed(4)} · open in Maps →
                  </a>
                </div>
              )}

              {order.recommendedAction && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1">Action required</p>
                  <p className="text-xs text-ink-2">{order.recommendedAction}</p>
                </div>
              )}

              {/* Dispatch reference — bookkeeping, so it lives in the dossier */}
              <p className="font-mono text-[10px] text-ink-3">{order.workOrderId}</p>

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
function DeadlineMeter({ createdAt, deadline, now, acknowledged, done, awaiting, escalationRequestedAt }) {
  const deadlineMs = new Date(deadline).getTime();
  const createdMs = new Date(createdAt).getTime();
  const totalMs = Math.max(deadlineMs - createdMs, 1);

  if (done) {
    return <p className="mt-2 font-mono text-[11px] text-ok">done — awaiting SSE verification</p>;
  }

  // SLA paused while blocked on SSE guidance — freeze the readout at the moment
  // guidance was requested so waiting on the SSE doesn't burn the JE's clock.
  if (awaiting) {
    const frozen = escalationRequestedAt ? new Date(escalationRequestedAt).getTime() : now;
    const fr = Math.min(Math.max((deadlineMs - frozen) / totalMs, 0), 1);
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full overflow-hidden bg-surface-2">
          <div className="h-full bg-ink-3/40" style={{ width: `${fr * 100}%` }} />
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] whitespace-nowrap
          px-1.5 py-0.5 rounded border border-accent/30 bg-accent/10 text-accent">
          <span aria-hidden="true">❄</span> SLA FROZEN · awaiting guidance
        </span>
      </div>
    );
  }

  const remainingMs = deadlineMs - now;
  const overdue = remainingMs <= 0;
  const closing = !overdue && remainingMs < HOUR_MS;
  const frac = Math.min(Math.max(remainingMs / totalMs, 0), 1);

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
