import React, { useState, useEffect } from 'react';
import { isAdminRole, roleLabel } from '../utils/roles';

/**
 * SituationBar — persistent system truth at the top of the console.
 * Health index, severity counts, agent state + control, operator identity, clock.
 * Replaces the old header + MetricCards: 97 healthy segments cost one number, not four cards.
 */
export default function SituationBar({ stats, monitoring, user, onLogout }) {
  const { total = 100, healthy = 0, warning = 0, critical = 0, chi } = stats || {};
  const healthIndex = chi !== undefined ? Number(chi).toFixed(1) : (total > 0 ? ((healthy / total) * 100).toFixed(1) : '0.0');

  return (
    <header className="sticky top-0 z-40 bg-bg border-b border-line">
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 h-14 flex items-center gap-6">
        {/* Wordmark */}
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight text-ink">RailGuard</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Operations</span>
        </div>

        {/* Network truth — mono, scannable as a single line of instruments */}
        <div className="hidden md:flex items-center gap-5 font-mono text-xs">
          <span className="text-ink-3">
            HEALTH <span className="text-ink font-medium">{healthIndex}%</span>
          </span>
          <span className={critical > 0 ? 'text-crit font-medium' : 'text-ink-3'}>
            {critical} CRIT
          </span>
          <span className={warning > 0 ? 'text-warn font-medium' : 'text-ink-3'}>
            {warning} WARN
          </span>
          <span className="text-ink-3">{healthy} OK</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <AgentStatus monitoring={monitoring} />
          <Clock />
          {user && <Identity user={user} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
}

/** Agent liveness + control. The liveness dot is the one sanctioned resting animation. */
function AgentStatus({ monitoring }) {
  const { active, cycleCount, start, stop } = monitoring;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            active ? 'bg-accent animate-live' : 'bg-ink-3'
          }`}
        />
        {active ? (
          <span className="text-accent">
            AGENT SCANNING<span className="hidden sm:inline text-ink-3"> #{cycleCount}</span>
          </span>
        ) : (
          <span className="text-ink-3">AGENT STANDBY</span>
        )}
      </div>
      <button
        onClick={active ? stop : start}
        className={`${active ? 'btn-ghost' : 'btn-accent'} px-2.5 py-1`}
      >
        {active ? 'Stop agent' : 'Start agent'}
      </button>
    </div>
  );
}

/** Operator identity: name, role chip, sign out. */
function Identity({ user, onLogout }) {
  const senior = isAdminRole(user.role);
  return (
    <div className="flex items-center gap-2 pl-4 border-l border-line">
      <span className="hidden lg:block text-xs text-ink-2">{user.name}</span>
      <span className={`chip ${senior ? 'bg-accent/10 text-accent' : 'bg-surface-3 text-ink-2'}`}>
        {roleLabel(user.role)}
      </span>
      <button onClick={onLogout} className="btn-ghost px-2.5 py-1">
        Sign out
      </button>
    </div>
  );
}

/** Shift clock. Updates silently; mono so digits don't jitter. */
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
