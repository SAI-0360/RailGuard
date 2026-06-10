// backend/routes/monitoringRoutes.js
// Routes for autonomous monitoring control.
// POST /api/monitoring/start — start monitoring loop
// POST /api/monitoring/stop  — stop monitoring loop
// GET  /api/monitoring/status — query monitoring state
//
// Uses factory pattern: server.js passes its own start/stop/state functions in.

const express = require("express");

/**
 * Creates the monitoring router with injected control functions.
 * @param {Object} opts
 * @param {Function} opts.startMonitoring  — starts the autonomous loop
 * @param {Function} opts.stopMonitoring   — stops the autonomous loop
 * @param {Function} opts.getMonitoringState — returns { active, cycleCount }
 * @returns {express.Router}
 */
function createMonitoringRoutes({ startMonitoring, stopMonitoring, getMonitoringState }) {
  const router = express.Router();

  // POST /api/monitoring/start
  router.post("/start", (req, res) => {
    startMonitoring();
    res.json({ status: "started" });
  });

  // POST /api/monitoring/stop
  router.post("/stop", (req, res) => {
    stopMonitoring();
    res.json({ status: "stopped" });
  });

  // GET /api/monitoring/status
  router.get("/status", (req, res) => {
    const state = getMonitoringState();
    res.json(state);
  });

  return router;
}

module.exports = createMonitoringRoutes;
