require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testConnection() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_key_here") {
    console.log("⚠️  No GEMINI_API_KEY found in backend/.env");
    console.log("   Get one free at: https://aistudio.google.com/apikey");
    console.log("   Add it to backend/.env as: GEMINI_API_KEY=your_actual_key");
    console.log("\n✅ Fallback mode is functional — the app will still work without a key.");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Reply with exactly: RAILGUARD_OK");
    const text = await result.response.text();
    console.log("✅ Gemini API connection successful!");
    console.log("   Response:", text.trim());
  } catch (error) {
    console.error("❌ Gemini API connection failed:", error.message);
    console.log("   Check that your API key is valid and has quota remaining.");
  }
}

testConnection();
