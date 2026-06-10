// backend/testConsistency.js
// Runs each Gemini call 5 times and checks output consistency.
// Usage: cd backend && node testConsistency.js
// Run AFTER all Day 2 modifications are complete.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { extractDefect } = require("./services/geminiExtractor");
const { verifyRepair } = require("./services/geminiVerifier");
const { DEMO_INSPECTION_REPORT, DEMO_REPAIR_DESCRIPTION } = require("./data/demoScripts");

const RUNS = 5;

async function testExtractionConsistency() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  EXTRACTION CONSISTENCY (${RUNS} runs)`);
  console.log(`${"=".repeat(50)}\n`);
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const result = await extractDefect(DEMO_INSPECTION_REPORT);
      results.push(result);
      console.log(`  Run ${i + 1}: ${result.defectType} | ${result.severity} | ${result.location}`);
    } catch (e) {
      console.log(`  Run ${i + 1}: ERROR — ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  const types = [...new Set(results.map(r => r.defectType))];
  const severities = [...new Set(results.map(r => r.severity))];
  console.log(`\n  Unique defect types: ${types.length} — ${types.join(", ")}`);
  console.log(`  Unique severities: ${severities.length} — ${severities.join(", ")}`);
  console.log(types.length <= 2 && severities.length <= 2
    ? "  ✅ PASS — Output is reasonably consistent"
    : "  ⚠️ WARN — High variance. Consider tightening the prompt.");
}

async function testVerificationConsistency() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  VERIFICATION CONSISTENCY (${RUNS} runs)`);
  console.log(`${"=".repeat(50)}\n`);
  const mockDefect = {
    defectId: "DEF-20260610-001",
    segmentId: "SEG-042",
    defectType: "Transverse rail crack",
    location: "Joint bracket, KM 42.3",
    severity: "critical",
    description: "12mm transverse crack at rail joint bracket",
    recommendedAction: "Grind and thermite weld, replace bolts"
  };
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const result = await verifyRepair(mockDefect, DEMO_REPAIR_DESCRIPTION);
      results.push(result);
      console.log(`  Run ${i + 1}: verified=${result.isVerified} | confidence=${result.confidence} | status=${result.statusRecommendation}`);
    } catch (e) {
      console.log(`  Run ${i + 1}: ERROR — ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  const verifiedCount = results.filter(r => r.isVerified).length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  console.log(`\n  Verified: ${verifiedCount}/${RUNS}`);
  console.log(`  Avg confidence: ${avgConfidence.toFixed(2)}`);
  console.log(verifiedCount === RUNS
    ? "  ✅ PASS — Consistently verifies the demo repair"
    : "  ⚠️ WARN — Inconsistent verification. Check the prompt.");
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   RAILGUARD — Gemini Consistency Test        ║");
  console.log("╚══════════════════════════════════════════════╝");
  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_key_here";
  if (!hasKey) {
    console.log("\n⚠️ No API key — all calls will use fallbacks. Add GEMINI_API_KEY to .env");
    return;
  }
  console.log("\n🟢 Using LIVE Gemini API\n");
  await testExtractionConsistency();
  await testVerificationConsistency();
  console.log("\n✅ All consistency tests complete.");
}

main().catch(console.error);
