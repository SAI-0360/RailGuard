import React from 'react';

/**
 * MonitoringToggle Component
 * A prominent button to start or stop the autonomous monitoring loop.
 *
 * Props:
 * - isActive: boolean — whether monitoring is currently running
 * - onStart: function — called when user clicks to start monitoring
 * - onStop: function — called when user clicks to stop monitoring
 */
export default function MonitoringToggle({ isActive, onStart, onStop }) {
  if (isActive) {
    return (
      <button
        onClick={onStop}
        className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:border-red-500/50 active:scale-[0.98]"
      >
        <span className="w-2 h-2 rounded-sm bg-red-400" />
        Stop Autonomous Monitoring
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] active:scale-[0.98]"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      Start Autonomous Monitoring
    </button>
  );
}
