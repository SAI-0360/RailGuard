// backend/routes/aiRoutes.js
// Placeholder stubs for Day 2 AI endpoints — prevents server boot crash.

const express = require("express");
const router = express.Router();

// POST /api/extract-defect — stub (Day 2 Task 2.8)
router.post("/extract-defect", (req, res) => {
  res.status(200).json({});
});

// POST /api/verify-repair — stub (Day 2 Task 2.9)
router.post("/verify-repair", (req, res) => {
  res.status(200).json({});
});

module.exports = router;
