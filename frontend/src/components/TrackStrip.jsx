import React, { useState } from 'react';

/**
 * TrackStrip — the 100 segments as a linear schematic, demoted to a
 * secondary spatial reference. A railway is a 1D asset: rendering segments
 * in physical order means co-located degradation reads as a lit corridor
 * region, which a 10x10 grid could never show.
 *
 * Healthy cells are deliberately dim; only degraded cells are lit.
 */
export default function TrackStrip({ segments = [], selectedId, onSelect }) {
  const [open, setOpen] = useState(true);

  const cellClass = (s) => {
    if (s.status === 'critical') return 'bg-crit';
    if (s.status === 'warning') return 'bg-warn';
    return 'bg-ink-3/25 hover:bg-ink-3/50';
  };

  return (
    <section className="panel">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
      >
        <h2 className="panel-title">Track schematic</h2>
        <span className="font-mono text-[10px] text-ink-3">
          {segments.length > 0
            ? `${segments[0].segmentId} to ${segments[segments.length - 1].segmentId}`
            : 'no segments'}{' '}
          · {open ? 'hide' : 'show'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-[3px]">
            {segments.map((s) => (
              <button
                key={s.segmentId}
                onClick={() => onSelect && onSelect(s.segmentId)}
                title={`${s.segmentId} · ${s.status} · risk ${(s.riskScore ?? 0).toFixed(1)}`}
                aria-label={`${s.segmentId}, ${s.status}, risk ${(s.riskScore ?? 0).toFixed(1)}`}
                className={`h-[18px] w-[13px] rounded-[2px] transition-colors duration-150 cursor-pointer
                  ${cellClass(s)}
                  ${selectedId === s.segmentId ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-1' : ''}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 font-mono text-[10px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-ink-3/25 inline-block" /> nominal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-warn inline-block" /> warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-crit inline-block" /> critical
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
