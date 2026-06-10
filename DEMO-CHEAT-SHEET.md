# 🚂 RAILGUARD — DEMO CHEAT SHEET

> **Total Demo Time: 2 minutes**
> **Goal:** Show judges a fully autonomous railway safety system — zero human clicks for detection/dispatch.

---

## PRE-DEMO CHECKLIST (Before Going on Stage)

```bash
# Terminal 1 — Backend
cd backend && npm install && npm start
# Should print: "RailGuard backend running on port 3001"

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
# Should print: "Local: http://localhost:5173"
```

- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Browser open at http://localhost:5173
- [ ] Agent Activity Log visible and showing "Autonomous monitoring activated"
- [ ] All 100 cells green in the grid
- [ ] Have this cheat sheet open on a second screen or printed

---

## PHASE 1 — "The System Watches" (0:00 - 0:20)

**What to say:**
> "RailGuard monitors 100 railway track segments autonomously. The system is already running — we didn't click anything. Look at the Agent Activity Log."

**What judges see:**
- 100 green cells in the 10×10 grid
- Metric cards: 100 Healthy, 0 Warning, 0 Critical
- Agent Activity Log scrolling with MONITOR scan cycles
- Green pulsing "Active" indicator on Monitoring Toggle

**DO:** Point at the Activity Log. Say "Every 10 seconds, autonomous agents scan all 100 segments."

---

## PHASE 2 — "Agents Detect Anomalies" (0:20 - 0:50)

### Step 2a: Use SimulatorPanel to spike SEG-042

1. **Select** `SEG-042` from the Target Segment dropdown
2. **Click** `📈 Simulate Vibration Spike` → vibration jumps to 9.5 mm/s
3. **Watch** Activity Log: `DETECTION: SEG-042 → warning (risk: ~40.5)`
4. **Watch** Cell turns **amber** in the grid

**What to say:**
> "We spiked the vibration to simulate a mechanical fault. The agent detected the anomaly immediately."

### Step 2b: Add cracks to push to critical

5. **Click** `🔨 Simulate Crack Detection` — click **twice** (2 cracks)
6. **Watch** Activity Log: `DETECTION: SEG-042 → critical (risk: ~72.5)`
7. **Watch** Cell turns **red** and pulses
8. **Watch** Activity Log: `DISPATCH: Auto-generated WO-SEG042-001 (priority: urgent)`

**What to say:**
> "With cracks reported, the risk score jumped past 60 — critical. The system auto-dispatched a work order. No human triggered this."

> ⚠️ **DEMO MATH GOTCHA:** Vibration spike alone = ~40.5 (warning only). You MUST add cracks to reach critical (>60).

---

## PHASE 3 — "Detailed Intelligence" (0:50 - 1:20)

1. **Click** the red `SEG-042` cell in the grid
2. **TelemetryPanel** slides out showing:
   - Risk Gauge at ~72.5 (red zone)
   - VibrationChart with the spike visible
   - TrendBadge: "Predicted critical in ~X days"
   - AI Explanation: Gemini-generated narration citing actual numbers

**What to say:**
> "Click any segment for detailed telemetry. The AI generates a natural language risk explanation, and our trend predictor uses linear regression to forecast when segments will hit critical."

---

## PHASE 4 — "AI Extract & Verify" (1:20 - 1:40)

### Step 4a: Extract a defect from inspection report

**Paste this report in the Extraction Form:**
```
During routine inspection of kilometer marker 42.5, significant lateral 
cracking was observed along the rail head surface near the gauge corner. 
The crack measures approximately 15mm in length and 2mm in depth. 
Surface oxidation indicates the crack has been developing over several 
inspection cycles. Rail joint fasteners in the affected area show signs 
of loosening.
```

**Watch** Activity Log: `EXTRACTION: Processing report for SEG-042...` → `EXTRACTION: Defect found — Rail joint crack, severity HIGH`

### Step 4b: Verify a repair

**Paste this repair in the Verification Form:**
```
Replaced cracked rail section with new 60kg/m rail. Performed full rail 
joint tightening and torque verification. Applied ultrasonic testing to 
confirm no subsurface defects in adjacent sections. Recalibrated vibration 
sensors. All fasteners verified to specification.
```

**Watch** Activity Log: `VERIFICATION: Repair verified, confidence: 0.92` → `DISPATCH: Work order WO-SEG042-001 completed`
**Watch** Cell turns **green** again

**What to say:**
> "The AI extracted structured defect data from a text report, then verified the repair was adequate. The work order auto-closes."

---

## PHASE 5 — "The Big Picture" (1:40 - 2:00)

1. **Point at** the Agent Activity Log — it's been scrolling the whole time
2. **Point at** the Metric Cards — they updated live
3. **Click** Reset Segment on SEG-042 (if not already green)

**What to say:**
> "Everything you just saw — detection, risk scoring, trend prediction, work order dispatch, and repair verification — happened autonomously. The Activity Log is the proof. Six agents working together, zero human intervention. That's RailGuard."

---

## 🚨 EMERGENCY BUTTONS

| Situation | Action |
|-----------|--------|
| Everything broke | Click `⚠️ Reset All Segments` |
| Need instant drama | Click `💥 Multi-Failure` in Demo Scenarios |
| Need slow drama | Click `📉 Gradual Degradation` in Demo Scenarios |
| Need cascade | Click `🌊 Cascade Effect` in Demo Scenarios |
| Backend crashed | `cd backend && npm start` |
| Frontend crashed | `cd frontend && npm run dev` |

---

## 📋 PRE-WRITTEN TEXTS (Copy-Paste Ready)

### Inspection Report (for Extract Defect):
```
During routine inspection of kilometer marker 42.5, significant lateral cracking was observed along the rail head surface near the gauge corner. The crack measures approximately 15mm in length and 2mm in depth. Surface oxidation indicates the crack has been developing over several inspection cycles. Rail joint fasteners in the affected area show signs of loosening.
```

### Repair Description (for Verify Repair):
```
Replaced cracked rail section with new 60kg/m rail. Performed full rail joint tightening and torque verification. Applied ultrasonic testing to confirm no subsurface defects in adjacent sections. Recalibrated vibration sensors. All fasteners verified to specification.
```

---

## TIMING MARKS

| Time | What's Happening |
|------|-----------------|
| 0:00 | Open app, show autonomous monitoring running |
| 0:20 | Spike SEG-042 vibration |
| 0:30 | Add 2 cracks → critical → work order auto-dispatched |
| 0:50 | Click SEG-042 → show telemetry details |
| 1:10 | Show AI explanation + trend badge |
| 1:20 | Paste inspection report → extract defect |
| 1:30 | Paste repair → verify → work order closes |
| 1:40 | Zoom out, show Activity Log as proof of autonomy |
| 2:00 | Done 🎉 |
