const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");
const { logActivity } = require("../services/activityLogger");
const { MAX_VIBRATION_HISTORY } = require("../utils/constants");

// POST /api/demo/scenario — Run preset demo scenarios
router.post("/demo/scenario", (req, res) => {
  const { scenario } = req.body;

  if (scenario === "critical_degrade") {
    const targetId = "SEG-042";
    const seg = segments.find(s => s.segmentId === targetId);
    if (!seg) {
      return res.status(404).json({ error: `Segment ${targetId} not found` });
    }

    // Degrade SEG-042 to critical
    seg.crackCount = 2;
    seg.incidentCount = 1;
    seg.daysSinceInspection = 12;

    // Generate progressive vibration degradation history (vibration spike history generation)
    seg.vibrationHistory = [];
    const now = Date.now();
    for (let j = 0; j < MAX_VIBRATION_HISTORY; j++) {
      const baseVibe = 2.0 + (j * (8.5 - 2.0) / (MAX_VIBRATION_HISTORY - 1));
      const vibe = parseFloat((baseVibe + (Math.random() - 0.5) * 0.2).toFixed(2));
      seg.vibrationHistory.push({
        timestamp: new Date(now - (MAX_VIBRATION_HISTORY - j) * 10 * 1000).toISOString(),
        vibrationLevel: vibe,
        temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
        crackDetected: j > 15
      });
    }
    seg.vibrationLevel = seg.vibrationHistory[seg.vibrationHistory.length - 1].vibrationLevel;

    // Recalculate risk & update segment
    const { riskScore, status } = calculateRisk(seg);
    seg.riskScore = riskScore;
    seg.status = status;
    seg.lastUpdated = new Date().toISOString();

    logActivity("SYSTEM", "START", `Demo Scenario: Degraded ${targetId} to critical status (risk: ${riskScore})`, "critical");

    return res.json({ message: `Segment ${targetId} degraded to critical`, segment: seg });
  }

  if (scenario === "mass_degrade") {
    const shuffled = [...segments].sort(() => 0.5 - Math.random());
    const targets = shuffled.slice(0, 5);
    const degraded = [];

    targets.forEach((seg, index) => {
      const isCritical = index % 2 === 0;
      seg.crackCount = isCritical ? 2 : 1;
      seg.incidentCount = isCritical ? 1 : 0;
      seg.daysSinceInspection = isCritical ? 15 : 8;

      seg.vibrationHistory = [];
      const now = Date.now();
      const peakVibe = isCritical ? 8.2 : 5.8;
      for (let j = 0; j < MAX_VIBRATION_HISTORY; j++) {
        const baseVibe = 2.0 + (j * (peakVibe - 2.0) / (MAX_VIBRATION_HISTORY - 1));
        const vibe = parseFloat((baseVibe + (Math.random() - 0.5) * 0.2).toFixed(2));
        seg.vibrationHistory.push({
          timestamp: new Date(now - (MAX_VIBRATION_HISTORY - j) * 10 * 1000).toISOString(),
          vibrationLevel: vibe,
          temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
          crackDetected: isCritical && j > 12
        });
      }
      seg.vibrationLevel = seg.vibrationHistory[seg.vibrationHistory.length - 1].vibrationLevel;

      const { riskScore, status } = calculateRisk(seg);
      seg.riskScore = riskScore;
      seg.status = status;
      seg.lastUpdated = new Date().toISOString();

      degraded.push(seg.segmentId);
    });

    logActivity("SYSTEM", "START", `Demo Scenario: Mass degradation initiated on ${degraded.join(", ")}`, "warning");

    return res.json({ message: `Mass degradation initiated on: ${degraded.join(", ")}`, segments: targets });
  }

  if (scenario === "clear_all") {
    segments.forEach((segment) => {
      segment.vibrationLevel = 2.0;
      segment.crackCount = 0;
      segment.incidentCount = 0;
      segment.activeDefects = [];
      segment.lastUpdated = new Date().toISOString();

      segment.vibrationHistory = [];
      const now = Date.now();
      for (let j = 0; j < MAX_VIBRATION_HISTORY; j++) {
        segment.vibrationHistory.push({
          timestamp: new Date(now - (MAX_VIBRATION_HISTORY - j) * 60 * 1000).toISOString(),
          vibrationLevel: parseFloat((2.0 + (Math.random() - 0.5) * 0.3).toFixed(2)),
          temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
          crackDetected: false
        });
      }

      const { riskScore, status } = calculateRisk(segment);
      segment.riskScore = riskScore;
      segment.status = status;
    });

    logActivity("SYSTEM", "START", "Demo Scenario: All track segments reset to healthy baseline", "info");

    return res.json({ message: "All segments reset to healthy" });
  }

  return res.status(400).json({ error: `Unknown scenario: ${scenario}` });
});

module.exports = router;
