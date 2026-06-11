// backend/scripts/seedRawTracks.js
// RAW DATA LAYER — fetches raw railway geometry (ways + node lat/lon) from the
// Overpass API for the Mumbai–Pune corridor and caches it as plain JSON.
//
// IMPORTANT: This script stores RAW geographic data ONLY. No segmentation, no
// distance math, no curvature. All physics happens just-in-time in
// services/routeProcessor.js when the frontend requests a route.
//
// Usage: node scripts/seedRawTracks.js
// Output: backend/data/raw-tracks-db.json

const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "raw-tracks-db.json");

// Named stations along the corridor. These are the route endpoints the
// frontend can pick from; the JIT processor resolves names → coordinates.
const STATIONS = [
  { name: "Mumbai CSMT", code: "CSMT", lat: 18.9398, lon: 72.8355 },
  { name: "Dadar", code: "DR", lat: 19.0186, lon: 72.8443 },
  { name: "Thane", code: "TNA", lat: 19.1860, lon: 72.9754 },
  { name: "Kalyan Junction", code: "KYN", lat: 19.2353, lon: 73.1305 },
  { name: "Karjat", code: "KJT", lat: 18.9107, lon: 73.3236 },
  { name: "Lonavala", code: "LNL", lat: 18.7522, lon: 73.4062 },
  { name: "Pune Junction", code: "PUNE", lat: 18.5286, lon: 73.8744 },
];

// Bounding box covering the whole corridor: south, west, north, east
const BBOX = [18.40, 72.75, 19.35, 74.00];

// Mainline rail only — excludes yards/sidings (tagged with service=*)
const OVERPASS_QUERY = `
[out:json][timeout:120];
way["railway"="rail"]["service"!~"."](${BBOX.join(",")});
(._;>;);
out skel qt;
`;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/**
 * Fetch raw OSM railway data from the Overpass API.
 * @returns {Promise<{ways: Array, nodes: Object}>} raw ways + node coordinates
 */
async function fetchFromOverpass() {
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Querying Overpass: ${endpoint} ...`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "RailGuard-Hackathon/1.0 (railway safety demo)",
          "Accept": "application/json",
        },
        body: "data=" + encodeURIComponent(OVERPASS_QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const osm = await res.json();

      // Store exactly what OSM gives us: ways reference node IDs, nodes hold lat/lon
      const nodes = {};
      const ways = [];
      for (const el of osm.elements) {
        if (el.type === "node") {
          nodes[el.id] = [el.lat, el.lon];
        } else if (el.type === "way" && Array.isArray(el.nodes)) {
          ways.push({ id: el.id, nodeRefs: el.nodes });
        }
      }
      if (ways.length === 0) throw new Error("Overpass returned no railway ways");
      return { ways, nodes, source: "overpass" };
    } catch (err) {
      lastError = err;
      console.warn(`Overpass endpoint failed: ${err.message}`);
    }
  }
  throw lastError || new Error("All Overpass endpoints failed");
}

/**
 * Offline fallback: synthesize raw coordinates along the real corridor so the
 * pipeline still works without internet (hackathon wifi insurance).
 * Generates raw lat/lon points only — still no segments, no curvature values.
 * Interpolates between real station coordinates with smooth lateral offsets,
 * tighter wiggle on the Karjat–Lonavala leg to mimic the Bhor Ghat curves.
 */
function synthesizeCorridor() {
  console.warn("Falling back to synthetic corridor geometry (raw points only).");
  const nodes = {};
  const ways = [];
  let nodeId = 1;

  for (let s = 0; s < STATIONS.length - 1; s++) {
    const a = STATIONS[s];
    const b = STATIONS[s + 1];
    // ~150 m spacing between raw points (1° lat ≈ 111 km)
    const legKm = Math.hypot(b.lat - a.lat, (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180)) * 111;
    const steps = Math.max(10, Math.round((legKm * 1000) / 150));

    // Ghat section gets sharp serpentine curves; plains get gentle sweeps
    const isGhat = a.code === "KJT";
    const amplitude = isGhat ? 0.004 : 0.0012; // degrees of lateral offset
    const frequency = isGhat ? 9 : 2.5;        // bends per leg

    const wayRefs = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Perpendicular unit vector to the leg, for lateral curve offsets
      const dLat = b.lat - a.lat;
      const dLon = b.lon - a.lon;
      const len = Math.hypot(dLat, dLon) || 1;
      const offset = Math.sin(t * Math.PI * frequency) * amplitude * Math.sin(t * Math.PI);
      const lat = a.lat + dLat * t + (-dLon / len) * offset;
      const lon = a.lon + dLon * t + (dLat / len) * offset;
      nodes[nodeId] = [parseFloat(lat.toFixed(7)), parseFloat(lon.toFixed(7))];
      wayRefs.push(nodeId);
      nodeId++;
    }
    ways.push({ id: 9000 + s, nodeRefs: wayRefs });
  }
  return { ways, nodes, source: "synthetic" };
}

async function main() {
  let raw;
  try {
    raw = await fetchFromOverpass();
  } catch (err) {
    console.warn(`Overpass unavailable (${err.message}).`);
    raw = synthesizeCorridor();
  }

  const db = {
    meta: {
      region: "Mumbai–Pune railway corridor, India",
      bbox: BBOX,
      source: raw.source,
      fetchedAt: new Date().toISOString(),
      note: "RAW geographic data only. Segmentation, distance, and curvature are computed on demand by services/routeProcessor.js.",
    },
    stations: STATIONS,
    ways: raw.ways,
    nodes: raw.nodes,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(db));

  const sizeMb = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);
  console.log(
    `Saved ${raw.ways.length} ways / ${Object.keys(raw.nodes).length} nodes ` +
    `(${raw.source}) → ${OUTPUT_PATH} (${sizeMb} MB)`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
