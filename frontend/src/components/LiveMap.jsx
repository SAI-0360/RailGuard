import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getStatusColors } from '../utils/statusColors';

/**
 * LiveMap — the route rendered on real geography.
 *
 * Each 1-km segment is a polyline between its JIT-computed start/end
 * coordinates. The instrument-panel rules carry over from the schematic:
 * healthy track is deliberately dim (work by exception), warning and critical
 * are lit in their reserved severity hues, and critical pulses — the one
 * looping motion this surface is allowed, because an unacknowledged critical
 * IS a live alarm state. Selection wears the accent halo, never a severity hue.
 */

// CARTO dark tiles — closest basemap to the console's #0B0D12 surface
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const STYLE_BY_STATUS = {
  healthy: { weight: 3, opacity: 0.45 },
  warning: { weight: 5, opacity: 0.9 },
  critical: { weight: 5, opacity: 1 },
};

/** Fit the viewport to the route once per route change, not on every poll. */
function FitToRoute({ bounds, routeKey }) {
  const map = useMap();
  React.useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [28, 28] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, map]);
  return null;
}

export default function LiveMap({ segments = [], selectedId, onSelect }) {
  // Only segments that carry JIT geometry can be drawn
  const mapped = useMemo(
    () => segments.filter((s) => s.startCoord && s.endCoord),
    [segments]
  );

  // Route identity: refit the camera only when the actual corridor changes
  const routeKey = mapped.length
    ? `${mapped[0].segmentId}:${mapped[mapped.length - 1].segmentId}:${mapped.length}:${mapped[0].startCoord.lat}`
    : 'empty';

  const bounds = useMemo(() => {
    if (!mapped.length) return null;
    let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
    mapped.forEach((s) => {
      [s.startCoord, s.endCoord].forEach((c) => {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lon < minLon) minLon = c.lon;
        if (c.lon > maxLon) maxLon = c.lon;
      });
    });
    return [[minLat, minLon], [maxLat, maxLon]];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const counts = useMemo(() => {
    let warning = 0, critical = 0;
    mapped.forEach((s) => {
      if (s.status === 'critical') critical++;
      else if (s.status === 'warning') warning++;
    });
    return { warning, critical };
  }, [mapped]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 className="panel-title">Live map</h2>
        {counts.critical > 0 && <span className="chip-crit">{counts.critical} critical</span>}
        {counts.warning > 0 && <span className="chip-warn">{counts.warning} warning</span>}
        <span className="ml-auto font-mono text-[10px] text-ink-3">
          {mapped.length > 0
            ? `${mapped[0].segmentId} to ${mapped[mapped.length - 1].segmentId} · ${mapped.length} segments`
            : 'no geometry'}
        </span>
      </div>

      {mapped.length === 0 ? (
        // Empty state teaches the fix instead of saying "nothing here"
        <div className="h-[420px] flex flex-col items-center justify-center gap-2 border-t border-line">
          <p className="text-xs text-ink-2">No track geometry on this route yet.</p>
          <p className="text-[11px] text-ink-3 font-mono">
            backend&gt; npm run seed:tracks — then reload
          </p>
        </div>
      ) : (
        <div className="relative border-t border-line">
          <MapContainer
            bounds={bounds}
            scrollWheelZoom={true}
            zoomControl={true}
            attributionControl={true}
            className="h-[520px] w-full bg-bg outline-none"
          >
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} subdomains="abcd" />
            <FitToRoute bounds={bounds} routeKey={routeKey} />

            {/* Selection halo — accent vocabulary, painted under the severity line */}
            {mapped
              .filter((s) => s.segmentId === selectedId)
              .map((s) => (
                <Polyline
                  key={`halo-${s.segmentId}`}
                  positions={[
                    [s.startCoord.lat, s.startCoord.lon],
                    [s.endCoord.lat, s.endCoord.lon],
                  ]}
                  pathOptions={{ color: '#4CB8E8', weight: 11, opacity: 0.4, lineCap: 'round' }}
                  interactive={false}
                />
              ))}

            {mapped.map((s) => {
              const style = STYLE_BY_STATUS[s.status] || STYLE_BY_STATUS.healthy;
              return (
                <Polyline
                  key={s.segmentId}
                  positions={[
                    [s.startCoord.lat, s.startCoord.lon],
                    [s.endCoord.lat, s.endCoord.lon],
                  ]}
                  pathOptions={{
                    color: getStatusColors(s.status).hex,
                    weight: style.weight,
                    opacity: style.opacity,
                    lineCap: 'round',
                    className: s.status === 'critical' ? 'map-crit-blink' : '',
                  }}
                  eventHandlers={{
                    click: () => onSelect && onSelect(s.segmentId),
                    mouseover: (e) => e.target.setStyle({ weight: style.weight + 3 }),
                    mouseout: (e) => e.target.setStyle({ weight: style.weight }),
                  }}
                >
                  <Tooltip sticky className="map-tooltip" direction="top" offset={[0, -6]}>
                    <span className="font-mono">
                      {s.segmentId} · {s.status} · risk {(s.riskScore ?? 0).toFixed(1)}
                      {s.radiusOfCurvature > 0 ? ` · curve R ${Math.round(s.radiusOfCurvature)}m` : ''}
                    </span>
                  </Tooltip>
                </Polyline>
              );
            })}
          </MapContainer>

          {/* Legend — same vocabulary as the track schematic */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-4 rounded-lg
            bg-surface-1/90 border border-line px-3 py-1.5 font-mono text-[10px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-ok/50 inline-block" /> nominal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-warn inline-block" /> warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-crit inline-block" /> critical
            </span>
            <span className="text-ink-3/70">click a segment to focus</span>
          </div>
        </div>
      )}
    </section>
  );
}
