// backend/routes/demoRoutes.js
// POST /api/demo/scenario — Pre-scripted demo scenarios for live hackathon demo.
// Scenarios: "gradual_degradation", "multi_failure", "cascade"

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");
const {
  DEFAULT_SPIKE_VALUE,
  MAX_VIBRATION_HISTORY,
} = require("../utils/constants");

/**
 * Helper: spike a segment's vibration + optionally add cracks/incidents,
 * then recalculate risk and push vibration history entries.
 */
function degradeSegment(segment, { vibration = null, cracks = 0, incidents = 0 } = {}) {
  if (vibration !== null) {
    segment.vibrationLevel = parseFloat(vibration.toFixed(2));
  }
  segment.crackCount += cracks;
  segment.incidentCount += incidents;

  // Push new vibration history entry
  segment.vibrationHistory.push({
    timestamp: new Date().toISOString(),
    vibrationLevel: segment.vibrationLevel,
    temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
    crackDetected: cracks > 0,
  });
  if (segment.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
    segment.vibrationHistory.shift();
  }

  // Recalculate risk
  const { riskScore, status } = calculateRisk(segment);
  segment.riskScore = riskScore;
  segment.status = status;
  segment.lastUpdated = new Date().toISOString();
}

// POST /api/demo/scenario
router.post("/demo/scenario", (req, res) => {
  const { scenario } = req.body;

  if (!scenario) {
    return res.status(400).json({ error: "Missing 'scenario' in request body" });
  }

  switch (scenario) {
    // ─── Gradual Degradation ──────────────────────────────────────────────
    // Pick 5 segments, ramp vibration to warning range + add 1 crack each.
    // Result: 3 segments at warning, 2 segments at critical.
    case "gradual_degradation": {
      const targetIds = ["SEG-023", "SEG-042", "SEG-056", "SEG-073", "SEG-088"];
      const configs = [
        { vibration: 5.5, cracks: 0, incidents: 0 },  // warning
        { vibration: 6.2, cracks: 1, incidents: 0 },  // warning-high
        { vibration: 5.8, cracks: 0, incidents: 1 },  // warning
        { vibration: 7.5, cracks: 2, incidents: 1 },  // critical
        { vibration: 8.0, cracks: 1, incidents: 2 },  // critical
      ];

      const affected = [];
      targetIds.forEach((id, idx) => {
        const seg = segments.find(s => s.segmentId === id);
        if (seg) {
          degradeSegment(seg, configs[idx]);
          affected.push({ segmentId: id, status: seg.status, riskScore: seg.riskScore });
        }
      });

      return res.json({
        scenario: "gradual_degradation",
        message: `Degraded ${affected.length} segments: ${affected.map(a => `${a.segmentId}(${a.status})`).join(", ")}`,
        affected,
      });
    }

    // ─── Multi-Failure ────────────────────────────────────────────────────
    // 5 segments instantly go critical: spike vibration + cracks + incidents.
    // Demo math: vibration 9.5 alone = ~40.5 (warning). Need cracks+incidents for critical.
    case "multi_failure": {
      const targetIds = ["SEG-007", "SEG-029", "SEG-042", "SEG-061", "SEG-085"];
      const affected = [];

      targetIds.forEach(id => {
        const seg = segments.find(s => s.segmentId === id);
        if (seg) {
          degradeSegment(seg, {
            vibration: DEFAULT_SPIKE_VALUE,
            cracks: 2,
            incidents: 2,
          });
          affected.push({ segmentId: id, status: seg.status, riskScore: seg.riskScore });
        }
      });

      return res.json({
        scenario: "multi_failure",
        message: `${affected.length} segments forced to critical — multi-failure event`,
        affected,
      });
    }

    // ─── Cascade Effect ───────────────────────────────────────────────────
    // 1 segment goes critical immediately, 3 more start degrading (elevated warning).
    // Creates a dramatic "domino effect" visual for the demo.
    case "cascade": {
      const affected = [];

      // Primary failure — immediate critical
      const primary = segments.find(s => s.segmentId === "SEG-042");
      if (primary) {
        degradeSegment(primary, { vibration: 9.5, cracks: 3, incidents: 2 });
        affected.push({ segmentId: "SEG-042", status: primary.status, riskScore: primary.riskScore, role: "primary" });
      }

      // Adjacent segments start degrading
      const cascadeTargets = [
        { id: "SEG-041", vibration: 5.5, cracks: 1, incidents: 0 },
        { id: "SEG-043", vibration: 6.0, cracks: 0, incidents: 1 },
        { id: "SEG-032", vibration: 5.2, cracks: 1, incidents: 1 },
      ];

      cascadeTargets.forEach(({ id, vibration, cracks, incidents }) => {
        const seg = segments.find(s => s.segmentId === id);
        if (seg) {
          degradeSegment(seg, { vibration, cracks, incidents });
          affected.push({ segmentId: id, status: seg.status, riskScore: seg.riskScore, role: "cascade" });
        }
      });

      return res.json({
        scenario: "cascade",
        message: `Cascade event: SEG-042 critical, ${cascadeTargets.length} adjacent segments degrading`,
        affected,
      });
    }

    default:
      return res.status(400).json({
        error: `Unknown scenario: "${scenario}". Valid: gradual_degradation, multi_failure, cascade`,
      });
  }
});

module.exports = router;
