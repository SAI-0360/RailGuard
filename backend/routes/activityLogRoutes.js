// backend/routes/activityLogRoutes.js
// Routes for the Agent Activity Log.
// GET /api/activity-log — returns recent log entries (polled by frontend every 3s)
// POST /api/activity-log/clear — clears all log entries
//
// Mount in server.js with:
//   const activityLogRoutes = require("./routes/activityLogRoutes");
//   app.use("/api/activity-log", activityLogRoutes);

const express = require("express");
const router = express.Router();
const { getRecentLogs, clearLogs } = require("../services/activityLogger");

/**
 * GET /api/activity-log?limit=50
 * Returns the most recent activity log entries.
 */
router.get("/", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = getRecentLogs(limit);
  res.json(logs);
});

/**
 * POST /api/activity-log/clear
 * Clears all activity log entries.
 */
router.post("/clear", (req, res) => {
  clearLogs();
  res.json({ status: "cleared" });
});

module.exports = router;
