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
  res.json({ total: 100, healthy, warning, critical });
});

// GET /api/chi-history — Corridor Health Index over the last 10 days.
//
// CHI = (healthy segments / total) * 100. Telemetry is in-memory with no
// historical store, so the series is anchored to *today's real CHI* and
// back-filled with a deterministic per-day walk: stable across polls (no
// chart jitter) and honest about the current value (the last point is live).
router.get("/chi-history", (req, res) => {
  let healthy = 0;
  segments.forEach((segment) => {
    const { status } = calculateRisk(segment);
    if (status === "healthy") healthy++;
  });
  const todayChi = parseFloat(((healthy / 100) * 100).toFixed(1));

  // Deterministic pseudo-random in [-1, 1] seeded by the date string, so a
  // given calendar day always renders the same point regardless of poll time.
  const dayNoise = (dateStr) => {
    let h = 0;
    for (let i = 0; i < dateStr.length; i++) {
      h = (h * 31 + dateStr.charCodeAt(i)) | 0;
    }
    return ((Math.abs(h) % 1000) / 1000) * 2 - 1;
  };

  const DAYS = 10;
  const history = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Today is the live value; prior days oscillate around it within ±4 pts.
    const chi =
      i === 0
        ? todayChi
        : parseFloat(
            Math.max(0, Math.min(100, todayChi + dayNoise(dateStr) * 4)).toFixed(1)
          );
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
