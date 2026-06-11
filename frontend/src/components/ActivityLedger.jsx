import React, { useEffect, useRef } from 'react';

/**
 * ActivityLedger — the autonomous system's flight recorder.
 * Append-only, timestamped, attributable. Entries stream in silently
 * (Emil's frequency rule: constant updates get no animation); agent
 * identity carries the interactive accent so "who did what" reads at a glance.
 */
export default function ActivityLedger({ logs = [], live = false, title = 'Agent activity' }) {
  const containerRef = useRef(null);

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '00:00:00';
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch (e) {
      return '00:00:00';
    }
  };

  // Auto-scroll to the latest entry
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="panel-title">{title}</h2>
        {live && (
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-live" />
            live
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="px-4 py-3 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-64 space-y-0.5"
      >
        {logs.length === 0 ? (
          <p className="text-ink-3 py-4 text-center">
            No activity yet. Start the agent to begin autonomous scanning.
          </p>
        ) : (
          logs.map((log) => {
            const isCritical = log.severity === 'critical';
            const agent = String(log.agent || '').toUpperCase();
            const isSystem = agent === 'SYSTEM';
            return (
              <div
                key={log.id}
                className={`flex gap-2 px-1.5 py-px rounded ${isCritical ? 'bg-crit/10' : ''}`}
              >
                <span className="text-ink-3 shrink-0 select-none">{formatTime(log.timestamp)}</span>
                <span className={`shrink-0 font-medium ${isSystem ? 'text-ink-3' : 'text-accent'}`}>
                  {agent}
                </span>
                <span className={isCritical ? 'text-crit' : 'text-ink-2'}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
