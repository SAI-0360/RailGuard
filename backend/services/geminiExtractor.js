const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_MODEL } = require("../utils/constants");
const { FALLBACK_EXTRACTION, FALLBACK_EXPLANATION } = require("../utils/fallbacks");
const { logActivity } = require("./activityLogger");

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== "your_key_here") {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Multi-strategy JSON extraction: raw parse → strip fences → extract first {...} block.
 */
function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const text = rawText.trim();

  // Strategy 1: raw parse
  try { return JSON.parse(text); } catch (_) {}

  // Strategy 2: strip all code fence variants then parse
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?\s*```\s*$/m, "")
    .trim();
  try { return JSON.parse(stripped); } catch (_) {}

  // Strategy 3: pull out the largest {...} block (handles prose before/after JSON)
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }

  return null;
}

/**
 * Parse and validate a Gemini extraction response.
 */
function cleanAndParseJson(rawText, fallback) {
  const parsed = extractJsonFromText(rawText);

  if (!parsed) {
    console.error("All JSON parse attempts failed. Raw text:", String(rawText).substring(0, 200));
    return fallback;
  }

  try {
    // Validate required fields
    const requiredFields = ["defectType", "location", "severity", "description", "recommendedAction"];
    for (const field of requiredFields) {
      if (!parsed[field] || typeof parsed[field] !== "string") {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }

    // Validate severity value
    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(parsed.severity.toLowerCase())) {
      parsed.severity = "medium";
    } else {
      parsed.severity = parsed.severity.toLowerCase();
    }

    return parsed;
  } catch (error) {
    console.error("Gemini extractor validation failed:", error.message, "| Raw text:", String(rawText).substring(0, 200));
    return fallback;
  }
}

/**
 * Extracts defect details from unstructured inspection report text.
 * @param {string} reportText - The raw report text.
 * @returns {Promise<Object>} The extracted defect details matching the schema.
 */
async function extractDefect(reportText) {
  if (!genAI || !reportText || typeof reportText !== "string" || !reportText.trim()) {
    console.warn("Gemini client not initialized or empty/invalid report text. Using fallback extraction.");
    logActivity("EXTRACTION", "EXTRACT", "Gemini unavailable — using fallback extraction", "warning");
    return FALLBACK_EXTRACTION;
  }

  logActivity("EXTRACTION", "EXTRACT", `Processing inspection report for defect extraction (${reportText.length} chars)...`, "info");

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a railway inspection report analyzer for the RailGuard safety system.

TASK: Extract structured defect information from the following inspection report.

RULES:
- Return ONLY a valid JSON object. No markdown, no code fences, no explanation.
- Every field must be a non-empty string.
- severity must be exactly one of: "low", "medium", "high", "critical"

OUTPUT FORMAT:
{
  "defectType": "type of structural or mechanical defect found",
  "location": "specific location on the rail segment",
  "severity": "low | medium | high | critical",
  "description": "one-sentence summary of the issue",
  "recommendedAction": "specific repair action needed"
}

INSPECTION REPORT:
${reportText}`;

    const geminiResult = await model.generateContent(prompt);
    const responseText = await geminiResult.response.text();
    const result = cleanAndParseJson(responseText, FALLBACK_EXTRACTION);
    if (result === FALLBACK_EXTRACTION) {
      logActivity("EXTRACTION", "EXTRACT", "Gemini unavailable — using fallback extraction", "warning");
    } else {
      logActivity("EXTRACTION", "EXTRACT", `Defect found: ${result.defectType}, severity ${result.severity.toUpperCase()}`, "info");
    }
    return result;
  } catch (error) {
    console.error("Gemini extractDefect API call failed:", error.message);
    logActivity("EXTRACTION", "EXTRACT", "Gemini unavailable — using fallback extraction", "warning");
    return FALLBACK_EXTRACTION;
  }
}

/**
 * Generates a 2-3 sentence risk explanation, optionally enriched
 * with trend prediction and auto-dispatched work order context.
 * @param {Object} segment - The TrackSegment object.
 * @param {Object|null} [prediction=null] - Output of predictTimeToCritical(): { predictedDaysToCritical, trendDirection, slopePerReading }.
 * @param {Object|null} [workOrder=null] - Auto-dispatched work order: { workOrderId, priority, ... }.
 * @returns {Promise<string>} Gemini generated explanation.
 */
async function generateRiskExplanation(segment, prediction = null, workOrder = null) {
  if (!genAI || !segment) {
    console.warn("Gemini client not initialized or segment missing. Using fallback explanation.");
    logActivity("EXTRACTION", "RISK_CALC", `Using fallback explanation for ${segment ? segment.segmentId : "unknown segment"}`, "warning");
    return FALLBACK_EXPLANATION;
  }

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const trendLine = prediction
      ? `\nTrend: Vibration rising at ${prediction.slopePerReading} mm/s per reading. ${
          prediction.predictedDaysToCritical === 0
            ? "Already at critical threshold."
            : `Predicted critical in ~${prediction.predictedDaysToCritical} days.`
        }`
      : "";
    const workOrderLine = workOrder
      ? `\nWork Order: ${workOrder.workOrderId} auto-dispatched with ${workOrder.priority} priority.`
      : "";

    const prompt = `You are a railway safety analyst for the RailGuard monitoring dashboard.

TASK: Write a plain-English explanation of why this segment has its current risk level.

SEGMENT DATA:
Segment: ${segment.segmentId}
Current Status: ${segment.status} (risk score: ${segment.riskScore})
Vibration: ${segment.vibrationLevel} mm/s (critical threshold: 7.0)
Cracks: ${segment.crackCount} unresolved
Incidents: ${segment.incidentCount} historical
Days Since Inspection: ${segment.daysSinceInspection}${trendLine}${workOrderLine}

RULES:
- Output exactly 2-3 sentences. No more. No less.
- Every sentence must cite at least one specific numeric value from the data above.
- Focus on which factors drive the risk score up (vibration, cracks, incidents, age).
- If trend data is provided, mention the prediction.
- If a work order exists, mention it was auto-dispatched.
- Do NOT include repair recommendations or action items.
- Write in plain text only — no JSON, no bullet points, no headers.`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const explanation = responseText.trim();
    if (!explanation) {
      logActivity("EXTRACTION", "RISK_CALC", `Using fallback explanation for ${segment.segmentId}`, "warning");
      return FALLBACK_EXPLANATION;
    }
    logActivity("EXTRACTION", "RISK_CALC",
      `Generated risk narration for ${segment.segmentId} (risk: ${segment.riskScore}${prediction ? `, trend: ${prediction.trendDirection}` : ""})`,
      "info"
    );
    return explanation;
  } catch (error) {
    console.error("Gemini generateRiskExplanation API call failed:", error.message);
    logActivity("EXTRACTION", "RISK_CALC", `Using fallback explanation for ${segment.segmentId}`, "warning");
    return FALLBACK_EXPLANATION;
  }
}

module.exports = {
  extractDefect,
  generateRiskExplanation
};
