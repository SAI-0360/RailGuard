// backend/services/activityLogger.js
// Central in-memory activity log for all agent actions.
// Every service pushes messages here. The frontend polls this
// to render the Agent Activity Log — the visual proof of autonomy.
//
// Agent color mapping (for frontend rendering):
//   MONITOR      → Blue   #60a5fa
//   DETECTION    → Amber  #f59e0b
//   EXTRACTION   → Purple #a78bfa
//   VERIFICATION → Green  #34d399
//   DISPATCH     → Pink   #fb7185
//   SYSTEM       → Gray   #94a3b8

const { MAX_LOG_ENTRIES } = require("../utils/constants");

const activityLog = [];
let logCounter = 0;

/**
 * Log an agent activity entry.
 * @param {string} agent - Agent name: "MONITOR" | "DETECTION" | "EXTRACTION" | "VERIFICATION" | "DISPATCH" | "SYSTEM"
 * @param {string} action - Action type: "SCAN" | "ANOMALY" | "RISK_CALC" | "EXTRACT" | "VERIFY" | "WORK_ORDER" | "START" | "STOP"
 * @param {string} message - Human-readable description of what happened.
 * @param {string} [severity="info"] - Severity level: "info" | "warning" | "critical"
 * @returns {Object} The created log entry.
 */
function logActivity(agent, action, message, severity = "info") {
  logCounter++;
  const entry = {
    id: logCounter,
    timestamp: new Date().toISOString(),
    agent,
    action,
    message,
    severity
  };
  activityLog.push(entry);
  // Keep log bounded to prevent memory leaks
  if (activityLog.length > MAX_LOG_ENTRIES) {
    activityLog.shift();
  }
  return entry;
}

/**
 * Retrieve the most recent log entries.
 * @param {number} [limit=50] - Maximum number of entries to return.
 * @returns {Array<Object>} Array of log entries, most recent last.
 */
function getRecentLogs(limit = 50) {
  return activityLog.slice(-limit);
}

/**
 * Clear all log entries. Used by POST /api/activity-log/clear.
 */
function clearLogs() {
  activityLog.length = 0;
  logCounter = 0;
}

module.exports = { logActivity, getRecentLogs, clearLogs };
