// backend/data/demoScripts.js
// Pre-written demo scripts for the live hackathon presentation.
// The presenter copies these into the ExtractionForm and VerificationForm.
// Tested 5x for consistency — DO NOT modify the wording.

/**
 * Full inspection report for SEG-042 — produces a "critical" defect extraction.
 * Paste this into the ExtractionForm during demo Phase 4.
 */
const DEMO_INSPECTION_REPORT = `Routine inspection of Segment SEG-042, KM 42.3, conducted June 10 2026.
Visual and ultrasonic inspection revealed a transverse crack approximately 12mm in length
at the rail joint bracket on the gauge face side. Vibration readings from the onboard
accelerometer measured 8.7 mm/s RMS, significantly exceeding the 7.0 mm/s critical threshold.
The fish plate bolts show moderate corrosion and the elastic rail clips on adjacent sleepers
exhibit reduced clamping force. Historical records indicate 3 prior incidents in this zone
over the past 18 months. Last full inspection was 14 days ago. Immediate action recommended.`;

/**
 * Full repair description matching Report above — produces "isVerified: true, confidence: 0.92+".
 * Paste this into the VerificationForm during demo Phase 4.
 */
const DEMO_REPAIR_DESCRIPTION = `Maintenance crew arrived on-site within 2 hours of work order dispatch.
The transverse crack at KM 42.3 was addressed by grinding out the affected area to a depth
of 3mm and applying a thermite weld patch per RDSO specification. All fish plate bolts were
replaced with new high-tensile Grade 8.8 bolts torqued to 250 Nm. Three elastic rail clips
were replaced. Post-repair vibration measurement recorded 2.1 mm/s RMS, well within the
4.0 mm/s normal threshold. Segment cleared for normal traffic speed.`;

/**
 * Short versions for quick demo if running out of time.
 */
const DEMO_QUICK_REPORT = `SEG-042 inspection: 12mm transverse crack at joint bracket, vibration 8.7 mm/s RMS (critical), 2 corroded fish plate bolts, 14 days since last inspection.`;

const DEMO_QUICK_REPAIR = `Crack ground and thermite welded, all bolts replaced with Grade 8.8, clips replaced. Post-repair vibration: 2.1 mm/s.`;

module.exports = {
  DEMO_INSPECTION_REPORT,
  DEMO_REPAIR_DESCRIPTION,
  DEMO_QUICK_REPORT,
  DEMO_QUICK_REPAIR
};
