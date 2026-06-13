// backend/routes/configRoutes.js
// Routes for managing dynamic runtime settings.
// GET  /api/config/toggle-mock — fetch the current Mock AI state
// POST /api/config/toggle-mock — update the Mock AI state

const express = require("express");
const router = express.Router();
const { getUseMockAi, setUseMockAi } = require("../config/aiConfig");

// GET /api/config/toggle-mock
router.get("/toggle-mock", (req, res) => {
  res.json({ useMock: getUseMockAi() });
});

// POST /api/config/toggle-mock
router.post("/toggle-mock", (req, res) => {
  const { useMock } = req.body;
  if (typeof useMock !== "boolean") {
    return res.status(400).json({ error: "useMock boolean is required" });
  }
  const updated = setUseMockAi(useMock);
  res.json({ useMock: updated });
});

module.exports = router;
