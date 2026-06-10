// backend/routes/aiRoutes.js
// POST /api/extract-defect — extract structured defect from inspection report text via Gemini
// POST /api/verify-repair  — verify a repair against the original defect via Gemini

const express = require("express");
const router = express.Router();
const segments = require("../data/segments");
const { calculateRisk } = require("../services/riskEngine");
const { extractDefect } = require("../services/geminiExtractor");
const { verifyRepair } = require("../services/geminiVerifier");
const { generateDefectId, generateRepairId } = require("../utils/idGenerator");
const { logActivity } = require("../services/activityLogger");

// POST /api/extract-defect
router.post("/extract-defect", async (req, res, next) => {
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

    res.json({ defect: defectLog, segment: seg });
  } catch (error) {
    next(error);
  }
});

// POST /api/verify-repair
router.post("/verify-repair", async (req, res, next) => {
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

    const repair = await verifyRepair(defect, repairDescription);
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
      try {
        const { workOrders } = require("../server");
        const pendingWo = workOrders.find(
          wo => wo.segmentId === seg.segmentId && wo.status === "pending"
        );
        if (pendingWo) {
          pendingWo.status = "completed";
          pendingWo.completedAt = new Date().toISOString();
          logActivity("DISPATCH", "WORK_ORDER",
            `Work order ${pendingWo.workOrderId} completed — ${seg.segmentId} repaired`,
            "info"
          );
        }
      } catch (e) {
        // Circular dependency safety — log but don't crash
        console.warn("Could not access workOrders from server.js:", e.message);
      }
    }

    res.json({ repair: repairLog, segment: seg });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
