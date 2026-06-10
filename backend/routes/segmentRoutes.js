// backend/routes/segmentRoutes.js
// GET /api/segments, GET /api/segments/:segmentId, POST /api/segments/:segmentId/simulate

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");
const {
  DEFAULT_SPIKE_VALUE,
  DEFAULT_HEALTHY_VIBRATION,
  MAX_VIBRATION_HISTORY,
} = require("../utils/constants");

// GET /api/segments — return all 100 segments with recalculated risk
router.get("/segments", (req, res) => {
  segments.forEach((segment) => {
    const { riskScore, status } = calculateRisk(segment);
    segment.riskScore = riskScore;
    segment.status = status;
    segment.lastUpdated = new Date().toISOString();
  });

  res.json({ segments });
});

// GET /api/segments/:segmentId — return one segment by ID
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

  res.json({ segment });
});

// POST /api/segments/:segmentId/simulate — simulate state changes for demo
// Actions: "spike" (set vibration), "crack" (add crack), "incident" (add incident), "reset" (healthy defaults)
router.post("/segments/:segmentId/simulate", (req, res) => {
  const { segmentId } = req.params;
  const { action, value } = req.body;
  const segment = segments.find((s) => s.segmentId === segmentId);

  if (!segment) {
    return res.status(404).json({ error: `Segment ${segmentId} not found` });
  }

  if (!action) {
    return res.status(400).json({ error: "Missing 'action' in request body" });
  }

  switch (action) {
    case "spike": {
      // Set vibration level to value or default spike
      const spikeValue = typeof value === "number" ? value : DEFAULT_SPIKE_VALUE;
      segment.vibrationLevel = parseFloat(spikeValue.toFixed(2));

      // Push a new vibration history entry reflecting the spike
      segment.vibrationHistory.push({
        timestamp: new Date().toISOString(),
        vibrationLevel: segment.vibrationLevel,
        temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
        crackDetected: false,
      });
      if (segment.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
        segment.vibrationHistory.shift();
      }
      break;
    }

    case "crack": {
      // Increment crack count
      segment.crackCount += 1;

      // Mark the latest history entry as crack detected
      segment.vibrationHistory.push({
        timestamp: new Date().toISOString(),
        vibrationLevel: segment.vibrationLevel,
        temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
        crackDetected: true,
      });
      if (segment.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
        segment.vibrationHistory.shift();
      }
      break;
    }

    case "incident": {
      // Increment incident count
      segment.incidentCount += 1;
      break;
    }

    case "reset": {
      // Return segment to healthy defaults
      segment.vibrationLevel = DEFAULT_HEALTHY_VIBRATION;
      segment.crackCount = 0;
      segment.incidentCount = 0;
      segment.daysSinceInspection = 0;
      segment.activeDefects = [];

      // Push a clean vibration history entry
      segment.vibrationHistory.push({
        timestamp: new Date().toISOString(),
        vibrationLevel: DEFAULT_HEALTHY_VIBRATION,
        temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
        crackDetected: false,
      });
      if (segment.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
        segment.vibrationHistory.shift();
      }
      break;
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${action}. Valid actions: spike, crack, incident, reset` });
  }

  // Recalculate risk after simulation action
  const { riskScore, status } = calculateRisk(segment);
  segment.riskScore = riskScore;
  segment.status = status;
  segment.lastUpdated = new Date().toISOString();

  res.json({ segment });
});

module.exports = router;
