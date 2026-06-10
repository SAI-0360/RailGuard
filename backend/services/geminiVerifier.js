const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_MODEL } = require("../utils/constants");
const { FALLBACK_VERIFICATION, DEMO_FALLBACK_VERIFICATION } = require("../utils/fallbacks");
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
 * @param {Object} originalDefect - The DefectLog object.
 * @param {string} repairDescription - The crew's repair description text.
 * @returns {Promise<Object>} Verification report.
 */
async function verifyRepair(originalDefect, repairDescription) {
  // Demo-specific fallback when the demo segment (SEG-042) is involved
  const fallback = (originalDefect && originalDefect.segmentId === "SEG-042")
    ? DEMO_FALLBACK_VERIFICATION
    : FALLBACK_VERIFICATION;

  if (!genAI || !originalDefect || !repairDescription || typeof repairDescription !== "string" || !repairDescription.trim()) {
    console.warn("Gemini client not initialized or missing/invalid arguments. Using fallback verification.");
    logActivity("VERIFICATION", "VERIFY", "Gemini unavailable — using fallback verification", "warning");
    return fallback;
  }

  logActivity("VERIFICATION", "VERIFY", `Verifying repair for defect: ${originalDefect.defectType} (${originalDefect.severity})...`, "info");

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a railway repair verification expert for the RailGuard safety system.

TASK: Determine if the following repair adequately addresses the original defect.

ORIGINAL DEFECT:
Type: ${originalDefect.defectType}
Location: ${originalDefect.location}
Severity: ${originalDefect.severity}
Description: ${originalDefect.description}

REPAIR PERFORMED:
${repairDescription}

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

    const geminiResult = await model.generateContent(prompt);
    const responseText = await geminiResult.response.text();
    const result = cleanAndParseJson(responseText, fallback);
    if (result === fallback) {
      logActivity("VERIFICATION", "VERIFY", "Gemini unavailable — using fallback verification", "warning");
    } else {
      logActivity("VERIFICATION", "VERIFY", `Repair ${result.isVerified ? "VERIFIED" : "REJECTED"} (confidence: ${result.confidence})`, result.isVerified ? "info" : "warning");
    }
    return result;
  } catch (error) {
    console.error("Gemini verifyRepair API call failed:", error.message);
    logActivity("VERIFICATION", "VERIFY", "Gemini unavailable — using fallback verification", "warning");
    return fallback;
  }
}

module.exports = {
  verifyRepair
};
