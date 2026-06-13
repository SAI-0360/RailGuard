// backend/routes/aiRoutes.js
// POST /api/extract-defect — extract structured defect from inspection report text via Gemini
// POST /api/verify-repair  — verify a repair against the original defect via Gemini

const express = require("express");
const segments = require("../data/segments");
const { calculateRisk, predictTimeToCritical } = require("../services/riskEngine");
const { extractDefect, generateRiskExplanation } = require("../services/geminiExtractor");
const { verifyRepair } = require("../services/geminiVerifier");
const { generateDefectId, generateRepairId } = require("../utils/idGenerator");
const { logActivity } = require("../services/activityLogger");
const { protect, adminOnly, sseOnly } = require("../middleware/auth");

function createAiRoutes(workOrders) {
  const router = express.Router();

  // POST /api/analyse-segment (senior staff) — plain-English AI risk summary
  // for one segment. The SSE selects a degraded segment in the Focus Panel and
  // this narrates *why* it's at risk, enriched with the trend prediction and
  // any auto-dispatched work order. Read-only: does not mutate defects.
  router.post("/analyse-segment", protect, adminOnly, async (req, res, next) => {
    try {
      const { segmentId } = req.body;
      if (!segmentId || typeof segmentId !== "string") {
        return res.status(400).json({ error: "segmentId is required" });
      }

      const seg = segments.find(s => s.segmentId === segmentId);
      if (!seg) {
        return res.status(404).json({ error: `Segment ${segmentId} not found` });
      }

      // Keep risk/status current so the narration cites live numbers
      const { riskScore, status } = calculateRisk(seg);
      seg.riskScore = riskScore;
      seg.status = status;

      const prediction = predictTimeToCritical(seg);
      const workOrder = workOrders.find(
        wo => wo.segmentId === seg.segmentId && wo.status === "pending"
      ) || null;

      const explanation = await generateRiskExplanation(seg, prediction, workOrder);
      res.json({ segmentId, explanation });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/extract-defect (admin only)
  router.post("/extract-defect", protect, adminOnly, async (req, res, next) => {
    try {
      const { segmentId, reportText } = req.body;

      if (!segmentId || typeof segmentId !== "string" || !reportText || typeof reportText !== "string") {
        return res.status(400).json({ error: "segmentId and reportText are required" });
      }

      const seg = segments.find(s => s.segmentId === segmentId);
      if (!seg) {
        return res.status(404).json({ error: `Segment ${segmentId} not found` });
      }

      const defect = await extractDefect(reportText);
      const defectId = generateDefectId();
      const defectLog = {
        defectId,
        ...defect,
        reportedAt: new Date().toISOString()
      };

      seg.activeDefects.push(defectLog);

      // High/critical severity defects count as incidents
      if (defect.severity === "high" || defect.severity === "critical") {
        seg.incidentCount += 1;
      }

      // Recalculate risk
      const { riskScore, status } = calculateRisk(seg);
      seg.riskScore = riskScore;
      seg.status = status;
      seg.lastUpdated = new Date().toISOString();

      segments.save();
      res.json({ defect: defectLog, segment: seg });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/verify-repair (SSE only — repair sign-off is the SSE's authority)
  router.post("/verify-repair", protect, sseOnly, async (req, res, next) => {
    try {
      const { segmentId, defectId, repairDescription } = req.body;

      if (
        !segmentId || typeof segmentId !== "string" ||
        !defectId || typeof defectId !== "string" ||
        !repairDescription || typeof repairDescription !== "string"
      ) {
        return res.status(400).json({ error: "segmentId, defectId, and repairDescription are required" });
      }

      const seg = segments.find(s => s.segmentId === segmentId);
      if (!seg) {
        return res.status(404).json({ error: `Segment ${segmentId} not found` });
      }

      const defect = seg.activeDefects.find(d => d.defectId === defectId);
      if (!defect) {
        return res.status(404).json({ error: `Defect ${defectId} not found on segment ${segmentId}` });
      }

      // DTO: project ONLY the minimal scalar fields the verifier needs. The
      // segment object (geo-coordinate + vibration-history arrays) and the
      // segments array are deliberately excluded so they never reach Gemini.
      const verificationPayload = {
        segmentId: seg.segmentId,
        defectType: defect.defectType,
        severity: defect.severity,
        defectDescription: defect.description || defect.recommendedAction || defect.defectType,
        repairReportText: repairDescription,
        vibrationLevel: seg.vibrationLevel,
        riskScore: seg.riskScore,
      };
      const repair = await verifyRepair(verificationPayload);
      const repairId = generateRepairId();
      const repairLog = {
        repairId,
        ...repair,
        repairedAt: new Date().toISOString()
      };

      if (repair.isVerified) {
        // Remove the defect from activeDefects
        seg.activeDefects = seg.activeDefects.filter(d => d.defectId !== defectId);

        // Apply status recommendation
        if (repair.statusRecommendation === "healthy") {
          seg.vibrationLevel = 2.0;
          seg.crackCount = Math.max(0, seg.crackCount - 1);
        }

        // Recalculate risk
        const { riskScore, status } = calculateRisk(seg);
        seg.riskScore = riskScore;
        seg.status = status;
        seg.lastUpdated = new Date().toISOString();

        // Complete any pending work order for this segment
        const pendingWo = workOrders.find(
          wo => wo.segmentId === seg.segmentId && wo.status === "pending"
        );
        if (pendingWo) {
          pendingWo.status = "completed";
          pendingWo.completedAt = new Date().toISOString();
          pendingWo.workerStatus = "done";
          pendingWo.statusHistory = pendingWo.statusHistory || [];
          pendingWo.statusHistory.push({
            status: "done",
            at: pendingWo.completedAt,
            by: "VERIFICATION",
          });
          logActivity("DISPATCH", "WORK_ORDER",
            `Work order ${pendingWo.workOrderId} completed — ${seg.segmentId} repaired`,
            "info"
          );
        }

        // Repair attribution — feeds the segment History timeline:
        // which worker fixed which defect, confirmed by verification.
        seg.repairLog = seg.repairLog || [];
        seg.repairLog.push({
          repairedAt: new Date().toISOString(),
          defectId,
          defectType: defect.defectType || "defect",
          workOrderId: pendingWo ? pendingWo.workOrderId : null,
          repairedBy: pendingWo ? pendingWo.assignedWorker : "Maintenance crew",
          confidence: repair.confidence,
        });
      } else {
        // Verification failed — the AI judged the repair inadequate. Without
        // this branch the work order is stranded at workerStatus "done": the JE
        // can't edit or re-submit and the loop deadlocks. Roll the worker status
        // back to "in_progress" so the JE can correct and report done again, and
        // attach the AI's reasoning so they know exactly what to fix.
        const pendingWo = workOrders.find(
          wo => wo.segmentId === seg.segmentId && wo.status === "pending"
        );
        if (pendingWo) {
          pendingWo.workerStatus = "in_progress";
          pendingWo.rejectionReason = repair.verificationReasoning || "Repair did not adequately address the defect.";
          pendingWo.statusHistory = pendingWo.statusHistory || [];
          pendingWo.statusHistory.push({
            status: "verification_rejected",
            at: new Date().toISOString(),
            by: "VERIFICATION",
          });
          logActivity("DISPATCH", "WORK_ORDER",
            `Verification rejected for ${pendingWo.workOrderId} (${seg.segmentId}): ${pendingWo.rejectionReason.substring(0, 60)}…`,
            "warning"
          );
        }
      }

      segments.save();
      res.json({ repair: repairLog, segment: seg });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createAiRoutes;
