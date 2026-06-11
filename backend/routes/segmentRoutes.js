// backend/routes/segmentRoutes.js
// GET  /api/stations                     — stations available for route filtering
// GET  /api/segments?startStation=&endStation= — JIT route segments with recalculated risk
// GET  /api/segments/:segmentId          — return one segment by ID (+ prediction + trendSummary)
// POST /api/segments/:segmentId/simulate — simulate spike/crack/reset actions

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk, predictTimeToCritical, getTrendSummary } = require("../services/riskEngine");
const { loadRawData, getStations, processRoute } = require("../services/routeProcessor");
const { MAX_VIBRATION_HISTORY } = require("../utils/constants");
const { protect, adminOnly } = require("../middleware/auth");

// GET /api/stations — station list for the frontend RouteFilter
router.get("/stations", (req, res) => {
  res.json({ stations: getStations() });
});

// GET /api/segments — "Cache Raw Data, Compute on Demand":
// reads cached raw coordinates, JIT-slices them into 1-km segments for the
// requested route (default: full corridor), attaches the geometry to the live
// telemetry store, and returns risk-assessed segments.
router.get("/segments", (req, res) => {
  const { startStation, endStation } = req.query;

  // Geometry layer — computed on demand from raw data. If the raw DB hasn't
  // been seeded, fall back to plain telemetry segments (no geometry).
  let geo = null;
  const rawData = loadRawData();
  if (rawData) {
    try {
      geo = processRoute(rawData, startStation, endStation);
    } catch (err) {
      // Bad station names are a client error; anything else falls through
      if (startStation || endStation) {
        return res.status(400).json({
          error: err.message,
          stations: getStations().map((s) => s.name),
        });
      }
    }
  }

  const now = new Date().toISOString();

  if (!geo) {
    segments.forEach((segment) => {
      const { riskScore, status } = calculateRisk(segment);
      segment.riskScore = riskScore;
      segment.status = status;
      segment.lastUpdated = now;
    });
    segments.save();
    return res.json({ segments });
  }

  // Merge JIT geometry onto the live telemetry segments (same SEG-NNN ids) so
  // the simulator, monitoring loop, and detail view stay on one source of truth.
  const routeSegments = geo.segments.map((g, i) => {
    const segment = segments[i]; // SEG-001 ↔ index 0: O(1) lookup
    segment.startCoord = g.startCoord;
    segment.endCoord = g.endCoord;
    segment.distanceKm = g.distanceKm;
    segment.radiusOfCurvature = g.radiusOfCurvature;

    const { riskScore, status } = calculateRisk(segment);
    segment.riskScore = riskScore;
    segment.status = status;
    segment.lastUpdated = now;
    return segment;
  });

  segments.save();
  res.json({ segments: routeSegments, route: geo.route });
});

// GET /api/segments/:segmentId — return one segment by ID with trend prediction
router.get("/segments/:segmentId", (req, res) => {
  const { segmentId } = req.params;
  const segment = segments.find((s) => s.segmentId === segmentId);

  if (!segment) {
    return res.status(404).json({ error: `Segment ${segmentId} not found` });
  }

  const { riskScore, status } = calculateRisk(segment);
  segment.riskScore = riskScore;
  segment.status = status;
  segment.lastUpdated = new Date().toISOString();

  const prediction = predictTimeToCritical(segment);
  const trendSummary = getTrendSummary(segment);

  segments.save();
  res.json({ segment: { ...segment, prediction, trendSummary } });
});

// POST /api/segments/:segmentId/simulate — simulate spike/crack/reset actions (admin only)
router.post("/segments/:segmentId/simulate", protect, adminOnly, (req, res) => {
  const { segmentId } = req.params;
  const { action, value } = req.body;

  const seg = segments.find((s) => s.segmentId === segmentId);
  if (!seg) {
    return res.status(404).json({ error: `Segment ${segmentId} not found` });
  }

  if (action === "spike") {
    seg.vibrationLevel = value;
    seg.vibrationHistory = [];
    const now = Date.now();
    for (let j = 0; j < MAX_VIBRATION_HISTORY; j++) {
      const baseVibe = 2.0 + (j * (value - 2.0) / (MAX_VIBRATION_HISTORY - 1));
      const vibe = parseFloat((baseVibe + (Math.random() - 0.5) * 0.2).toFixed(2));
      seg.vibrationHistory.push({
        timestamp: new Date(now - (MAX_VIBRATION_HISTORY - j) * 10 * 1000).toISOString(),
        vibrationLevel: vibe,
        temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
        crackDetected: false
      });
    }

  } else if (action === "crack") {
    seg.crackCount += 1;
    seg.vibrationHistory.push({
      timestamp: new Date().toISOString(),
      vibrationLevel: seg.vibrationLevel,
      temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
      crackDetected: true
    });
    if (seg.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
      seg.vibrationHistory.shift();
    }

  } else if (action === "reset") {
    seg.vibrationLevel = 2.0;
    seg.crackCount = 0;
    seg.incidentCount = 0;
    seg.activeDefects = [];
    seg.vibrationHistory.push({
      timestamp: new Date().toISOString(),
      vibrationLevel: 2.0,
      temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
      crackDetected: false
    });
    if (seg.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
      seg.vibrationHistory.shift();
    }

  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  // Recalculate risk after simulation
  const { riskScore, status } = calculateRisk(seg);
  seg.riskScore = riskScore;
  seg.status = status;
  seg.lastUpdated = new Date().toISOString();

  segments.save();
  res.json({ segment: seg });
});

module.exports = router;
