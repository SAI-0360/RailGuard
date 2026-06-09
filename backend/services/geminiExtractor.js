const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_MODEL } = require("../utils/constants");
const { FALLBACK_EXTRACTION, FALLBACK_EXPLANATION } = require("../utils/fallbacks");

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
    return FALLBACK_EXTRACTION;
  }

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

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    return cleanAndParseJson(responseText, FALLBACK_EXTRACTION);
  } catch (error) {
    console.error("Gemini extractDefect API call failed:", error.message);
    return FALLBACK_EXTRACTION;
  }
}

/**
 * Generates a 2-3 sentence risk explanation.
 * @param {Object} segment - The TrackSegment object.
 * @returns {Promise<string>} Gemini generated explanation.
 */
async function generateRiskExplanation(segment) {
  if (!genAI || !segment) {
    console.warn("Gemini client not initialized or segment missing. Using fallback explanation.");
    return FALLBACK_EXPLANATION;
  }

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a railway safety analyst for the RailGuard monitoring dashboard.

TASK: Write a plain-English explanation of why segment ${segment.segmentId} has a risk score of ${segment.riskScore}/100 and status "${segment.status}".

SEGMENT DATA:
- Vibration Level: ${segment.vibrationLevel} mm/s RMS
- Active Cracks Count: ${segment.crackCount}
- Historical Incidents: ${segment.incidentCount}
- Days Since Last Inspection: ${segment.daysSinceInspection}

RULES:
- Output exactly 2-3 sentences. No more. No less.
- Every sentence must cite at least one specific numeric value from the segment data above.
- Focus on which factors drive the risk score up (vibration, cracks, incidents, age).
- Do NOT include repair recommendations or action items.
- Write in plain text only — no JSON, no bullet points, no headers.`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    return responseText.trim() || FALLBACK_EXPLANATION;
  } catch (error) {
    console.error("Gemini generateRiskExplanation API call failed:", error.message);
    return FALLBACK_EXPLANATION;
  }
}

module.exports = {
  extractDefect,
  generateRiskExplanation
};
