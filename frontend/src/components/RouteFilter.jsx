import React, { useState, useEffect } from 'react';
import { getStations } from '../services/api';

const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236A7383' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`;

const selectClass = `w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs
  text-ink focus:outline-none focus:border-accent/60 appearance-none cursor-pointer
  disabled:opacity-40 disabled:cursor-default`;

const selectStyle = {
  backgroundImage: SELECT_ARROW,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

/**
 * RouteFilter — scopes the console to a startStation→endStation corridor.
 *
 * The backend keeps only raw track coordinates cached; picking a route here
 * makes it slice 1-km segments and compute curvature on demand. An active
 * route is therefore a real query scope, not a cosmetic filter — the chip and
 * summary line make that scope explicit, and "Full network" always offers the
 * way back to the default view.
 */
export default function RouteFilter({ routeQuery, routeInfo, onRouteChange }) {
  const [stations, setStations] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getStations()
      .then((data) => {
        if (cancelled) return;
        setStations(data.stations || []);
        if (data.stations?.length >= 2) {
          setStart(data.stations[0].name);
          setEnd(data.stations[data.stations.length - 1].name);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Station list unavailable — raw track data not seeded');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = Boolean(routeQuery);
  const sameStation = start !== '' && start === end;
  const canApply = start && end && !sameStation;
  const isApplied =
    active && routeQuery.startStation === start && routeQuery.endStation === end;

  const handleSwap = () => {
    setStart(end);
    setEnd(start);
  };

  const handleApply = () => {
    if (canApply) onRouteChange({ startStation: start, endStation: end });
  };

  return (
    <section className="panel">
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 className="panel-title">Route scope</h2>
        {active ? (
          <span className="chip bg-accent/10 text-accent">filtered</span>
        ) : (
          <span className="chip bg-surface-3 text-ink-3">full network</span>
        )}
        {routeInfo && (
          <span className="ml-auto font-mono text-[10px] text-ink-3">
            {routeInfo.coveredKm} km · {routeInfo.segmentCount} segments
            {routeInfo.truncated ? ` · first 100 km of ${routeInfo.totalRouteKm}` : ''}
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        {loadError ? (
          <p className="px-3 py-2 rounded-lg bg-surface-2 border border-line text-[11px] text-ink-3">
            {loadError}
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1 min-w-0">
              <label htmlFor="route-start-select" className="block text-[11px] text-ink-2 mb-1">
                Start station
              </label>
              <select
                id="route-start-select"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={stations.length === 0}
                className={selectClass}
                style={selectStyle}
              >
                {stations.map((s) => (
                  <option key={s.code} value={s.name} className="bg-surface-3 text-ink">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSwap}
              disabled={stations.length === 0}
              aria-label="Swap start and end station"
              title="Swap direction"
              className="btn-ghost px-3 py-2 self-start sm:self-auto"
            >
              ⇄
            </button>

            <div className="flex-1 min-w-0">
              <label htmlFor="route-end-select" className="block text-[11px] text-ink-2 mb-1">
                End station
              </label>
              <select
                id="route-end-select"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={stations.length === 0}
                className={selectClass}
                style={selectStyle}
              >
                {stations.map((s) => (
                  <option key={s.code} value={s.name} className="bg-surface-3 text-ink">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleApply}
              disabled={!canApply || isApplied}
              className="btn-accent px-4 py-2"
            >
              {isApplied ? 'Showing route' : 'Compute route'}
            </button>

            {active && (
              <button onClick={() => onRouteChange(null)} className="btn-ghost px-3 py-2">
                Full network
              </button>
            )}
          </div>
        )}

        {sameStation && (
          <p className="mt-2 text-[11px] text-warn">
            Start and end station must differ.
          </p>
        )}
      </div>
    </section>
  );
}
