const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_MODEL } = require("../utils/constants");
const { FALLBACK_VERIFICATION } = require("../utils/fallbacks");

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
    if (typeof parsed.isVerified !== "boolean") {
      throw new Error("isVerified must be a boolean");
    }
    if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error("confidence must be a number between 0.0 and 1.0");
    }
    if (!parsed.verificationReasoning || typeof parsed.verificationReasoning !== "string") {
      throw new Error("verificationReasoning must be a string");
    }
    
    // Validate statusRecommendation
    const validRecommendations = ["healthy", "warning", "critical"];
    if (!parsed.statusRecommendation || !validRecommendations.includes(parsed.statusRecommendation.toLowerCase())) {
      parsed.statusRecommendation = "healthy"; // Default recommendation
    } else {
      parsed.statusRecommendation = parsed.statusRecommendation.toLowerCase();
    }
    
    return parsed;
  } catch (error) {
    console.error("JSON parsing/validation failed for Gemini verifier response. Raw text:", rawText);
    console.error("Parse Error details:", error.message);
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
  if (!genAI || !originalDefect || !repairDescription) {
    console.warn("Gemini client not initialized or missing arguments. Using fallback verification.");
    return FALLBACK_VERIFICATION;
  }

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

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    return cleanAndParseJson(responseText, FALLBACK_VERIFICATION);
  } catch (error) {
    console.error("Gemini verifyRepair API call failed:", error.message);
    return FALLBACK_VERIFICATION;
  }
}

module.exports = {
  verifyRepair
};
