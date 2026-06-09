// backend/routes/statsRoutes.js
// GET /api/stats, POST /api/reset-all

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");

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

  res.json({ total: 100, healthy, warning, critical });
});

// POST /api/reset-all — reset every segment to healthy defaults
router.post("/reset-all", (req, res) => {
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

  res.json({ segments });
});

module.exports = router;
