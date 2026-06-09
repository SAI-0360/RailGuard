const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { extractDefect, generateRiskExplanation } = require("./services/geminiExtractor");
const { verifyRepair } = require("./services/geminiVerifier");
const { sampleReports, sampleRepairs } = require("./data/sampleReports");
const { generateDefectId, generateRepairId } = require("./utils/idGenerator");

// Mock segment for risk explanation testing
const mockCriticalSegment = {
  segmentId: "SEG-042",
  status: "critical",
  riskScore: 70.46,
  vibrationLevel: 8.7,
  crackCount: 2,
  incidentCount: 3,
  daysSinceInspection: 14,
  lastUpdated: new Date().toISOString(),
  activeDefects: [],
  vibrationHistory: [],
};

const mockHealthySegment = {
  segmentId: "SEG-001",
  status: "healthy",
  riskScore: 10.50,
  vibrationLevel: 2.0,
  crackCount: 0,
  incidentCount: 0,
  daysSinceInspection: 5,
  lastUpdated: new Date().toISOString(),
  activeDefects: [],
  vibrationHistory: [],
};

// Edge case inputs
const EDGE_CASES = [
  { name: "Empty string", text: "" },
  { name: "Gibberish", text: "asdfklj asdf98234 zxcv !@#$%^" },
  { name: "No defect report", text: "All segments are in perfect condition. No issues found during routine inspection. Weather was clear, 22°C." },
  { name: "Multiple defects", text: "SEG-099 at KM 99.2 shows a longitudinal crack 15cm long on the rail head, two loose fishplate bolts, and ballast contamination with vegetation growth. Additionally, a transverse crack was detected at the weld joint at KM 99.5. Vibration readings at 9.1 mm/s." },
];

function divider(label) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${label}`);
  console.log("=".repeat(60));
}

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        RAILGUARD AI ENGINE — FULL TEST SUITE            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_key_here";
  console.log(`\nMode: ${hasApiKey ? "🟢 LIVE GEMINI API" : "🟡 FALLBACK MODE (no API key)"}`);

  // ── EXTRACTION TESTS ──────────────────────────────────────
  divider("EXTRACTION TESTS — Sample Reports");

  for (let i = 0; i < sampleReports.length; i++) {
    const sample = sampleReports[i];
    console.log(`\n>>> Test E${i + 1}: ${sample.name}`);
    console.log(`    Segment: ${sample.segmentId}`);
    console.log(`    Input: "${sample.reportText.substring(0, 80)}..."`);
    const result = await extractDefect(sample.reportText);
    console.log(`    Output:`, JSON.stringify(result, null, 6));
    console.log(`    Generated ID: ${generateDefectId()}`);
  }

  // ── EDGE CASE TESTS ───────────────────────────────────────
  divider("EXTRACTION TESTS — Edge Cases");

  for (let i = 0; i < EDGE_CASES.length; i++) {
    const edge = EDGE_CASES[i];
    console.log(`\n>>> Test EDGE-${i + 1}: ${edge.name}`);
    console.log(`    Input: "${edge.text.substring(0, 60)}${edge.text.length > 60 ? "..." : ""}"`);
    const result = await extractDefect(edge.text);
    console.log(`    Output:`, JSON.stringify(result, null, 6));
  }

  // ── RISK EXPLANATION TESTS ─────────────────────────────────
  divider("RISK EXPLANATION TESTS");

  console.log("\n>>> Test R1: Critical Segment (SEG-042)");
  const explCritical = await generateRiskExplanation(mockCriticalSegment);
  console.log(`    Output: "${explCritical}"`);

  console.log("\n>>> Test R2: Healthy Segment (SEG-001)");
  const explHealthy = await generateRiskExplanation(mockHealthySegment);
  console.log(`    Output: "${explHealthy}"`);

  console.log("\n>>> Test R3: Null segment (should fallback)");
  const explNull = await generateRiskExplanation(null);
  console.log(`    Output: "${explNull}"`);

  // ── VERIFICATION TESTS ─────────────────────────────────────
  divider("VERIFICATION TESTS");

  const mockDefect = {
    defectId: "DEF-20260610-001",
    segmentId: "SEG-042",
    defectType: "Transverse rail joint crack",
    location: "Joint bracket, KM 42.3",
    severity: "critical",
    description: "Transverse crack on joint bracket causing elevated vibration at 8.7 mm/s.",
    recommendedAction: "Weld crack, replace bracket bolts, recalibrate vibration sensor.",
    status: "open",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  for (let i = 0; i < sampleRepairs.length; i++) {
    const repair = sampleRepairs[i];
    console.log(`\n>>> Test V${i + 1}: ${repair.name}`);
    console.log(`    Repair: "${repair.repairDescription.substring(0, 80)}..."`);
    const result = await verifyRepair(mockDefect, repair.repairDescription);
    console.log(`    Output:`, JSON.stringify(result, null, 6));
    console.log(`    Generated Repair ID: ${generateRepairId()}`);
  }

  console.log("\n>>> Test V-NULL: Null repair description (should fallback)");
  const vNull = await verifyRepair(mockDefect, null);
  console.log(`    Output:`, JSON.stringify(vNull, null, 6));

  // ── SUMMARY ────────────────────────────────────────────────
  divider("TEST SUITE COMPLETE");
  console.log("\nAll tests executed. Review outputs above for correctness.");
  if (!hasApiKey) {
    console.log("\n💡 To test with live Gemini API, add your key to backend/.env:");
    console.log("   GEMINI_API_KEY=your_actual_api_key_here");
  }
}

runTests().catch((err) => {
  console.error("\n❌ Test suite crashed:", err);
  process.exit(1);
});
