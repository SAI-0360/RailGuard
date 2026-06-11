const express = require("express");
const cors = require("cors");
require("dotenv").config();

const segments = require("./data/segments");
const { calculateRisk, predictTimeToCritical } = require("./services/riskEngine");
const { logActivity } = require("./services/activityLogger");
const { MAX_VIBRATION_HISTORY, MONITORING_INTERVAL_MS } = require("./utils/constants");

const segmentRoutes = require("./routes/segmentRoutes");
const createAiRoutes = require("./routes/aiRoutes");
const statsRoutes = require("./routes/statsRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const createMonitoringRoutes = require("./routes/monitoringRoutes");
const createWorkOrderRoutes = require("./routes/workOrderRoutes");
const demoRoutes = require("./routes/demoRoutes");
const errorHandler = require("./middleware/errorHandler");

// ---------------------------------------------------------------------------
// Global state for autonomous monitoring & work orders
// ---------------------------------------------------------------------------
let monitoringActive = false;
let cycleCount = 0;
let monitoringInterval = null;
const workOrders = [];
let workOrderCounter = 0;

// ---------------------------------------------------------------------------
// Autonomous monitoring cycle — runs every MONITORING_INTERVAL_MS (10s)
// ---------------------------------------------------------------------------
function runMonitoringCycle() {
  cycleCount++;
  logActivity("MONITOR", "SCAN", `Cycle #${cycleCount}: Scanning 100 segments...`, "info");

  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  segments.forEach(seg => {
    const previousStatus = seg.status;

    // Subtle vibration drift — most segments stay healthy, some slowly degrade
    seg.vibrationLevel += (Math.random() - 0.45) * 0.3;
    seg.vibrationLevel = Math.max(0.5, parseFloat(seg.vibrationLevel.toFixed(3)));

    // Push new telemetry reading
    seg.vibrationHistory.push({
      timestamp: new Date().toISOString(),
      vibrationLevel: seg.vibrationLevel,
      temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
      crackDetected: false
    });
    if (seg.vibrationHistory.length > MAX_VIBRATION_HISTORY) {
      seg.vibrationHistory.shift();
    }

    // Recalculate risk
    const { riskScore, status } = calculateRisk(seg);
    seg.riskScore = riskScore;
    seg.status = status;
    seg.lastUpdated = new Date().toISOString();

    // Detect status transitions
    if (previousStatus !== status && status !== "healthy") {
      logActivity("DETECTION", "ANOMALY",
        `${seg.segmentId} → ${status} (risk: ${riskScore})`,
        status === "critical" ? "critical" : "warning"
      );
    }

    // Trend prediction logging
    const prediction = predictTimeToCritical(seg);
    if (prediction && prediction.predictedDaysToCritical <= 3 && prediction.predictedDaysToCritical > 0) {
      logActivity("DETECTION", "ANOMALY",
        `${seg.segmentId} predicted critical in ~${prediction.predictedDaysToCritical} days (slope: ${prediction.slopePerReading}/reading)`,
        "warning"
      );
    }

    // Auto work order generation — fires when a segment transitions INTO critical
    if (previousStatus !== "critical" && status === "critical") {
      const existingPending = workOrders.find(
        wo => wo.segmentId === seg.segmentId && wo.status === "pending"
      );
      if (!existingPending) {
        workOrderCounter++;
        const wo = {
          workOrderId: `WO-${seg.segmentId}-${String(workOrderCounter).padStart(3, "0")}`,
          segmentId: seg.segmentId,
          riskScore: seg.riskScore,
          priority: seg.riskScore > 80 ? "urgent" : "high",
          reason: `Risk score ${seg.riskScore} exceeded critical threshold (60)`,
          recommendedAction: "Immediate physical inspection and sensor recalibration required",
          status: "pending",
          createdAt: new Date().toISOString(),
          completedAt: null
        };
        workOrders.push(wo);
        logActivity("DISPATCH", "WORK_ORDER",
          `Auto-generated ${wo.workOrderId} for ${seg.segmentId} (priority: ${wo.priority})`,
          "critical"
        );
      }
    }

    // Count statuses
    if (status === "healthy") healthyCount++;
    else if (status === "warning") warningCount++;
    else criticalCount++;
  });

  // Save changes to local segments.json cache
  segments.save();

  logActivity("MONITOR", "SCAN",
    `Cycle #${cycleCount} complete: ${healthyCount} healthy, ${warningCount} warning, ${criticalCount} critical`,
    criticalCount > 0 ? "warning" : "info"
  );
}

// ---------------------------------------------------------------------------
// Monitoring control functions
// ---------------------------------------------------------------------------
function startMonitoring() {
  if (!monitoringActive) {
    monitoringActive = true;
    monitoringInterval = setInterval(runMonitoringCycle, MONITORING_INTERVAL_MS);
    logActivity("SYSTEM", "START", "Autonomous monitoring activated", "info");
  }
}

function stopMonitoring() {
  if (monitoringActive) {
    monitoringActive = false;
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logActivity("SYSTEM", "STOP", "Monitoring stopped by operator", "info");
  }
}

function getMonitoringState() {
  return { active: monitoringActive, cycleCount };
}

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Route mounts
app.use("/api", segmentRoutes);
app.use("/api", createAiRoutes(workOrders));
app.use("/api", statsRoutes);
app.use("/api/activity-log", activityLogRoutes);
app.use("/api/monitoring", createMonitoringRoutes({ startMonitoring, stopMonitoring, getMonitoringState }));
app.use("/api/work-orders", createWorkOrderRoutes(workOrders));
app.use("/api", demoRoutes);

// Global error handler — must be last
app.use(errorHandler);

// Auto-start autonomous monitoring
startMonitoring();

app.listen(PORT, () => {
  console.log(`RailGuard backend running on port ${PORT}`);
});

// Export workOrders so aiRoutes.js can mark orders completed on verified repairs
module.exports = { workOrders };
