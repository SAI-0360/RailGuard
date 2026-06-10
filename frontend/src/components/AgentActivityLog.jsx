import React, { useEffect, useRef } from 'react';

/**
 * AgentActivityLog Component
 * Renders a high-tech monospace terminal of recent agent actions.
 * 
 * Props:
 * - logs: Array of log objects: { id, timestamp, agent, action, message, severity }
 */
export default function AgentActivityLog({ logs = [] }) {
  const containerRef = useRef(null);

  // Helper to format timestamp to HH:MM:SS
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '00:00:00';
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return '00:00:00';
    }
  };

  // Agent name color mapping
  const agentColors = {
    MONITOR: 'text-blue-400',
    DETECTION: 'text-amber-500',
    EXTRACTION: 'text-purple-400',
    VERIFICATION: 'text-emerald-400',
    DISPATCH: 'text-rose-400',
    SYSTEM: 'text-slate-400',
  };

  const getAgentColorClass = (agent) => {
    const normalized = String(agent || '').toUpperCase();
    return agentColors[normalized] || 'text-slate-400';
  };

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
      {/* Terminal Title Bar */}
      <div className="bg-[#141424] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs text-gray-400 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400">Agent Activity Log</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Live</span>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        className="bg-[#0a0a14] p-4 text-xs overflow-y-auto max-h-[300px] flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic py-8 text-center text-xs tracking-wide">
            No activity logged yet. System idling...
          </div>
        ) : (
          logs.map((log) => {
            const isCritical = log.severity === 'critical';
            return (
              <div
                key={log.id}
                className={`py-0.5 px-2 rounded transition-colors duration-150 text-left leading-relaxed ${
                  isCritical ? 'bg-red-900/20 text-red-100' : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500 select-none">[{formatTime(log.timestamp)}]</span>{' '}
                <span className={`font-bold ${getAgentColorClass(log.agent)}`}>
                  {String(log.agent || '').toUpperCase()}
                </span>{' '}
                <span>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
