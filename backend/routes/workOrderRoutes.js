// backend/routes/workOrderRoutes.js
// Routes for auto-generated work orders.
// GET  /api/work-orders                    — return all work orders
// GET  /api/work-orders?status=pending     — filter by status
// POST /api/work-orders/:workOrderId/progress — advance worker status
//                                            (unacknowledged → acknowledged → in_progress → done)
//
// Uses factory pattern: server.js passes the workOrders array reference in.

const express = require("express");
const { protect } = require("../middleware/auth");
const { logActivity } = require("../services/activityLogger");

// Field crew — mirrors the seeded operator accounts (utils/seedUsers.js).
// Each worker owns a fixed segment range, so dispatch follows ownership.
const WORKERS = [
  { name: "Track Worker 1", email: "worker1@railguard.com", fromSeg: 1, toSeg: 33 },
  { name: "Track Worker 2", email: "worker2@railguard.com", fromSeg: 34, toSeg: 66 },
  { name: "Track Worker 3", email: "worker3@railguard.com", fromSeg: 67, toSeg: 100 },
];

const DEADLINE_HOURS = 4;

// Worker-status lifecycle, in order. status stays "pending" until the repair
// is verified — "done" is the worker's own report, verification is the agent's.
const WORKER_STATUS_FLOW = ["unacknowledged", "acknowledged", "in_progress", "done"];

/** Find the roster worker who owns a segment id like "SEG-042". */
function workerForSegment(segmentId) {
  const n = parseInt(String(segmentId).replace(/\D/g, ""), 10);
  return WORKERS.find((w) => n >= w.fromSeg && n <= w.toSeg) || WORKERS[0];
}

/**
 * Dispatch a freshly created work order:
 * - assign the field worker who owns the segment (seeded account ranges)
 * - stamp a completion deadline of createdAt + 4 hours
 * - snapshot the segment's telemetry at the moment the issue was detected
 * - open the worker-status lifecycle at "unacknowledged"
 * Called at the single creation point (server.js monitoring cycle).
 * @param {Object} workOrder - work order with createdAt + segmentId set
 * @param {Object} [segment] - live segment, for the creation-time snapshot
 * @returns {Object} the same order, enriched
 */
function assignWorkOrder(workOrder, segment) {
  const worker = workerForSegment(workOrder.segmentId);
  workOrder.assignedWorker = worker.name;
  workOrder.assignedWorkerEmail = worker.email;
  workOrder.deadline = new Date(
    new Date(workOrder.createdAt).getTime() + DEADLINE_HOURS * 60 * 60 * 1000
  ).toISOString();

  workOrder.workerStatus = "unacknowledged";
  workOrder.statusHistory = [
    { status: "created", at: workOrder.createdAt, by: "DISPATCH" },
  ];

  if (segment) {
    // What the telemetry panel showed when the issue fired
    workOrder.telemetrySnapshot = {
      vibrationLevel: parseFloat((segment.vibrationLevel ?? 0).toFixed(2)),
      riskScore: segment.riskScore,
      status: segment.status,
      crackCount: segment.crackCount,
      incidentCount: segment.incidentCount,
      daysSinceInspection: segment.daysSinceInspection,
      radiusOfCurvature: segment.radiusOfCurvature || 0,
      capturedAt: workOrder.createdAt,
    };
  }
  return workOrder;
}

/**
 * Creates the work order router with injected workOrders array.
 * @param {Array} workOrders — reference to the global workOrders array in server.js
 * @returns {express.Router}
 */
function createWorkOrderRoutes(workOrders) {
  const router = express.Router();

  // GET /api/work-orders
  router.get("/", (req, res) => {
    const { status } = req.query;
    if (status) {
      const filtered = workOrders.filter(wo => wo.status === status);
      return res.json({ workOrders: filtered });
    }
    res.json({ workOrders });
  });

  // POST /api/work-orders/:workOrderId/progress — the human-in-the-loop step.
  // Advances workerStatus one step. Only the assigned worker or an admin may
  // act; every transition is logged to the activity ledger.
  router.post("/:workOrderId/progress", protect, (req, res) => {
    const { workOrderId } = req.params;
    const wo = workOrders.find((w) => w.workOrderId === workOrderId);
    if (!wo) {
      return res.status(404).json({ error: `Work order ${workOrderId} not found` });
    }

    const isAssignee = req.user.email === wo.assignedWorkerEmail;
    if (!isAssignee && req.user.role !== "admin") {
      return res.status(403).json({ error: `Only ${wo.assignedWorker} or an admin can update this work order` });
    }

    const current = WORKER_STATUS_FLOW.indexOf(wo.workerStatus || "unacknowledged");
    if (current === WORKER_STATUS_FLOW.length - 1) {
      return res.status(400).json({ error: "Work order is already done" });
    }

    const nextStatus = WORKER_STATUS_FLOW[current + 1];
    wo.workerStatus = nextStatus;
    wo.statusHistory = wo.statusHistory || [];
    wo.statusHistory.push({
      status: nextStatus,
      at: new Date().toISOString(),
      by: req.user.name,
    });

    const verb =
      nextStatus === "acknowledged" ? "acknowledged" :
      nextStatus === "in_progress" ? "started work on" :
      "reported done on";
    logActivity("WORKER", "ACK", `${req.user.name} ${verb} ${wo.workOrderId} (${wo.segmentId})`, "info");

    res.json({ workOrder: wo });
  });

  return router;
}

module.exports = createWorkOrderRoutes;
module.exports.assignWorkOrder = assignWorkOrder;
