// backend/data/sampleReports.js
// Sample inspection reports and repair descriptions for demo use.
// These are pasted into the UI during the live demo for judges.

const sampleReports = [
  {
    name: "Report 1: Critical Joint Crack (SEG-042)",
    segmentId: "SEG-042",
    reportText: "Inspection of Segment SEG-042 revealed a transverse crack on the joint bracket at KM 42.3. Vibration readings elevated to 8.7 mm/s. Crack appears to be stress-related from thermal expansion. Immediate repair recommended. Inspector noted visible gap widening under load. Fastener corrosion also observed on adjacent sleepers.",
  },
  {
    name: "Report 2: Worn Rail Head (SEG-077)",
    segmentId: "SEG-077",
    reportText: "Routine check on SEG-077 found worn rail head with visible gauge face wear. Fish plate bolts loose at KM 77.1. Minor ballast fouling observed. Rail profile measurement shows 2mm deviation from standard. Recommended tightening of fish plate assembly and ballast cleaning within 7 days.",
  },
  {
    name: "Report 3: Fastener Degradation (SEG-015)",
    segmentId: "SEG-015",
    reportText: "Segment SEG-015 at KM 15.8 shows multiple loose elastic rail clips on the curve section. Sleeper pads show signs of aging and compression set. Vibration readings at 5.2 mm/s, above normal threshold. No visible cracking but continued degradation likely without maintenance. Recommend clip replacement and pad renewal during next maintenance window.",
  },
];

const sampleRepairs = [
  {
    name: "Repair 1: Joint Crack Weld (for Report 1)",
    segmentId: "SEG-042",
    repairDescription: "Crew R-12 completed welding of transverse crack on joint bracket at KM 42.3. Replaced bracket bolts with high-tensile grade 10.9 fasteners. Recalibrated vibration sensor. Post-repair vibration reading: 2.1 mm/s. Visual inspection confirms crack fully sealed. Adjacent sleeper fasteners also replaced.",
  },
  {
    name: "Repair 2: Rail Head Grinding (for Report 2)",
    segmentId: "SEG-077",
    repairDescription: "Maintenance team performed rail head re-profiling using grinding train at KM 77.1. Fish plate bolts torqued to specification (250 Nm). Ballast cleaned and tamped. Post-repair gauge measurement within 0.5mm tolerance. Rail head profile restored to standard.",
  },
  {
    name: "Repair 3: Clip Replacement (for Report 3)",
    segmentId: "SEG-015",
    repairDescription: "Replaced 24 elastic rail clips on curve section at KM 15.8. Installed new sleeper pads on 12 affected sleepers. Post-repair vibration reading: 2.8 mm/s. All clips torqued and seated correctly. Scheduled follow-up inspection in 30 days.",
  },
];

module.exports = { sampleReports, sampleRepairs };
