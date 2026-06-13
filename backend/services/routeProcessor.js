// backend/services/routeProcessor.js
// JUST-IN-TIME ROUTE PROCESSOR — "Cache Raw Data, Compute on Demand".
//
// Takes the RAW node cloud cached in data/raw-tracks-db.json and, at request
// time, turns it into 1-km TrackSegment geometry for a startStation→endStation
// route:
//   1. Corridor extraction — project every raw node onto the station-chain
//      polyline, keep nodes within the corridor buffer, order by chainage.
//   2. Centerline resampling — average nodes into 100 m buckets so parallel
//      tracks collapse into one clean alignment (protects curvature math).
//   3. Segmentation — walk the centerline with the Haversine formula and cut
//      a TrackSegment every 1.00 km. IDs are SEG-001, SEG-002, ...
//   4. Curvature — circumcircle radius through 3 points of each segment
//      (start / middle / end). Straight track → 0.
//
// No AI, no I/O besides the one-time raw file read. Results are memoized per
// route so the 5-second frontend polling loop never re-runs the math.

const fs = require("fs");
const path = require("path");
const { TOTAL_SEGMENTS, SEGMENT_ID_PREFIX } = require("../utils/constants");

const RAW_DB_PATH = path.join(__dirname, "..", "data", "raw-tracks-db.json");

const SEGMENT_LENGTH_KM = 1.0;       // spec: 1-kilometer TrackSegments
const CORRIDOR_HALF_WIDTH_KM = 2.5;  // buffer around the station-chain polyline
const CENTERLINE_BUCKET_KM = 0.1;    // resample resolution (10 pts per km)
const SMOOTHING_HALF_WINDOW = 2;     // ±2 buckets (~500 m) moving average
const STRAIGHT_RADIUS_MAX_M = 10000; // circumradius beyond this = straight (0)
const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LON_EQ = 111.32;
const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

let rawDataCache = null;       // parsed raw-tracks-db.json (read once)
const routeCache = new Map();  // "START|END" → processed route result

/**
 * Read and cache the raw track database. Raw data is static for the process
 * lifetime, so one synchronous read at first use is the fastest option.
 * @returns {Object|null} parsed raw DB, or null when the seed hasn't run
 */
function loadRawData() {
  if (rawDataCache) return rawDataCache;
  if (!fs.existsSync(RAW_DB_PATH)) return null;
  rawDataCache = JSON.parse(fs.readFileSync(RAW_DB_PATH, "utf8"));
  return rawDataCache;
}

/** @returns {Array<{name,code,lat,lon}>} stations available for routing */
function getStations() {
  const raw = loadRawData();
  return raw ? raw.stations : [];
}

/**
 * Great-circle distance between two coordinates via the Haversine formula.
 * @returns {number} distance in kilometers
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Radius of the circumcircle through a segment's 3 sample points (start, mid,
 * end) — the standard proxy for how sharply the track curves. A tighter curve
 * has a smaller circumradius, which the risk engine turns into a higher penalty.
 *
 * METHOD:
 *  1. Project the three geographic points to a local planar frame (km) with an
 *     equirectangular projection anchored at p1 (longitude scaled by cos(lat) so
 *     east–west distances aren't overstated). Over a ~1 km window this is exact
 *     enough that great-circle error is negligible.
 *  2. Triangle area via the cross-product (shoelace) determinant, which gives
 *     TWICE the area directly and avoids the catastrophic cancellation that the
 *     classical three-side Heron's formula suffers on near-collinear points:
 *         2·Area = |(B−A) × (C−A)| = |(bx−ax)(cy−ay) − (cx−ax)(by−ay)|
 *  3. Circumradius from the law of sines, R = (a·b·c) / (4·Area), where a, b, c
 *     are the side lengths. With 2·Area in hand: R = a·b·c / (2 · 2·Area). The
 *     ×1000 converts km → meters.
 *
 * Collinear points yield ~0 area (straight track) → return 0 (no curve penalty);
 * very gentle curves with R beyond STRAIGHT_RADIUS_MAX_M are also treated as
 * straight to avoid noise on effectively-tangent track.
 *
 * @param {{lat:number,lon:number}} p1 - segment start
 * @param {{lat:number,lon:number}} p2 - segment midpoint
 * @param {{lat:number,lon:number}} p3 - segment end
 * @param {number} cosLat - cos(meanLatitude), the longitude scale factor
 * @returns {number} circumradius in meters, or 0 for straight track
 */
function circumradiusMeters(p1, p2, p3, cosLat) {
  // (1) Local equirectangular projection (km), origin at p1 → A=(0,0).
  const ax = 0, ay = 0;
  const bx = (p2.lon - p1.lon) * cosLat * KM_PER_DEG_LON_EQ;
  const by = (p2.lat - p1.lat) * KM_PER_DEG_LAT;
  const cx = (p3.lon - p1.lon) * cosLat * KM_PER_DEG_LON_EQ;
  const cy = (p3.lat - p1.lat) * KM_PER_DEG_LAT;

  // (2) 2·Area via the cross-product determinant of edges AB and AC.
  const area2 = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)); // 2·Area
  if (area2 < 1e-9) return 0; // collinear → straight

  // (3) Side lengths a=|BC|, b=|CA|, c=|AB|, then R = abc / (4·Area) = abc / (2·area2).
  const a = Math.hypot(cx - bx, cy - by);
  const b = Math.hypot(cx - ax, cy - ay);
  const c = Math.hypot(bx - ax, by - ay);
  const radiusM = ((a * b * c) / (2 * area2)) * 1000;

  return radiusM > STRAIGHT_RADIUS_MAX_M ? 0 : radiusM;
}

/**
 * Resolve a station by name or code (case-insensitive, partial match allowed).
 * @returns {number} index into stations[], or -1
 */
function findStationIndex(stations, query) {
  if (!query) return -1;
  const q = String(query).trim().toLowerCase();
  let idx = stations.findIndex(
    (s) => s.name.toLowerCase() === q || s.code.toLowerCase() === q
  );
  if (idx === -1) idx = stations.findIndex((s) => s.name.toLowerCase().includes(q));
  return idx;
}

/**
 * Extract an ordered centerline along the station chain from the raw node
 * cloud, then resample it into evenly spaced points.
 * @returns {Array<{lat,lon}>} ordered centerline points
 */
function buildCenterline(raw, stationPath) {
  // Precompute the corridor legs in planar km (single projection basis)
  const latMid = stationPath.reduce((s, st) => s + st.lat, 0) / stationPath.length;
  const cosLat = Math.cos(latMid * DEG_TO_RAD);
  const toXY = (lat, lon) => [lon * cosLat * KM_PER_DEG_LON_EQ, lat * KM_PER_DEG_LAT];

  const legs = [];
  let cumKm = 0;
  for (let i = 0; i < stationPath.length - 1; i++) {
    const [x1, y1] = toXY(stationPath[i].lat, stationPath[i].lon);
    const [x2, y2] = toXY(stationPath[i + 1].lat, stationPath[i + 1].lon);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenKm = Math.hypot(dx, dy);
    legs.push({ x1, y1, dx, dy, lenKm, len2: dx * dx + dy * dy, startKm: cumKm });
    cumKm += lenKm;
  }

  // Single pass over all raw nodes: nearest-leg projection → chainage bucket.
  // Buckets average parallel tracks into one centerline point.
  const buckets = new Map(); // bucketIdx → { latSum, lonSum, n }
  const nodes = raw.nodes;
  for (const id in nodes) {
    const lat = nodes[id][0];
    const lon = nodes[id][1];
    const x = lon * cosLat * KM_PER_DEG_LON_EQ;
    const y = lat * KM_PER_DEG_LAT;

    let bestPerp = Infinity;
    let bestChainage = -1;
    for (let l = 0; l < legs.length; l++) {
      const leg = legs[l];
      let t = ((x - leg.x1) * leg.dx + (y - leg.y1) * leg.dy) / leg.len2;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const px = leg.x1 + t * leg.dx - x;
      const py = leg.y1 + t * leg.dy - y;
      const perp = px * px + py * py; // squared km — sqrt deferred
      if (perp < bestPerp) {
        bestPerp = perp;
        bestChainage = leg.startKm + t * leg.lenKm;
      }
    }

    if (bestPerp <= CORRIDOR_HALF_WIDTH_KM * CORRIDOR_HALF_WIDTH_KM) {
      const bucketIdx = Math.floor(bestChainage / CENTERLINE_BUCKET_KM);
      let bucket = buckets.get(bucketIdx);
      if (!bucket) {
        bucket = { latSum: 0, lonSum: 0, n: 0 };
        buckets.set(bucketIdx, bucket);
      }
      bucket.latSum += lat;
      bucket.lonSum += lon;
      bucket.n++;
    }
  }

  // Ordered centerline: bucket centroids sorted by chainage
  const centroids = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, b]) => ({ lat: b.latSum / b.n, lon: b.lonSum / b.n }));

  // Moving-average smoothing (~±500 m): centroids hop laterally where parallel
  // tracks or branches enter/leave a bucket; unsoothed, that zigzag inflates
  // walked distance and fakes sharp curvature.
  const smoothed = new Array(centroids.length);
  for (let i = 0; i < centroids.length; i++) {
    const from = Math.max(0, i - SMOOTHING_HALF_WINDOW);
    const to = Math.min(centroids.length - 1, i + SMOOTHING_HALF_WINDOW);
    let latSum = 0;
    let lonSum = 0;
    for (let j = from; j <= to; j++) {
      latSum += centroids[j].lat;
      lonSum += centroids[j].lon;
    }
    const n = to - from + 1;
    smoothed[i] = { lat: latSum / n, lon: lonSum / n };
  }
  return smoothed;
}

/**
 * JIT-process a route: slice the centerline into 1-km TrackSegment geometry
 * with dynamically computed curvature. Memoized per start|end pair.
 *
 * @param {Object} rawData - parsed raw-tracks-db.json content
 * @param {string} [startStation] - station name/code (default: corridor start)
 * @param {string} [endStation]   - station name/code (default: corridor end)
 * @returns {{segments: Array, route: Object}} geometry segments + route summary
 * @throws {Error} when a station name cannot be resolved
 */
function processRoute(rawData, startStation, endStation) {
  const raw = rawData || loadRawData();
  if (!raw) throw new Error("Raw track data not seeded. Run: node scripts/seedRawTracks.js");

  const stations = raw.stations;
  const start = startStation || stations[0].name;
  const end = endStation || stations[stations.length - 1].name;

  const cacheKey = `${start.toLowerCase()}|${end.toLowerCase()}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  const startIdx = findStationIndex(stations, start);
  const endIdx = findStationIndex(stations, end);
  if (startIdx === -1) throw new Error(`Unknown start station: "${start}"`);
  if (endIdx === -1) throw new Error(`Unknown end station: "${end}"`);
  if (startIdx === endIdx) throw new Error("Start and end station must differ");

  // Station chain between the endpoints (reversed routes supported)
  const ascending = startIdx < endIdx;
  const chain = ascending
    ? stations.slice(startIdx, endIdx + 1)
    : stations.slice(endIdx, startIdx + 1).reverse();

  const centerline = buildCenterline(raw, chain);
  if (centerline.length < 3) {
    throw new Error("Not enough raw track nodes in this corridor to build a route");
  }

  const cosLat = Math.cos(((chain[0].lat + chain[chain.length - 1].lat) / 2) * DEG_TO_RAD);

  // Walk the centerline, cutting a TrackSegment every SEGMENT_LENGTH_KM
  const geoSegments = [];
  let segPoints = [centerline[0]];
  let segKm = 0;
  let totalKm = 0;

  const closeSegment = () => {
    const first = segPoints[0];
    const last = segPoints[segPoints.length - 1];
    const mid = segPoints[Math.floor(segPoints.length / 2)];
    const radius = segPoints.length >= 3 ? circumradiusMeters(first, mid, last, cosLat) : 0;
    geoSegments.push({
      segmentId: `${SEGMENT_ID_PREFIX}${String(geoSegments.length + 1).padStart(3, "0")}`,
      startCoord: { lat: parseFloat(first.lat.toFixed(5)), lon: parseFloat(first.lon.toFixed(5)) },
      endCoord: { lat: parseFloat(last.lat.toFixed(5)), lon: parseFloat(last.lon.toFixed(5)) },
      distanceKm: parseFloat(segKm.toFixed(2)),
      radiusOfCurvature: parseFloat(radius.toFixed(2)),
    });
  };

  for (let i = 1; i < centerline.length; i++) {
    const prev = centerline[i - 1];
    const curr = centerline[i];
    const stepKm = haversineKm(prev.lat, prev.lon, curr.lat, curr.lon);
    segKm += stepKm;
    totalKm += stepKm;
    segPoints.push(curr);

    if (segKm >= SEGMENT_LENGTH_KM) {
      closeSegment();
      segPoints = [curr];
      segKm = 0;
    }
  }
  // Trailing partial segment (route remainder under 1 km)
  if (segKm > 0.05 && segPoints.length >= 2) {
    closeSegment();
  }

  const result = {
    segments: geoSegments,
    route: {
      startStation: stations[startIdx].name,
      endStation: stations[endIdx].name,
      segmentCount: geoSegments.length,
      coveredKm: parseFloat(geoSegments.reduce((s, g) => s + g.distanceKm, 0).toFixed(2)),
      totalRouteKm: parseFloat(totalKm.toFixed(2)),
      truncated: false,
      dataSource: raw.meta.source,
    },
  };

  routeCache.set(cacheKey, result);
  return result;
}

module.exports = { loadRawData, getStations, processRoute, haversineKm, circumradiusMeters };
