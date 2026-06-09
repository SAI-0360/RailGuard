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
 * Clean markdown code fences and parse JSON safely.
 */
function cleanAndParseJson(rawText, fallback) {
  let cleaned = rawText.trim();
  
  // Remove markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    
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
      parsed.severity = "medium"; // Safe fallback within parsed structure
    } else {
      parsed.severity = parsed.severity.toLowerCase();
    }
    
    return parsed;
  } catch (error) {
    console.error("JSON parsing/validation failed for Gemini response. Raw text:", rawText);
    console.error("Parse Error details:", error.message);
    return fallback;
  }
}

/**
 * Extracts defect details from unstructured inspection report text.
 * @param {string} reportText - The raw report text.
 * @returns {Promise<Object>} The extracted defect details matching the schema.
 */
async function extractDefect(reportText) {
  if (!genAI || !reportText) {
    console.warn("Gemini client not initialized or empty report text. Using fallback extraction.");
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

TASK: Write a 2-3 sentence plain-English explanation explaining why this track segment has its current risk score and status.

SEGMENT DATA:
- Segment ID: ${segment.segmentId}
- Status: ${segment.status}
- Risk Score: ${segment.riskScore} / 100
- Vibration Level: ${segment.vibrationLevel} mm/s RMS
- Active Cracks Count: ${segment.crackCount}
- Historical Incidents: ${segment.incidentCount}
- Days Since Last Inspection: ${segment.daysSinceInspection}

RULES:
- Keep the explanation to exactly 2-3 sentences.
- Be professional and focus on the safety-critical components (e.g. how vibration, cracks, or age contribute to the risk score).
- Refer to specific values from the segment data.

OUTPUT:
Write the explanation directly as plain text.`;

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
