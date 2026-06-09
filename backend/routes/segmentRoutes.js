// backend/routes/segmentRoutes.js
// GET /api/segments, GET /api/segments/:segmentId

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");

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

module.exports = router;
