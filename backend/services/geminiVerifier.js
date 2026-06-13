const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_MODEL, GEMINI_TIMEOUT_MS, GEMINI_RETRY_DELAY_MS } = require("../utils/constants");
const { FALLBACK_VERIFICATION, DEMO_FALLBACK_VERIFICATION } = require("../utils/fallbacks");
const { logActivity } = require("./activityLogger");
const { getUseMockAi } = require("../config/aiConfig");

let genAI = null;
function getGenAI() {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "your_key_here") {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Call Gemini with a hard timeout and a single retry on transient errors
 * (rate limits, network hiccups, timeouts). Throws if both attempts fail.
 * @param {Object} model - Gemini GenerativeModel instance.
 * @param {string} prompt - The full prompt text.
 * @returns {Promise<string>} Raw response text.
 */
async function callGeminiWithRetry(model, prompt) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini call timed out after ${GEMINI_TIMEOUT_MS}ms`)), GEMINI_TIMEOUT_MS)
        )
      ]);
      return await result.response.text();
    } catch (error) {
      lastError = error;
      console.error(`Gemini call error on attempt ${attempt}:`, error.message, "| Status:", error.status || error.statusCode || "N/A");
      const transient = /429|503|timed out|fetch/i.test(error.message);
      if (attempt === 1 && transient) {
        console.warn(`Gemini call failed (attempt 1, transient): ${error.message}. Retrying in ${GEMINI_RETRY_DELAY_MS}ms...`);
        await new Promise(r => setTimeout(r, GEMINI_RETRY_DELAY_MS));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

/**
 * Multi-strategy JSON extraction: raw parse → strip fences → extract first {...} block.
 */
function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const text = rawText.trim();

  // gemini-2.5-flash sometimes returns the object inside a JSON array. Unwrap
  // to the first object so the single-object validation downstream still works.
  const unwrap = (v) => (Array.isArray(v) ? v.find((el) => el && typeof el === "object") || null : v);

  // Strategy 1: raw parse
  try { return unwrap(JSON.parse(text)); } catch (_) {}

  // Strategy 2: strip all code fence variants then parse
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?\s*```\s*$/m, "")
    .trim();
  try { return unwrap(JSON.parse(stripped)); } catch (_) {}

  // Strategy 3: pull out the largest {...} block (handles prose before/after JSON)
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }

  return null;
}

/**
 * Parse and validate a Gemini verification response.
 */
function cleanAndParseJson(rawText, fallback) {
  const parsed = extractJsonFromText(rawText);

  if (!parsed) {
    console.error("All JSON parse attempts failed. Raw text:", String(rawText).substring(0, 200));
    return fallback;
  }

  try {
    if (typeof parsed.isVerified !== "boolean") {
      throw new Error("isVerified must be a boolean");
    }
    if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error("confidence must be a number between 0.0 and 1.0");
    }
    if (!parsed.verificationReasoning || typeof parsed.verificationReasoning !== "string") {
      throw new Error("verificationReasoning must be a non-empty string");
    }

    const validRecommendations = ["healthy", "warning", "critical"];
    if (!parsed.statusRecommendation || !validRecommendations.includes(parsed.statusRecommendation.toLowerCase())) {
      parsed.statusRecommendation = "healthy";
    } else {
      parsed.statusRecommendation = parsed.statusRecommendation.toLowerCase();
    }

    return parsed;
  } catch (error) {
    console.error("Gemini verifier validation failed:", error.message, "| Raw text:", String(rawText).substring(0, 200));
    return fallback;
  }
}

/**
 * Verifies if a repair addresses the original defect.
 *
 * Takes a flat DTO — NOT the segment object. The caller (aiRoutes) is
 * responsible for projecting only the scalar fields below; this guarantees the
 * massive arrays now living on a segment (JIT geo-coordinates, 20-point
 * vibration history) and the full segments array never reach the prompt and
 * never inflate the input-token count (the cause of the free-tier 429).
 *
 * @param {Object} payload
 * @param {string} payload.defectType
 * @param {string} payload.severity
 * @param {string} payload.defectDescription
 * @param {string} payload.repairReportText - the crew's repair description
 * @param {number} [payload.vibrationLevel] - current reading (scalar)
 * @param {number} [payload.riskScore]      - current score (scalar)
 * @param {string} [payload.segmentId]      - for demo-fallback selection only
 * @returns {Promise<Object>} Verification report.
 */
async function verifyRepair(payload) {
  // --- DTO boundary: destructure ONLY scalars, right before the LLM call. ---
  // Nothing outside these locals is interpolated into the prompt below, so no
  // extraneous JSON (arrays, nested objects) can leak into the request body.
  const {
    defectType = "Unknown defect",
    severity = "unknown",
    defectDescription = "",
    repairReportText = "",
    vibrationLevel = null,
    riskScore = null,
    segmentId = null,
  } = payload || {};

  if (getUseMockAi()) {
    console.warn("⚠️ MOCK AI ENABLED: Bypassing Gemini API. No quota used.");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      isVerified: true,
      confidence: 0.98,
      verificationReasoning: "[MOCK AI] Repair looks solid, fishplates tightened.",
      statusRecommendation: "healthy"
    };
  }

  // Demo-specific fallback when the demo segment (SEG-042) is involved
  const fallback = segmentId === "SEG-042" ? DEMO_FALLBACK_VERIFICATION : FALLBACK_VERIFICATION;

  const client = getGenAI();
  if (!client || !repairReportText || typeof repairReportText !== "string" || !repairReportText.trim()) {
    console.warn("Gemini client not initialized or missing/invalid arguments. Using fallback verification.");
    logActivity("VERIFICATION", "VERIFY", "Gemini unavailable — using fallback verification", "warning");
    return fallback;
  }

  logActivity("VERIFICATION", "VERIFY", `Verifying repair for defect: ${defectType} (${severity})...`, "info");

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const telemetryLine = [
      vibrationLevel != null ? `Vibration: ${vibrationLevel} mm/s` : null,
      riskScore != null ? `Risk score: ${riskScore}` : null,
    ].filter(Boolean).join("\n");

    const prompt = `You are a railway repair verification expert for the RailGuard safety system.

TASK: Determine if the following repair adequately addresses the original defect.

ORIGINAL DEFECT:
Type: ${defectType}
Severity: ${severity}
Description: ${defectDescription}
${telemetryLine ? `\nCURRENT TELEMETRY:\n${telemetryLine}\n` : ""}
REPAIR PERFORMED:
${repairReportText}

RULES:
- Return ONLY a valid JSON object. No markdown, no code fences, no explanation.
- isVerified must be a boolean (true/false).
- confidence must be a number between 0.00 and 1.00.
- statusRecommendation must be exactly one of: "healthy", "warning", "critical"

OUTPUT FORMAT:
{
  "isVerified": true or false,
  "confidence": 0.00 to 1.00,
  "verificationReasoning": "explain why the repair is or isn't adequate",
  "statusRecommendation": "healthy | warning | critical"
}`;

    const responseText = await callGeminiWithRetry(model, prompt);
    const result = cleanAndParseJson(responseText, fallback);
    if (result === fallback) {
      logActivity("VERIFICATION", "VERIFY", "Gemini unavailable — using fallback verification", "warning");
    } else {
      logActivity("VERIFICATION", "VERIFY", `Repair ${result.isVerified ? "VERIFIED" : "REJECTED"} (confidence: ${result.confidence})`, result.isVerified ? "info" : "warning");
    }
    return result;
  } catch (error) {
    console.error("Gemini verifyRepair API call failed:", error.message, "| Status:", error.status || error.statusCode || "N/A");
    logActivity("VERIFICATION", "VERIFY", "Gemini unavailable — using fallback verification", "warning");
    return fallback;
  }
}

module.exports = {
  verifyRepair
};
