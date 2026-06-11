import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { progressWorkOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';

const HOUR_MS = 60 * 60 * 1000;

const WORKER_STATUS_META = {
  unacknowledged: { label: 'unacknowledged', chip: 'chip bg-surface-3 text-ink-3' },
  acknowledged: { label: 'acknowledged', chip: 'chip bg-accent/10 text-accent' },
  in_progress: { label: 'in progress', chip: 'chip bg-accent/10 text-accent' },
  done: { label: 'done', chip: 'chip bg-ok/10 text-ok' },
};

// The next human action for each state — the one-tap "I'm on it" moment
const NEXT_ACTION = {
  unacknowledged: { label: "I'm on it", className: 'btn-accent' },
  acknowledged: { label: 'Start work', className: 'btn-ghost' },
  in_progress: { label: 'Mark done', className: 'btn-ghost' },
};

/**
 * Shared 1 Hz clock for every countdown in the panel — one interval, not one
 * per card. Stops ticking entirely when nothing has a live deadline.
 */
function useNowTicker(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** 9745000ms → "2:42:25" — hours unpadded, mono+tabular keeps it steady. */
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

/**
 * WorkOrderPipeline — agent-drafted work orders grouped by lifecycle stage.
 * Hairline-divided rows, not nested cards; completed orders recede.
 *
 * Each pending order is a dispatch instrument: assigned worker, a live SLA
 * countdown, and the human-in-the-loop controls. The SLA escalates (amber
 * inside the final hour, red when blown) only while no one has responded —
 * the moment the worker taps "I'm on it" the clock keeps counting but stops
 * shouting. Clicking a card opens the segment in the Focus Panel and unfolds
 * the order's dossier: the telemetry snapshot captured when the issue fired,
 * and the full status timeline.
 */
export default function WorkOrderPipeline({ workOrders = [], onSelectSegment }) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  // Optimistic overrides between polls: progress responses land here and the
  // 5s workOrders poll naturally supersedes them.
  const [overrides, setOverrides] = useState({});

  const merged = workOrders.map((wo) => overrides[wo.workOrderId] || wo);
  const pending = merged.filter((wo) => wo.status === 'pending');
  const completed = merged.filter((wo) => wo.status === 'completed');

  const now = useNowTicker(pending.some((wo) => wo.deadline));

  const handleProgress = async (order) => {
    setBusyId(order.workOrderId);
    setActionError(null);
    try {
      const data = await progressWorkOrder(order.workOrderId);
      setOverrides((prev) => ({ ...prev, [order.workOrderId]: data.workOrder }));
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Could not update work order');
    } finally {
      setBusyId(null);
    }
  };

  const handleCardClick = (order) => {
    setExpandedId((cur) => (cur === order.workOrderId ? null : order.workOrderId));
    if (onSelectSegment) onSelectSegment(order.segmentId);
  };

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="panel-title">Work orders</h2>
        {pending.length > 0 && (
          <span className="font-mono text-[11px] text-warn">{pending.length} pending</span>
        )}
      </div>

      {actionError && (
        <p className="mx-4 mt-2 px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit">
          {actionError}
        </p>
      )}

      <div className="overflow-y-auto max-h-[420px]">
        {merged.length === 0 ? (
          <p className="text-xs text-ink-3 px-4 py-6 text-center">
            No work orders. The agent drafts them automatically when a segment degrades.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {pending.map((order) => (
              <WorkOrderRow
                key={order.workOrderId}
                order={order}
                now={now}
                user={user}
                expanded={expandedId === order.workOrderId}
                busy={busyId === order.workOrderId}
                reduceMotion={reduceMotion}
                onCardClick={() => handleCardClick(order)}
                onProgress={() => handleProgress(order)}
                onSelectSegment={onSelectSegment}
              />
            ))}
            {completed.length > 0 && (
              <div className="px-4 py-1.5 bg-surface-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                  Completed {completed.length}
                </span>
              </div>
            )}
            {completed.map((order) => (
              <WorkOrderRow
                key={order.workOrderId}
                order={order}
                now={now}
                user={user}
                expanded={expandedId === order.workOrderId}
                busy={false}
                reduceMotion={reduceMotion}
                onCardClick={() => handleCardClick(order)}
                onProgress={null}
                onSelectSegment={onSelectSegment}
                muted
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function WorkOrderRow({
  order, now, user, expanded, busy, reduceMotion, muted = false,
  onCardClick, onProgress, onSelectSegment,
}) {
  const isUrgent = order.priority === 'urgent';
  const workerStatus = order.workerStatus || 'unacknowledged';
  const statusMeta = WORKER_STATUS_META[workerStatus] || WORKER_STATUS_META.unacknowledged;
  const acknowledged = workerStatus !== 'unacknowledged';

  // Only the assigned worker drives the lifecycle (admins and other workers see status only)
  const canAct =
    !muted &&
    onProgress &&
    workerStatus !== 'done' &&
    user &&
    user.role !== 'admin' &&
    (user.name === order.assignedWorker || user.email === order.assignedWorkerEmail);
  const nextAction = NEXT_ACTION[workerStatus];

  return (
    <div className={muted ? 'opacity-50' : ''}>
      {/* Whole card is the affordance: open the segment + unfold the dossier */}
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick();
          }
        }}
        aria-expanded={expanded}
        className="px-4 py-2.5 cursor-pointer hover:bg-surface-2/60 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-ink">{order.workOrderId}</span>
          <span className="font-mono text-[11px] text-accent">{order.segmentId}</span>
          {order.assignedWorker && (
            <span className="font-mono text-[11px] text-ink-3" title="Assigned field worker">
              → {order.assignedWorker}
            </span>
          )}
          <span className={`ml-auto ${isUrgent ? 'chip-crit' : 'chip-warn'}`}>
            {order.priority || 'high'}
          </span>
          {/* Worker status indicator: unacknowledged → acknowledged → in progress → done */}
          <span className={statusMeta.chip}>{statusMeta.label}</span>
        </div>

        {order.reason && (
          <p className="text-[11px] text-ink-2 mt-1 line-clamp-2">{order.reason}</p>
        )}

        {!muted && order.deadline && (
          <DeadlineMeter
            createdAt={order.createdAt}
            deadline={order.deadline}
            now={now}
            acknowledged={acknowledged}
            done={workerStatus === 'done'}
          />
        )}

        {canAct && nextAction && (
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation(); // act without toggling the dossier
                onProgress();
              }}
              disabled={busy}
              className={`${nextAction.className} px-3 py-1.5`}
            >
              {busy ? 'Updating' : nextAction.label}
            </button>
          </div>
        )}
      </div>

      {/* Dossier: detection snapshot + accountability timeline */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="dossier"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden bg-surface-2/40"
          >
            <div className="px-4 py-3 space-y-3 border-t border-line">
              {order.telemetrySnapshot && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1.5">
                    Telemetry at detection · {formatTime(order.telemetrySnapshot.capturedAt || order.createdAt)}
                  </p>
                  <div className="grid grid-cols-4 divide-x divide-line border border-line rounded-lg overflow-hidden">
                    <SnapshotCell label="Risk" value={(order.telemetrySnapshot.riskScore ?? 0).toFixed(1)} alert />
                    <SnapshotCell label="Vibration" value={`${(order.telemetrySnapshot.vibrationLevel ?? 0).toFixed(1)}`} unit="mm/s" />
                    <SnapshotCell label="Cracks" value={String(order.telemetrySnapshot.crackCount ?? 0)} />
                    <SnapshotCell label="Incidents" value={String(order.telemetrySnapshot.incidentCount ?? 0)} />
                  </div>
                </div>
              )}

              {order.recommendedAction && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1">
                    Action required
                  </p>
                  <p className="text-[11px] text-ink-2">{order.recommendedAction}</p>
                </div>
              )}

              {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1.5">
                    Status timeline
                  </p>
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

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectSegment) onSelectSegment(order.segmentId);
                }}
                className="font-mono text-[11px] text-accent hover:underline cursor-pointer"
              >
                Open {order.segmentId} in focus panel →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SnapshotCell({ label, value, unit, alert = false }) {
  return (
    <div className="px-2.5 py-2 bg-surface-1">
      <p className="text-[9px] text-ink-3 mb-0.5">{label}</p>
      <p className={`font-mono text-xs font-medium ${alert ? 'text-crit' : 'text-ink'}`}>
        {value}
        {unit && <span className="text-[9px] text-ink-3 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * SLA instrument for one order. The hairline drains as the 4-hour window is
 * consumed and the clock ticks every second. Escalation colors (amber inside
 * the final hour, red when blown) apply only while the order is
 * unacknowledged — once a worker responds, the timer keeps counting in
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
    return (
      <p className="mt-1.5 font-mono text-[10px] text-ok">work reported done — awaiting verification</p>
    );
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
    <div className="mt-1.5 flex items-center gap-2">
      <div className={`h-[3px] flex-1 rounded-full overflow-hidden ${trackClass}`}>
        {/* No width transition: a 1 Hz step is data updating, not motion at rest */}
        <div
          className={`h-full ${fillClass}`}
          style={{ width: `${(overdue && !acknowledged ? 1 : frac) * 100}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] whitespace-nowrap ${textClass}`}>{label}</span>
    </div>
  );
}
