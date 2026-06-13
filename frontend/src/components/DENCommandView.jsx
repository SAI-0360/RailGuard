import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import useStats from '../hooks/useStats';
import useWorkOrders from '../hooks/useWorkOrders';
import useSegments from '../hooks/useSegments';
import useActivityLog from '../hooks/useActivityLog';
import useMonitoring from '../hooks/useMonitoring';
import useChiHistory from '../hooks/useChiHistory';
import ActivityLedger from './ActivityLedger';
import { instructDenWorkOrder } from '../services/api';
import { roleLabel } from '../utils/roles';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

/**
 * DENCommandView — the Sr. DEN's division-wide HQ command terminal.
 *
 * Mostly read-only: the District Engineer oversees, they do not operate. The
 * one exception is the top of the escalation hierarchy — when an SSE escalates
 * a problem up to the division, the DEN answers it here. No simulator, no focus
 * panel, no work-order pipeline, no repair forms. The screen answers the
 * division's questions at a glance — corridor health (CHI), SSE escalations
 * awaiting a directive, SLA breaches, and what the agent is doing.
 */
export default function DENCommandView() {
  const { user, logout } = useAuth();
  const { stats } = useStats();
  const { workOrders, refetch: refetchWorkOrders } = useWorkOrders();
  const { segments } = useSegments();
  const { logs } = useActivityLog();
  const monitoring = useMonitoring();
  const { history } = useChiHistory();

  const handleInstructDen = async (workOrderId, denInstruction) => {
    await instructDenWorkOrder(workOrderId, denInstruction);
    refetchWorkOrders();
  };

  const { total = 100, healthy = 0, warning = 0, critical = 0, chi: statsChi } = stats || {};
  const chi = statsChi !== undefined ? Number(statsChi).toFixed(1) : (total > 0 ? ((healthy / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="min-h-screen bg-bg text-ink">
      <HQSituationBar
        chi={chi}
        critical={critical}
        warning={warning}
        healthy={healthy}
        monitoring={monitoring}
        user={user}
        onLogout={logout}
      />

      {/* Command center: wide single column of read-only instruments */}
      <main className="max-w-[1700px] mx-auto px-4 lg:px-8 py-6 space-y-6">
        <ChiTrendChart history={history} />
        <EscalationList workOrders={workOrders} onInstructDen={handleInstructDen} />
        <SlaBreachList workOrders={workOrders} segments={segments} />
        <section>
          <h2 className="panel-title mb-2 px-1">Division Activity Log</h2>
          <ActivityLedger logs={logs} live={monitoring.active} title="Division Activity Log" />
        </section>
      </main>
    </div>
  );
}

/**
 * HQSituationBar — sticky division header. Label, live CHI, severity count
 * chips, and the agent-liveness pulse. No agent start/stop here: the DEN
 * observes the autonomous monitor, never toggles it.
 */
function HQSituationBar({ chi, critical, warning, healthy, monitoring, user, onLogout }) {
  return (
    <header className="sticky top-0 z-40 bg-bg border-b border-line">
      <div className="max-w-[1700px] mx-auto px-4 lg:px-8 h-14 flex items-center gap-6">
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight text-ink">RailGuard</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-accent">HQ</span>
        </div>

        <span className="hidden md:block text-xs text-ink-2 shrink-0">
          HQ Command — Division Overview
        </span>

        {/* Division truth — single scannable instrument line */}
        <div className="hidden lg:flex items-center gap-5 font-mono text-xs">
          <span className="text-ink-3">
            CHI <span className="text-accent font-medium">{chi}%</span>
          </span>
          <span className={critical > 0 ? 'chip-crit' : 'chip'}>{critical} Critical</span>
          <span className={warning > 0 ? 'chip-warn' : 'chip'}>{warning} Warning</span>
          <span className="chip-ok">{healthy} Healthy</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <MonitorPulse active={monitoring.active} cycleCount={monitoring.cycleCount} />
          <Clock />
          {user && (
            <div className="flex items-center gap-2 pl-4 border-l border-line">
              <span className="hidden lg:block text-xs text-ink-2">{user.name}</span>
              <span className="chip bg-accent/10 text-accent">{roleLabel(user.role)}</span>
              <button onClick={onLogout} className="btn-ghost px-2.5 py-1">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Blinking pulse dot — autonomous monitor liveness. Read-only indicator. */
function MonitorPulse({ active, cycleCount }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-accent animate-live' : 'bg-ink-3'}`}
      />
      {active ? (
        <span className="text-accent">
          MONITOR ACTIVE<span className="hidden sm:inline text-ink-3"> #{cycleCount}</span>
        </span>
      ) : (
        <span className="text-ink-3">MONITOR STANDBY</span>
      )}
    </div>
  );
}

/** Shift clock — silent updates, mono digits. */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className="hidden sm:block font-mono text-xs text-ink-2">
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

/** CHI tooltip — instrument readout, not a floating card. */
function ChiTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-surface-3 border border-line rounded-lg px-3 py-2 font-mono text-[11px]">
      <p className="text-ink-3 mb-1">{data.date}</p>
      <p className="text-ink">
        CHI <span className="text-accent">{Number(data.chi ?? 0).toFixed(1)}%</span>
      </p>
    </div>
  );
}

/**
 * ChiTrendChart — 10-day Corridor Health Index, accent-cyan area. The DEN's
 * altitude view: is the division trending toward or away from health.
 */
function ChiTrendChart({ history = [] }) {
  const formatDay = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <section className="panel px-4 lg:px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="panel-title">Corridor Health Index — 10 Day Trend</h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">CHI %</span>
      </div>

      {history.length === 0 ? (
        <div className="flex items-center justify-center h-56 rounded-lg border border-line bg-surface-2
          font-mono text-[11px] text-ink-3">
          Loading trend…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={history} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4CB8E8" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4CB8E8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,163,178,0.07)" vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              tick={{ fill: '#6A7383', fontSize: 9, fontFamily: MONO }}
              axisLine={{ stroke: '#232936' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#6A7383', fontSize: 9, fontFamily: MONO }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<ChiTooltip />} cursor={{ stroke: '#232936' }} />

            <Area
              type="monotone"
              dataKey="chi"
              stroke="#4CB8E8"
              strokeWidth={1.5}
              fill="url(#chiFill)"
              dot={false}
              activeDot={{ r: 3, fill: '#4CB8E8', stroke: '#0B0D12', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

const HOUR_MS = 60 * 60 * 1000;

/** Live "overdue by 1h 23m" — recomputed each tick. */
function formatOverdue(ms) {
  const abs = Math.max(0, ms);
  const h = Math.floor(abs / HOUR_MS);
  const m = Math.floor((abs % HOUR_MS) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * EscalationList — the top of the escalation hierarchy. The DEN sees ONLY what
 * the SSE escalates up (sseNote), never the JE's original note, and answers with
 * a directive. Sorted longest-waiting first. Deterministic, no AI.
 */
function EscalationList({ workOrders = [], onInstructDen }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const escalations = useMemo(() => {
    return workOrders
      .filter((wo) => wo.denEscalationStatus === 'requested')
      .map((wo) => ({
        wo,
        waitedMs: wo.denEscalationRequestedAt ? now - new Date(wo.denEscalationRequestedAt).getTime() : 0,
      }))
      .sort((a, b) => b.waitedMs - a.waitedMs);
  }, [workOrders, now]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="panel-title">SSE Escalations — Awaiting Division Directive</h2>
        <span className={`font-mono text-[11px] ${escalations.length > 0 ? 'text-warn' : 'text-ink-3'}`}>
          {escalations.length} awaiting
        </span>
      </div>

      {escalations.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-2">
          No escalations from the field.{' '}
          <span className="text-ink-3">Section engineers are resolving issues at their tier.</span>
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {escalations.map(({ wo, waitedMs }) => (
            <DenEscalationCard key={wo.workOrderId} wo={wo} waitedMs={waitedMs} onInstructDen={onInstructDen} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** One SSE escalation + the DEN's directive reply. */
function DenEscalationCard({ wo, waitedMs, onInstructDen }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    const directive = text.trim();
    if (!directive || busy || !onInstructDen) return;
    setBusy(true);
    setError(null);
    try {
      await onInstructDen(wo.workOrderId, directive);
      setText('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not send directive');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="px-4 py-3 border-l-2 border-warn bg-warn/[0.04] space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-medium text-ink">{wo.segmentId}</span>
        <span className="chip bg-warn/10 text-warn">escalated by SSE</span>
        <span className="font-mono text-[11px] text-ink-3 truncate">{wo.workOrderId}</span>
        <span className="ml-auto text-right shrink-0">
          <span className="font-mono text-xs text-warn">{formatOverdue(waitedMs)}</span>
        </span>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1">SSE escalation</p>
        <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap rounded-lg border border-line bg-surface-2 px-3 py-2">
          {wo.sseNote || '(no note provided)'}
        </p>
      </div>

      <div>
        <label htmlFor={`den-directive-${wo.workOrderId}`} className="block text-[11px] text-ink-2 mb-1">
          Send Directive to SSE
        </label>
        <textarea
          id={`den-directive-${wo.workOrderId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Division call: e.g. Impose a 30 km/h cap corridor-wide, raise an emergency re-weld programme, and report daily until cleared."
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-xs text-ink
            placeholder-ink-3 resize-none focus:outline-none focus:border-warn/60 transition-colors duration-150"
        />
      </div>

      {error && (
        <p className="px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit">{error}</p>
      )}

      <button onClick={submit} disabled={busy || !text.trim()} className="btn-accent px-4 py-2">
        {busy ? 'Sending…' : 'Send directive →'}
      </button>
    </li>
  );
}

/**
 * SlaBreachList — every work order that is pending, still unacknowledged, and
 * past its deadline. These are the division's accountability failures: an
 * autonomous order dispatched but not picked up before its SLA expired. Sorted
 * most-overdue first so the worst breach is always at the top.
 */
function SlaBreachList({ workOrders = [], segments = [] }) {
  // 1s ticker keeps the overdue duration live without re-polling the API
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segmentById = useMemo(() => {
    const map = new Map();
    segments.forEach((s) => map.set(s.segmentId, s));
    return map;
  }, [segments]);

  const breaches = useMemo(() => {
    return workOrders
      .filter(
        (wo) =>
          wo.status === 'pending' &&
          (wo.workerStatus || 'unacknowledged') === 'unacknowledged' &&
          wo.deadline &&
          new Date(wo.deadline).getTime() < now
      )
      .map((wo) => {
        const seg = segmentById.get(wo.segmentId);
        const defectType = seg?.activeDefects?.[0]?.defectType || 'Risk threshold breach';
        return { wo, defectType, overdueMs: now - new Date(wo.deadline).getTime() };
      })
      .sort((a, b) => b.overdueMs - a.overdueMs);
  }, [workOrders, segmentById, now]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="panel-title">Unresolved Critical Incidents</h2>
        <span
          className={`font-mono text-[11px] ${breaches.length > 0 ? 'text-crit' : 'text-ink-3'}`}
        >
          {breaches.length} SLA {breaches.length === 1 ? 'breach' : 'breaches'}
        </span>
      </div>

      {breaches.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-2">
          No SLA breaches.{' '}
          <span className="text-ink-3">
            Every dispatched critical has been acknowledged within deadline.
          </span>
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {breaches.map(({ wo, defectType, overdueMs }) => (
            <li
              key={wo.workOrderId}
              className="flex items-center gap-4 px-4 py-3 border-l-2 border-crit bg-crit/[0.04]"
            >
              <div className="min-w-0 flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-ink">{wo.segmentId}</span>
                <span className="chip-crit shrink-0">{wo.priority || 'high'}</span>
              </div>

              <div className="min-w-0 hidden sm:block">
                <p className="text-[11px] text-ink-3">Assigned JE</p>
                <p className="text-xs text-ink-2 truncate">{wo.assignedWorker || '—'}</p>
              </div>

              <div className="min-w-0 hidden md:block">
                <p className="text-[11px] text-ink-3">Defect</p>
                <p className="text-xs text-ink-2 truncate">{defectType}</p>
              </div>

              <div className="ml-auto text-right shrink-0">
                <p className="text-[11px] text-ink-3">unacknowledged</p>
                <p className="font-mono text-xs text-crit">overdue by {formatOverdue(overdueMs)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
