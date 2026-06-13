// backend/services/geminiPing.js
// Minimal Gemini connectivity probe. Used by the server.js startup check to
// report (without crashing) whether real Gemini calls will work or whether the
// extractor/verifier will run in fallback mode.

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_MODEL, GEMINI_TIMEOUT_MS } = require("../utils/constants");

/**
 * Send a one-token prompt to Gemini and return the trimmed response text.
 * Throws on missing key, timeout, or any API error — callers decide severity.
 * @returns {Promise<string>} e.g. "ONLINE"
 */
async function pingGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await Promise.race([
    model.generateContent("Reply with only the word ONLINE"),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini ping timed out after ${GEMINI_TIMEOUT_MS}ms`)), GEMINI_TIMEOUT_MS)
    ),
  ]);

  return (await result.response.text()).trim();
}

module.exports = { pingGemini };
