require("dotenv").config();
console.log("GEMINI KEY LOADED:", !!process.env.GEMINI_API_KEY);

const express = require("express");
const cors = require("cors");

const segments = require("./data/segments");
const { calculateRisk, predictTimeToCritical } = require("./services/riskEngine");
const { logActivity } = require("./services/activityLogger");
const { pingGemini } = require("./services/geminiPing");
const { MAX_VIBRATION_HISTORY, MONITORING_INTERVAL_MS, GEMINI_MODEL } = require("./utils/constants");

const { connectDB } = require("./config/db");
const seedUsers = require("./utils/seedUsers");

const authRoutes = require("./routes/authRoutes");
const segmentRoutes = require("./routes/segmentRoutes");
const createAiRoutes = require("./routes/aiRoutes");
const statsRoutes = require("./routes/statsRoutes");
const configRoutes = require("./routes/configRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const createMonitoringRoutes = require("./routes/monitoringRoutes");
const createWorkOrderRoutes = require("./routes/workOrderRoutes");
const { assignWorkOrder, refreshRosterFromDB, isInDispatchCooldown } = createWorkOrderRoutes;
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
  logActivity("MONITOR", "SCAN", `Cycle #${cycleCount}: Scanning ${segments.length} segments...`, "info");

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

    // Auto work order generation — any critical segment without a pending
    // order gets one. State-based (not transition-based) so segments degraded
    // outside the cycle (demo scenarios, simulator) are still dispatched.
    // A post-resolution cooldown suppresses duplicate spam: once a ticket is
    // completed, the segment gets a grace window for sensors to settle before
    // a fresh ticket can be auto-raised.
    if (status === "critical") {
      const existingPending = workOrders.find(
        wo => wo.segmentId === seg.segmentId && wo.status === "pending"
      );
      const cooling = isInDispatchCooldown(workOrders, seg.segmentId);
      if (!existingPending && !cooling) {
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
        assignWorkOrder(wo, seg); // owning field worker + 4h deadline + telemetry snapshot
        workOrders.push(wo);
        logActivity("DISPATCH", "WORK_ORDER",
          `Auto-generated ${wo.workOrderId} for ${seg.segmentId} → ${wo.assignedWorker} (priority: ${wo.priority}, due ${wo.deadline.slice(11, 16)} UTC)`,
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

// MongoDB connection + demo user seeding — before routes. Connection failure
// is non-fatal: the in-memory demo flow must survive a missing database.
connectDB().then(async (connected) => {
  if (connected) {
    await seedUsers();
    // Prime the dispatch roster from the freshly-seeded users so auto-dispatch
    // follows live JE ownership from the first cycle.
    await refreshRosterFromDB();
  }
});

// Keep the dispatch roster in sync with admin edits to the user table without a
// restart. Best-effort and no-op while Mongo is down (static roster stands in).
const ROSTER_REFRESH_MS = 60 * 1000;
setInterval(() => { refreshRosterFromDB().catch(() => {}); }, ROSTER_REFRESH_MS);

// Route mounts
app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RailGuard backend running on 0.0.0.0:${PORT}`);

  // Startup Gemini check — informational only; a failure must never crash the
  // server (CONTEXT.md: fallbacks are mandatory, the app never crashes).
  pingGemini()
    .then((text) => console.log(`✅ Gemini API connected (${GEMINI_MODEL} → "${text}")`))
    .catch((err) => console.log(`⚠️ Gemini API unavailable — running in fallback mode (${err.message})`));
});
