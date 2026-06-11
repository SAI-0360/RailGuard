// Quick verification of the JIT route processor: correctness + speed.
// Usage: node scripts/testRouteProcessor.js
const { loadRawData, processRoute } = require("../services/routeProcessor");

const raw = loadRawData();
if (!raw) {
  console.error("raw-tracks-db.json missing — run scripts/seedRawTracks.js first");
  process.exit(1);
}
console.log(`Raw source: ${raw.meta.source}, ways: ${raw.ways.length}, nodes: ${Object.keys(raw.nodes).length}`);

function show(label, start, end) {
  const t0 = process.hrtime.bigint();
  const { segments, route } = processRoute(raw, start, end);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const curved = segments.filter((s) => s.radiusOfCurvature > 0);
  const sharpest = curved.length
    ? curved.reduce((m, s) => (s.radiusOfCurvature < m.radiusOfCurvature ? s : m))
    : null;
  console.log(
    `\n${label}: ${route.startStation} → ${route.endStation} (${ms.toFixed(1)} ms)\n` +
    `  segments: ${route.segmentCount}, covered: ${route.coveredKm} km, total: ${route.totalRouteKm} km, truncated: ${route.truncated}\n` +
    `  curved segments: ${curved.length}/${segments.length}` +
    (sharpest ? `, sharpest radius: ${sharpest.radiusOfCurvature} m (${sharpest.segmentId})` : "")
  );
  console.log("  first:", JSON.stringify(segments[0]));
}

show("Default (full corridor)", undefined, undefined);
show("Ghat section", "Karjat", "Lonavala");
show("Reversed", "Pune Junction", "Thane");
show("Code match", "kjt", "lnl");

// Memoization speed: second call must be near-instant
const t0 = process.hrtime.bigint();
processRoute(raw, "Karjat", "Lonavala");
console.log(`\nMemoized re-call: ${(Number(process.hrtime.bigint() - t0) / 1e6).toFixed(3)} ms`);

// Error path
try {
  processRoute(raw, "Atlantis", "Pune Junction");
} catch (e) {
  console.log(`Unknown station correctly rejected: "${e.message}"`);
}
