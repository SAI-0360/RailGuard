const path = require("path");
// Load environment variables from backend/.env
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { extractDefect, generateRiskExplanation } = require("./services/geminiExtractor");
const { verifyRepair } = require("./services/geminiVerifier");

// Task 3.4 Sample Reports and Repairs
const SAMPLES = {
  report1: "Inspection of Segment SEG-042 revealed a transverse crack on the joint bracket at KM 42.3. Vibration readings elevated to 8.7 mm/s. Crack appears to be stress-related from thermal expansion. Immediate repair recommended.",
  report2: "Routine check on SEG-077 found worn rail head with visible gauge face wear. Fish plate bolts loose at KM 77.1. Minor ballast fouling observed.",
  repair1: "Crew R-12 completed welding of transverse crack on joint bracket at KM 42.3. Replaced bracket bolts. Recalibrated vibration sensor. Post-repair vibration reading: 2.1 mm/s.",
  repair2: "Crew tightened some loose bolts and cleared dirt from the tracks.", // Wont verify critical defect fully
};

const mockSegment = {
  segmentId: "SEG-042",
  status: "critical",
  riskScore: 78.5,
  vibrationLevel: 8.7,
  crackCount: 2,
  incidentCount: 3,
  daysSinceInspection: 14
};

async function runTests() {
  console.log("=========================================");
  console.log("RAILGUARD AI ENGINE - UNIT & SYSTEM TESTS");
  console.log("=========================================");
  
  const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_key_here";
  console.log(`Live Gemini API Key Status: ${hasApiKey ? "AVAILABLE (Testing live API)" : "MISSING (Testing local fallbacks)"}`);
  console.log("=========================================\n");

  // 1. Test Defect Extraction
  console.log(">>> TEST 1: Extract Defect (Report 1) <<<");
  console.log("Input:", SAMPLES.report1);
  const result1 = await extractDefect(SAMPLES.report1);
  console.log("Extracted Output:\n", JSON.stringify(result1, null, 2));
  console.log("-----------------------------------------\n");

  console.log(">>> TEST 2: Extract Defect (Report 2) <<<");
  console.log("Input:", SAMPLES.report2);
  const result2 = await extractDefect(SAMPLES.report2);
  console.log("Extracted Output:\n", JSON.stringify(result2, null, 2));
  console.log("-----------------------------------------\n");

  // 2. Test Risk Explanation
  console.log(">>> TEST 3: Generate Risk Explanation <<<");
  console.log("Input Segment Status:", JSON.stringify(mockSegment, null, 2));
  const explanation = await generateRiskExplanation(mockSegment);
  console.log("Explanation Output:\n", explanation);
  console.log("-----------------------------------------\n");

  // 3. Test Repair Verification
  console.log(">>> TEST 4: Verify Repair (Adequate) <<<");
  const originalDefect = {
    defectId: "DEF-20260609-001",
    segmentId: "SEG-042",
    defectType: "Rail joint crack",
    location: "Joint bracket, KM 42.3",
    severity: "critical",
    description: "Transverse crack on joint bracket causing high vibration levels.",
    recommendedAction: "Weld the joint crack and recalibrate the vibration sensor."
  };
  
  console.log("Original Defect:", JSON.stringify(originalDefect, null, 2));
  console.log("Repair Completed:", SAMPLES.repair1);
  const verification1 = await verifyRepair(originalDefect, SAMPLES.repair1);
  console.log("Verification Output:\n", JSON.stringify(verification1, null, 2));
  console.log("-----------------------------------------\n");

  console.log(">>> TEST 5: Verify Repair (Inadequate) <<<");
  console.log("Repair Completed:", SAMPLES.repair2);
  const verification2 = await verifyRepair(originalDefect, SAMPLES.repair2);
  console.log("Verification Output:\n", JSON.stringify(verification2, null, 2));
  console.log("=========================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
});
