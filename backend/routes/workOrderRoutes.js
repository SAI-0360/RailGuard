// backend/routes/workOrderRoutes.js
// Routes for auto-generated work orders.
// GET  /api/work-orders                    — return all work orders
// GET  /api/work-orders?status=pending     — filter by status
// POST /api/work-orders/:workOrderId/progress — advance worker status
//                                            (unacknowledged → acknowledged → in_progress → done)
//
// Uses factory pattern: server.js passes the workOrders array reference in.

const express = require("express");
const { protect, jeOnly, sseOnly, denOnly } = require("../middleware/auth");
const { logActivity } = require("../services/activityLogger");

// Field crew — the JE (Junior Engineer) accounts from utils/seedUsers.js.
// Each JE owns a fixed segment range, so dispatch follows ownership.
const WORKERS = [
  { name: "JE Track Worker 1", email: "je1@railguard.in", fromSeg: 1, toSeg: 33 },
  { name: "JE Track Worker 2", email: "je2@railguard.in", fromSeg: 34, toSeg: 66 },
  { name: "JE Track Worker 3", email: "je3@railguard.in", fromSeg: 67, toSeg: 100 },
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

  // Structured escalation hierarchy (human-to-human, no AI). Two tiers:
  //   Tier 1 — JE → SSE: escalationStatus null → 'requested' → 'resolved'
  //   Tier 2 — SSE → DEN: denEscalationStatus null → 'requested' → 'resolved'
  // The DEN only ever sees what the SSE escalates (sseNote), never the JE's note.
  workOrder.escalationStatus = null;
  workOrder.jeNote = null;
  workOrder.sseInstruction = null;
  workOrder.escalationRequestedAt = null; // SLA freeze anchor while awaiting guidance

  workOrder.denEscalationStatus = null;
  workOrder.sseNote = null;           // SSE's message up to the DEN
  workOrder.denInstruction = null;    // DEN's directive back down to the SSE
  workOrder.denEscalationRequestedAt = null;

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
  // Advances workerStatus one step. JE only (field work is the Junior
  // Engineer's job — DEN/SSE cannot progress), and only the assigned JE.
  // Every transition is logged to the activity ledger.
  router.post("/:workOrderId/progress", protect, jeOnly, (req, res) => {
    const { workOrderId } = req.params;
    const wo = workOrders.find((w) => w.workOrderId === workOrderId);
    if (!wo) {
      return res.status(404).json({ error: `Work order ${workOrderId} not found — it may have been cleared by a server reset` });
    }

    if (req.user.email !== wo.assignedWorkerEmail) {
      return res.status(403).json({ error: `Only ${wo.assignedWorker} can update this work order` });
    }

    const current = WORKER_STATUS_FLOW.indexOf(wo.workerStatus || "unacknowledged");
    if (current === -1) {
      // e.g. workerStatus === "awaiting_guidance" — the JE is blocked pending SSE
      return res.status(400).json({ error: "Cannot progress while awaiting SSE guidance" });
    }
    if (current === WORKER_STATUS_FLOW.length - 1) {
      return res.status(400).json({ error: "Work order is already done" });
    }

    const nextStatus = WORKER_STATUS_FLOW[current + 1];
    wo.workerStatus = nextStatus;

    // When the JE reports the job done they may attach a field report — the
    // text the SSE later verifies against in the operations console.
    if (nextStatus === "done" && typeof req.body?.completionReport === "string") {
      const report = req.body.completionReport.trim();
      if (report) wo.completionReport = report;
    }

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

  // POST /api/work-orders/:workOrderId/escalate — JE requests SSE guidance when
  // they cannot identify the root cause on-site. Sets escalationStatus to
  // 'requested', records the JE's note, and parks workerStatus at
  // 'awaiting_guidance'. Deterministic, no AI. JE-only, assigned JE only.
  router.post("/:workOrderId/escalate", protect, jeOnly, (req, res) => {
    const { workOrderId } = req.params;
    const wo = workOrders.find((w) => w.workOrderId === workOrderId);
    if (!wo) {
      return res.status(404).json({ error: `Work order ${workOrderId} not found — it may have been cleared by a server reset` });
    }
    if (req.user.email !== wo.assignedWorkerEmail) {
      return res.status(403).json({ error: `Only ${wo.assignedWorker} can update this work order` });
    }

    const jeNote = typeof req.body?.jeNote === "string" ? req.body.jeNote.trim() : "";
    if (!jeNote) {
      return res.status(400).json({ error: "jeNote is required" });
    }
    if (wo.workerStatus === "done") {
      return res.status(400).json({ error: "Work order is already done" });
    }
    if (wo.escalationStatus === "requested") {
      return res.status(400).json({ error: "Guidance already requested on this work order" });
    }

    wo.escalationStatus = "requested";
    wo.jeNote = jeNote;
    wo.escalationRequestedAt = new Date().toISOString();
    wo.workerStatus = "awaiting_guidance";
    wo.statusHistory = wo.statusHistory || [];
    wo.statusHistory.push({
      status: "awaiting_guidance",
      at: wo.escalationRequestedAt,
      by: req.user.name,
    });

    logActivity("WORKER", "ESCALATE",
      `${req.user.name} requested guidance on ${wo.workOrderId} (${wo.segmentId})`,
      "warning"
    );
    res.json({ workOrder: wo });
  });

  // POST /api/work-orders/:workOrderId/instruct — SSE answers a JE's guidance
  // request. Resolves the escalation and returns workerStatus to 'acknowledged'
  // so the JE can start work. SSE-only (the section engineer's call).
  router.post("/:workOrderId/instruct", protect, sseOnly, (req, res) => {
    const { workOrderId } = req.params;
    const wo = workOrders.find((w) => w.workOrderId === workOrderId);
    if (!wo) {
      return res.status(404).json({ error: `Work order ${workOrderId} not found — it may have been cleared by a server reset` });
    }

    const sseInstruction = typeof req.body?.sseInstruction === "string" ? req.body.sseInstruction.trim() : "";
    if (!sseInstruction) {
      return res.status(400).json({ error: "sseInstruction is required" });
    }
    if (wo.escalationStatus !== "requested") {
      return res.status(400).json({ error: "No pending guidance request on this work order" });
    }

    // SLA fairness: extend the deadline by however long the JE waited on us, so
    // the time spent blocked on guidance doesn't burn their 4-hour window.
    if (wo.escalationRequestedAt && wo.deadline) {
      const pausedMs = Date.now() - new Date(wo.escalationRequestedAt).getTime();
      if (pausedMs > 0) {
        wo.deadline = new Date(new Date(wo.deadline).getTime() + pausedMs).toISOString();
      }
    }

    wo.escalationStatus = "resolved";
    wo.sseInstruction = sseInstruction;
    wo.workerStatus = "acknowledged";
    wo.statusHistory = wo.statusHistory || [];
    wo.statusHistory.push({
      status: "guidance_sent",
      at: new Date().toISOString(),
      by: req.user.name,
    });

    logActivity("SSE", "INSTRUCT",
      `${req.user.name} sent guidance for ${wo.workOrderId} (${wo.segmentId})`,
      "info"
    );
    res.json({ workOrder: wo });
  });

  // POST /api/work-orders/:workOrderId/escalate-den — Tier 2 of the hierarchy.
  // The SSE escalates a problem they can't resolve up to the DEN. Records the
  // SSE's note (the only thing the DEN sees). SSE-only. The JE stays parked at
  // 'awaiting_guidance' — the SLA is already frozen from the tier-1 escalation.
  router.post("/:workOrderId/escalate-den", protect, sseOnly, (req, res) => {
    const { workOrderId } = req.params;
    const wo = workOrders.find((w) => w.workOrderId === workOrderId);
    if (!wo) {
      return res.status(404).json({ error: `Work order ${workOrderId} not found — it may have been cleared by a server reset` });
    }

    const sseNote = typeof req.body?.sseNote === "string" ? req.body.sseNote.trim() : "";
    if (!sseNote) {
      return res.status(400).json({ error: "sseNote is required" });
    }
    if (wo.workerStatus === "done") {
      return res.status(400).json({ error: "Work order is already done" });
    }
    if (wo.denEscalationStatus === "requested") {
      return res.status(400).json({ error: "Already escalated to the DEN on this work order" });
    }

    wo.denEscalationStatus = "requested";
    wo.sseNote = sseNote;
    wo.denEscalationRequestedAt = new Date().toISOString();
    wo.statusHistory = wo.statusHistory || [];
    wo.statusHistory.push({
      status: "escalated_to_den",
      at: wo.denEscalationRequestedAt,
      by: req.user.name,
    });

    logActivity("SSE", "ESCALATE_DEN",
      `${req.user.name} escalated ${wo.workOrderId} (${wo.segmentId}) to the DEN`,
      "warning"
    );
    res.json({ workOrder: wo });
  });

  // POST /api/work-orders/:workOrderId/instruct-den — the DEN's directive back
  // down to the SSE. Resolves the tier-2 escalation; the SSE then relays the
  // directive to the JE via the normal /instruct route. DEN-only.
  router.post("/:workOrderId/instruct-den", protect, denOnly, (req, res) => {
    const { workOrderId } = req.params;
    const wo = workOrders.find((w) => w.workOrderId === workOrderId);
    if (!wo) {
      return res.status(404).json({ error: `Work order ${workOrderId} not found — it may have been cleared by a server reset` });
    }

    const denInstruction = typeof req.body?.denInstruction === "string" ? req.body.denInstruction.trim() : "";
    if (!denInstruction) {
      return res.status(400).json({ error: "denInstruction is required" });
    }
    if (wo.denEscalationStatus !== "requested") {
      return res.status(400).json({ error: "No pending DEN escalation on this work order" });
    }

    wo.denEscalationStatus = "resolved";
    wo.denInstruction = denInstruction;
    wo.statusHistory = wo.statusHistory || [];
    wo.statusHistory.push({
      status: "den_directive",
      at: new Date().toISOString(),
      by: req.user.name,
    });

    logActivity("DEN", "INSTRUCT_DEN",
      `${req.user.name} issued a directive for ${wo.workOrderId} (${wo.segmentId})`,
      "info"
    );
    res.json({ workOrder: wo });
  });

  // -----------------------------------------------------------------------
  // POST /api/work-orders/manual — SSE proactive dispatch for warning segments.
  // The SSE manually assigns a field crew and provides directives before
  // autonomous escalation is required. Prevents duplicate orders per segment.
  // -----------------------------------------------------------------------
  let manualCounter = 0;

  router.post("/manual", protect, sseOnly, (req, res) => {
    const { segmentId, sseInstruction, assignedTo } = req.body;

    // --- Validation ----------------------------------------------------------
    if (!segmentId || typeof segmentId !== "string") {
      return res.status(400).json({ error: "segmentId is required" });
    }
    const instruction = typeof sseInstruction === "string" ? sseInstruction.trim() : "";
    if (!instruction) {
      return res.status(400).json({ error: "sseInstruction is required" });
    }

    // Load segments from the shared in-memory store
    const segments = require("../data/segments");
    const segment = segments.find((s) => s.segmentId === segmentId);
    if (!segment) {
      return res.status(404).json({ error: `Segment ${segmentId} not found` });
    }

    // Conflict: a work order (any status) already exists for this segment
    const existing = workOrders.find((wo) => wo.segmentId === segmentId && wo.status === "pending");
    if (existing) {
      return res.status(409).json({
        error: `Work order ${existing.workOrderId} already exists for ${segmentId}`,
        existingWorkOrderId: existing.workOrderId,
      });
    }

    // --- Resolve assigned worker ---------------------------------------------
    let worker;
    if (assignedTo && typeof assignedTo === "string") {
      // Allow explicit assignment by email prefix (e.g. "je1", "je2", "je3")
      const match = WORKERS.find(
        (w) => w.email.startsWith(assignedTo.toLowerCase()) || w.name === assignedTo
      );
      worker = match || workerForSegment(segmentId);
    } else {
      worker = workerForSegment(segmentId);
    }

    // --- Build work order ----------------------------------------------------
    manualCounter++;
    const segNum = String(segmentId).replace(/\D/g, "");
    const now = new Date().toISOString();

    const wo = {
      workOrderId: `WO-SEG-${segNum.padStart(3, "0")}-M${String(manualCounter).padStart(3, "0")}`,
      segmentId,
      type: "proactive",
      riskScore: segment.riskScore,
      priority: segment.status === "critical"
        ? (segment.riskScore > 80 ? "urgent" : "high")
        : segment.status === "warning"
          ? "medium"
          : "low",
      reason: `Proactive dispatch by ${req.user.name}: ${instruction}`,
      recommendedAction: instruction,
      status: "pending",
      createdAt: now,
      completedAt: null,
      assignedWorker: worker.name,
      assignedWorkerEmail: worker.email,
      deadline: new Date(Date.now() + DEADLINE_HOURS * 60 * 60 * 1000).toISOString(),
      workerStatus: "unacknowledged",
      escalationStatus: null, // null allows the JE to escalate if they need further guidance
      sseInstruction: instruction,
      jeNote: null,
      escalationRequestedAt: null,
      denEscalationStatus: null,
      sseNote: null,
      denInstruction: null,
      denEscalationRequestedAt: null,
      statusHistory: [
        { status: "created", at: now, by: req.user.name },
        { status: "proactive_dispatch", at: now, by: req.user.name },
      ],
      telemetrySnapshot: {
        vibrationLevel: parseFloat((segment.vibrationLevel ?? 0).toFixed(2)),
        riskScore: segment.riskScore,
        status: segment.status,
        crackCount: segment.crackCount,
        incidentCount: segment.incidentCount,
        daysSinceInspection: segment.daysSinceInspection,
        radiusOfCurvature: segment.radiusOfCurvature || 0,
        capturedAt: now,
      },
    };

    workOrders.push(wo);

    logActivity("SSE", "PROACTIVE_DISPATCH",
      `${req.user.name} proactively dispatched ${wo.workOrderId} for ${segmentId} → ${worker.name} (priority: ${wo.priority})`,
      "warning"
    );

    res.status(201).json({ workOrder: wo });
  });

  return router;
}

module.exports = createWorkOrderRoutes;
module.exports.assignWorkOrder = assignWorkOrder;
