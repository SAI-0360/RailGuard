import { useState } from 'react';

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
  // "Mute nominal" — a focus toggle that hides healthy cells so the strip
  // collapses to only the warning/critical corridor regions that need eyes.
  const [muteNominal, setMuteNominal] = useState(false);

  const cellClass = (s) => {
    if (s.status === 'critical') return 'bg-crit';
    if (s.status === 'warning') return 'bg-warn';
    return 'bg-ink-3/25 hover:bg-ink-3/50';
  };

  const healthyCount = segments.filter((s) => s.status === 'healthy').length;
  const visibleCells = muteNominal ? segments.filter((s) => s.status !== 'healthy') : segments;

  return (
    <section className="panel">
      <div className="w-full flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <h2 className="panel-title">Track schematic</h2>
          <span className="font-mono text-[10px] text-ink-3">
            {segments.length > 0
              ? `${segments[0].segmentId} to ${segments[segments.length - 1].segmentId}`
              : 'no segments'}{' '}
            · {open ? 'hide' : 'show'}
          </span>
        </button>

        {/* Focus toggle — hide all nominal (healthy) cells */}
        {open && (
          <button
            onClick={() => setMuteNominal((v) => !v)}
            aria-pressed={muteNominal}
            title="Hide all healthy segments to focus on active alerts"
            className={`font-mono text-[10px] px-2 py-1 rounded border cursor-pointer
              transition-colors duration-150
              ${muteNominal
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line bg-surface-2 text-ink-3 hover:text-ink-2'}`}
          >
            {muteNominal ? `Nominal muted · ${healthyCount} hidden` : 'Mute nominal'}
          </button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4">
          {muteNominal && visibleCells.length === 0 ? (
            <p className="text-[11px] text-ink-3 py-3 text-center">
              All segments nominal — nothing active to show.
            </p>
          ) : (
          <div className="flex flex-wrap gap-[3px]">
            {visibleCells.map((s) => (
              <button
                key={s.segmentId}
                onClick={() => onSelect && onSelect(s.segmentId)}
                title={`${s.segmentId} · ${s.status} · risk ${(s.riskScore ?? 0).toFixed(1)}`}
                aria-label={`${s.segmentId}, ${s.status}, risk ${(s.riskScore ?? 0).toFixed(1)}`}
                className={`h-[18px] w-[13px] rounded-[2px] transition-[colors,transform] duration-150 cursor-pointer
                  ${cellClass(s)}
                  ${selectedId === s.segmentId
                    ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-1 scale-[1.25] relative z-10'
                    : ''}`}
              />
            ))}
          </div>
          )}
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
