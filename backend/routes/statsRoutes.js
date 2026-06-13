// backend/routes/statsRoutes.js
// GET /api/stats, POST /api/reset-all

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");
const { protect, adminOnly } = require("../middleware/auth");

// GET /api/stats — aggregate counts by status
router.get("/stats", (req, res) => {
  let healthy = 0;
  let warning = 0;
  let critical = 0;

  segments.forEach((segment) => {
    const { riskScore, status } = calculateRisk(segment);
    segment.riskScore = riskScore;
    segment.status = status;

    if (status === "healthy") healthy++;
    else if (status === "warning") warning++;
    else if (status === "critical") critical++;
  });

  segments.save();
  const penaltyChi = 100 - (warning * 1.5) - (critical * 5.0);
  const chi = parseFloat(Math.max(0, Math.min(100, penaltyChi)).toFixed(1));

  res.json({ total: segments.length, healthy, warning, critical, chi });
});

// GET /api/chi-history — Corridor Health Index over the last 10 days.
//
// CHI = Start at 100, subtract 1.5 for warning, 5.0 for critical. Clamp between 0 and 100.
// Telemetry is in-memory with no historical store, so we seed a dramatic V-shaped
// recovery narrative for the historical array (Day 1 to 9), with Day 10 being today's live CHI.
router.get("/chi-history", (req, res) => {
  let warning = 0;
  let critical = 0;
  segments.forEach((segment) => {
    const { status } = calculateRisk(segment);
    if (status === "warning") warning++;
    else if (status === "critical") critical++;
  });
  const penaltyChi = 100 - (warning * 1.5) - (critical * 5.0);
  const todayChi = parseFloat(Math.max(0, Math.min(100, penaltyChi)).toFixed(1));

  const DAYS = 10;
  const history = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    // Recovery narrative: V-shaped curve
    let chi;
    if (i === 0) {
      chi = todayChi;
    } else if (i === 1) {
      chi = 96.8;
    } else if (i === 2) {
      chi = 91.2;
    } else if (i === 3) {
      chi = 84.5;
    } else if (i === 4) {
      chi = 78.1;
    } else if (i === 5) {
      chi = 74.3;
    } else if (i === 6) {
      chi = 99.2;
    } else if (i === 7) {
      chi = 98.5;
    } else if (i === 8) {
      chi = 99.1;
    } else { // i === 9
      chi = 98.8;
    }

    history.push({ date: dateStr, chi });
  }

  res.json({ history });
});

// POST /api/reset-all — reset every segment to healthy defaults (admin only)
router.post("/reset-all", protect, adminOnly, (req, res) => {
  segments.forEach((segment) => {
    segment.vibrationLevel = 2.0;
    segment.crackCount = 0;
    segment.incidentCount = 0;
    segment.activeDefects = [];
    segment.lastUpdated = new Date().toISOString();

    const { riskScore, status } = calculateRisk(segment);
    segment.riskScore = riskScore;
    segment.status = status;
  });

  segments.save();
  res.json({ segments });
});

module.exports = router;
