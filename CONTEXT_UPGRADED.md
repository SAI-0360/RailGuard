# RAILGUARD — Autonomous Railway Safety Inspector

**READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.** This is the single source of truth for the RailGuard project. Every team member and every AI coding agent must follow this exactly. Do not deviate from the architecture, naming, or API contracts defined here.

---

## PROJECT OVERVIEW

**RailGuard** is an autonomous railway safety monitoring system built for the **FAR AWAY 2026 hackathon** under the **"Agentic & Autonomous Systems"** theme.

**What it does:** AI-powered services continuously monitor 100 railway track segments, detect anomalies using deterministic math (risk formula), compute risk scores, and dispatch maintenance orders — ALL WITHOUT HUMAN INTERVENTION. The key word is **autonomous**. The system watches, detects, predicts, and acts on its own.

**Demo flow:** Start the app → autonomous monitoring loop begins immediately → segments slowly degrade → agents detect anomalies → risk scores climb → alerts fire → work orders auto-dispatched → repair is submitted → Gemini verifies → segment returns to healthy. The judges watch this happen live with zero human clicks. The Agent Activity Log shows every agent decision in real time.

---

## TEAM ROLES

| Person | Role | What They Build |
| :---- | :---- | :---- |
| **Member 1** | Frontend Dev | React dashboard — 100-segment grid, metric cards, charts, agent activity log, work order panel. |
| **Member 2** | Backend Dev | Express server, data layer, REST routes, risk engine, autonomous monitoring loop, work order generation. |
| **Member 3** | AI Engineer | Gemini extractor & verifier services, activity logger, trend prediction, prompts, fallbacks, constants. |
| **Member 4** | Integrator | Frontend API service, polling hooks, shared utilities, environment config, wiring new endpoints. |
| **Member 5** | Simulator \+ Data | SimulatorPanel component, vibration history pre-population, demo scenarios, monitoring toggle. |

---

## TECH STACK — DO NOT CHANGE THESE

### Backend

- **Node.js** — runtime environment  
- **Express** — REST API server (port 3001\)  
- **@google/generative-ai** — Google Gemini 2.0 Flash SDK for report extraction and repair verification  
- **In-memory data store** — `data/segments.js` array (100 TrackSegment objects)  
- **cors** — cross-origin requests  
- **dotenv** — environment variable loading

### Frontend

- **React 18** via **Vite 5**  
- **JavaScript (JSX)**  
- **Tailwind CSS 3** — styling  
- **Framer Motion 11** — animations  
- **Recharts 2** — charts and graphs  
- **Axios** — HTTP client for REST calls

### Deployment

- **Vercel** — frontend  
- **Railway** — backend

### Git

- **GitHub** — repo hosting  
- All members work on their respective branches and coordinate merges.

---

## FOLDER STRUCTURE

mavericks/

├── .gitignore

├── CONTEXT.md

├── DAY-1 AUDIT.md

├── README.md

│

├── backend/

│   ├── .env.example            \# GEMINI\_API\_KEY \+ PORT=3001

│   ├── server.js               \# Express entry point, CORS, route mounts, autonomous monitoring loop

│   │

│   ├── data/

│   │   └── segments.js         \# 100 TrackSegment objects (in-memory data store)

│   │

│   ├── routes/

│   │   ├── segmentRoutes.js    \# GET /api/segments, GET /api/segments/:segmentId, POST /simulate

│   │   ├── statsRoutes.js      \# GET /api/stats, POST /api/reset-all

│   │   ├── aiRoutes.js         \# POST /api/extract-defect, POST /api/verify-repair

│   │   ├── monitoringRoutes.js \# POST /api/monitoring/start|stop, GET /api/monitoring/status  \[NEW\]

│   │   └── workOrderRoutes.js  \# GET /api/work-orders  \[NEW\]

│   │

│   ├── services/

│   │   ├── riskEngine.js       \# Deterministic risk formula \+ predictTimeToCritical()  \[UPGRADED\]

│   │   ├── geminiExtractor.js  \# extractDefect() \+ generateRiskExplanation() via Gemini  \[UPGRADED\]

│   │   ├── geminiVerifier.js   \# verifyRepair() via Gemini  \[UPGRADED\]

│   │   └── activityLogger.js   \# Global agent activity log — logActivity(), getRecentLogs()  \[NEW\]

│   │

│   ├── utils/

│   │   ├── constants.js        \# 21+ constants: weights, thresholds, IDs, model name

│   │   ├── idGenerator.js      \# DEF-YYYYMMDD-NNN \+ RPR-YYYYMMDD-NNN generators

│   │   └── fallbacks.js        \# FALLBACK\_EXTRACTION, FALLBACK\_VERIFICATION, FALLBACK\_EXPLANATION

│   │

│   └── middleware/

│       └── errorHandler.js     \# Global Express error handler → { error: err.message }

│

├── frontend/                   \# Separate Vite project

│   ├── package.json

│   ├── vite.config.js          \# Proxy /api → localhost:3001

│   ├── tailwind.config.js      \# Custom colors \+ Inter font

│   ├── postcss.config.js

│   ├── index.html              \# Inter font from Google Fonts

│   ├── .env                    \# VITE\_API\_URL=http://localhost:3001

│   ├── src/

│   │   ├── App.jsx

│   │   ├── main.jsx

│   │   ├── index.css           \# Tailwind directives \+ pulse keyframes

│   │   ├── components/

│   │   │   ├── CellGrid.jsx        \# 10×10 grid of rail segments

│   │   │   ├── CellItem.jsx        \# Individual color-coded cell with pulse animation

│   │   │   ├── MetricCards.jsx      \# 4 glassmorphic stat cards

│   │   │   ├── SimulatorPanel.jsx   \# Spike/crack/reset simulator controls \+ monitoring toggle

│   │   │   ├── AgentActivityLog.jsx \# Terminal-style scrolling log of agent actions  \[NEW\]

│   │   │   ├── WorkOrderPanel.jsx   \# List of auto-generated work orders  \[NEW\]

│   │   │   └── TrendBadge.jsx       \# "Critical in \~3 days" warning indicator  \[NEW\]

│   │   ├── hooks/

│   │   │   ├── useSegments.js       \# Polls GET /api/segments every 5s

│   │   │   ├── useStats.js          \# Polls GET /api/stats every 5s

│   │   │   ├── useSelectedSegment.js \# Fetches single segment detail

│   │   │   ├── useActivityLog.js    \# Polls GET /api/activity-log every 3s  \[NEW\]

│   │   │   └── useWorkOrders.js     \# Polls GET /api/work-orders every 5s  \[NEW\]

│   │   ├── services/

│   │   │   └── api.js               \# Axios instance \+ API wrapper functions (expanded)

│   │   └── utils/

│   │       ├── constants.js         \# Shared frontend constants

│   │       └── statusColors.js      \# Status-to-color mapping helper

│   └── public/

**IMPORTANT:** Do not add new dependencies without coordinating with the team first.

---

## THE 5 UPGRADES (NEW — Integrated Into Architecture)

These 5 upgrades transform RailGuard from a reactive dashboard into an autonomous agent system that directly matches the hackathon theme.

### Upgrade 1: Autonomous Monitoring Loop

**What:** A background `setInterval` in `server.js` that auto-scans all 100 segments every 10 seconds. On each cycle, it applies subtle vibration drift to simulate real-world degradation, recalculates risk scores, detects status transitions, and fires alerts — without any human triggering anything.

**Why:** The hackathon theme is "Agentic & Autonomous Systems." Without this, the system only reacts when a human clicks something. With this, agents watch, detect, and act on their own.

**Implementation (in server.js):**

let monitoringActive \= false;

let cycleCount \= 0;

let monitoringInterval \= null;

function runMonitoringCycle() {

  cycleCount++;

  logActivity("MONITOR", "SCAN", \`Cycle \#${cycleCount}: Scanning 100 segments...\`, "info");

  let healthyCount \= 0, warningCount \= 0, criticalCount \= 0;

  segments.forEach(seg \=\> {

    const previousStatus \= seg.status;

    // Subtle vibration drift — most segments stay healthy, some slowly degrade

    seg.vibrationLevel \+= (Math.random() \- 0.45) \* 0.3;

    seg.vibrationLevel \= Math.max(0.5, parseFloat(seg.vibrationLevel.toFixed(3)));

    // Push new telemetry reading

    seg.vibrationHistory.push({

      timestamp: new Date().toISOString(),

      vibrationLevel: seg.vibrationLevel,

      temperature: parseFloat((35 \+ Math.random() \* 5).toFixed(2)),

      crackDetected: false

    });

    if (seg.vibrationHistory.length \> MAX\_VIBRATION\_HISTORY) {

      seg.vibrationHistory.shift();

    }

    // Recalculate risk

    const { riskScore, status } \= calculateRisk(seg);

    seg.riskScore \= riskScore;

    seg.status \= status;

    seg.lastUpdated \= new Date().toISOString();

    // Detect status transitions

    if (previousStatus \!== status && status \!== "healthy") {

      logActivity("DETECTION", "ANOMALY",

        \`${seg.segmentId} → ${status} (risk: ${riskScore})\`,

        status \=== "critical" ? "critical" : "warning"

      );

    }

    // Count statuses

    if (status \=== "healthy") healthyCount++;

    else if (status \=== "warning") warningCount++;

    else criticalCount++;

  });

  logActivity("MONITOR", "SCAN",

    \`Cycle \#${cycleCount} complete: ${healthyCount} healthy, ${warningCount} warning, ${criticalCount} critical\`,

    criticalCount \> 0 ? "warning" : "info"

  );

}

// Start monitoring on server boot

function startMonitoring() {

  if (\!monitoringActive) {

    monitoringActive \= true;

    monitoringInterval \= setInterval(runMonitoringCycle, 10000);

    logActivity("SYSTEM", "START", "Autonomous monitoring activated", "info");

  }

}

function stopMonitoring() {

  if (monitoringActive) {

    monitoringActive \= false;

    clearInterval(monitoringInterval);

    logActivity("SYSTEM", "STOP", "Monitoring stopped by operator", "info");

  }

}

// Auto-start on server boot

startMonitoring();

**New Endpoints (monitoringRoutes.js):** | Method | Path | Response | |--------|------|----------| | POST | /api/monitoring/start | `{ status: "started" }` | | POST | /api/monitoring/stop | `{ status: "stopped" }` | | GET | /api/monitoring/status | `{ active: true, cycleCount: 42 }` |

---

### Upgrade 2: Agent Activity Log

**What:** A central in-memory log that every service pushes messages to. Shows real-time agent "thinking" on the frontend as a terminal-style scrolling panel.

**Why:** This is the PROOF that agents are working autonomously. Without it, the dashboard just shows colors changing. With it, judges can READ the agent reasoning. It's the visual showpiece.

**New File: `services/activityLogger.js`**

const activityLog \= \[\];

let logCounter \= 0;

const MAX\_LOG\_ENTRIES \= 500;

function logActivity(agent, action, message, severity \= "info") {

  logCounter++;

  const entry \= {

    id: logCounter,

    timestamp: new Date().toISOString(),

    agent,      // "MONITOR" | "DETECTION" | "EXTRACTION" | "VERIFICATION" | "DISPATCH" | "SYSTEM"

    action,     // "SCAN" | "ANOMALY" | "RISK\_CALC" | "EXTRACT" | "VERIFY" | "WORK\_ORDER" | "START" | "STOP"

    message,    // Human-readable description

    severity    // "info" | "warning" | "critical"

  };

  activityLog.push(entry);

  if (activityLog.length \> MAX\_LOG\_ENTRIES) {

    activityLog.shift();

  }

  return entry;

}

function getRecentLogs(limit \= 50\) {

  return activityLog.slice(-limit);

}

function clearLogs() {

  activityLog.length \= 0;

  logCounter \= 0;

}

module.exports \= { logActivity, getRecentLogs, clearLogs };

**Activity Log Entry Shape:**

{

  "id": 1,

  "timestamp": "2026-06-10T10:30:01.000Z",

  "agent": "DETECTION",

  "action": "ANOMALY",

  "message": "SEG-042 vibration 8.7 mm/s → risk score 70.46 CRITICAL",

  "severity": "critical"

}

**Agent Name Colors (for frontend):** | Agent | Color | Hex | |-------|-------|-----| | MONITOR | Blue | \#60a5fa | | DETECTION | Amber | \#f59e0b | | EXTRACTION | Purple | \#a78bfa | | VERIFICATION | Green | \#34d399 | | DISPATCH | Pink | \#fb7185 | | SYSTEM | Gray | \#94a3b8 |

**Where logActivity() is called:**

- `server.js` monitoring loop: MONITOR agent logs scan start/end, DETECTION agent logs anomalies  
- `geminiExtractor.js`: EXTRACTION agent logs processing start, defect found, fallback used  
- `geminiVerifier.js`: VERIFICATION agent logs verify start, result, fallback used  
- Work order generation: DISPATCH agent logs auto-generated orders  
- Monitoring start/stop: SYSTEM agent logs state changes

**New Endpoints:** | Method | Path | Response | |--------|------|----------| | GET | /api/activity-log?limit=50 | Array of log entries (most recent) | | POST | /api/activity-log/clear | `{ status: "cleared" }` |

**Frontend Component: `AgentActivityLog.jsx`**

- Polls `GET /api/activity-log?limit=100` every 3 seconds  
- Terminal-style dark panel (\#0a0a14), monospace font  
- Each line: `[HH:MM:SS] AGENT_NAME message`  
- Agent name color-coded per table above  
- Critical severity rows get red-tinted background  
- Auto-scrolls to bottom on new entries  
- Max height 300px with overflow-y scroll

---

### Upgrade 3: Auto Work Order Generation

**What:** When the autonomous monitoring loop detects a segment transitioning to "critical", it automatically generates a work order — no human triggers this.

**Why:** Completes the autonomous pipeline: detect → assess → dispatch. The system doesn't just report problems, it takes action.

**Work Order Shape:**

{

  "workOrderId": "WO-SEG042-001",

  "segmentId": "SEG-042",

  "riskScore": 72.5,

  "priority": "urgent",

  "reason": "Risk score 72.5 exceeded critical threshold (60)",

  "recommendedAction": "Immediate physical inspection and sensor recalibration required",

  "status": "pending",

  "createdAt": "2026-06-10T10:30:02.000Z",

  "completedAt": null

}

**Implementation (added to monitoring loop in server.js):**

const workOrders \= \[\];

let workOrderCounter \= 0;

// Inside runMonitoringCycle(), after status transition detection:

if (previousStatus \!== "critical" && status \=== "critical") {

  // Check no pending work order already exists for this segment

  const existingPending \= workOrders.find(

    wo \=\> wo.segmentId \=== seg.segmentId && wo.status \=== "pending"

  );

  if (\!existingPending) {

    workOrderCounter++;

    const wo \= {

      workOrderId: \`WO-${seg.segmentId}-${String(workOrderCounter).padStart(3, "0")}\`,

      segmentId: seg.segmentId,

      riskScore: seg.riskScore,

      priority: seg.riskScore \> 80 ? "urgent" : "high",

      reason: \`Risk score ${seg.riskScore} exceeded critical threshold (60)\`,

      recommendedAction: "Immediate physical inspection and sensor recalibration required",

      status: "pending",

      createdAt: new Date().toISOString(),

      completedAt: null

    };

    workOrders.push(wo);

    logActivity("DISPATCH", "WORK\_ORDER",

      \`Auto-generated ${wo.workOrderId} for ${seg.segmentId} (priority: ${wo.priority})\`,

      "critical"

    );

  }

}

**When repair is verified:** In the verify-repair route, find the pending work order for that segment and set `status: "completed"` and `completedAt` to now. Log it:

logActivity("DISPATCH", "WORK\_ORDER",

  \`Work order ${wo.workOrderId} completed — ${seg.segmentId} repaired\`,

  "info"

);

**New Endpoints (workOrderRoutes.js):** | Method | Path | Response | |--------|------|----------| | GET | /api/work-orders | `{ workOrders: [...] }` | | GET | /api/work-orders?status=pending | Filtered by status |

---

### Upgrade 4: Trend Prediction

**What:** Simple linear regression on vibration history to predict WHEN a segment will hit critical. Shows "Predicted critical in \~3 days" on the telemetry panel.

**Why:** Upgrades the system from REACTIVE ("it's critical now") to PREDICTIVE ("it will be critical in 3 days"). Simple math but sounds incredibly sophisticated.

**New Function (added to riskEngine.js):**

function predictTimeToCritical(segment) {

  const history \= segment.vibrationHistory;

  if (\!history || history.length \< 5\) return null;

  const values \= history.map(h \=\> h.vibrationLevel);

  const n \= values.length;

  const xMean \= (n \- 1\) / 2;

  const yMean \= values.reduce((sum, v) \=\> sum \+ v, 0\) / n;

  let numerator \= 0;

  let denominator \= 0;

  for (let i \= 0; i \< n; i++) {

    numerator \+= (i \- xMean) \* (values\[i\] \- yMean);

    denominator \+= (i \- xMean) \*\* 2;

  }

  if (denominator \=== 0\) return null;

  const slope \= numerator / denominator;

  // Not degrading — vibration stable or decreasing

  if (slope \<= 0\) return null;

  // Already critical

  const current \= values\[values.length \- 1\];

  if (current \>= 7.0) return { predictedDaysToCritical: 0, trendDirection: "critical\_now", slopePerReading: parseFloat(slope.toFixed(4)) };

  const readingsToThreshold \= (7.0 \- current) / slope;

  const estimatedDays \= Math.ceil(readingsToThreshold / 6); // \~6 readings/day from monitoring loop

  if (estimatedDays \> 30\) return null; // Too far out to be meaningful

  return {

    predictedDaysToCritical: estimatedDays,

    trendDirection: "rising",

    slopePerReading: parseFloat(slope.toFixed(4))

  };

}

function getTrendSummary(segment) {

  const prediction \= predictTimeToCritical(segment);

  if (\!prediction) return null;

  if (prediction.predictedDaysToCritical \=== 0\) return "CRITICAL NOW — immediate attention required";

  if (prediction.predictedDaysToCritical \<= 3\) return \`Predicted critical in \~${prediction.predictedDaysToCritical} days — urgent monitoring\`;

  if (prediction.predictedDaysToCritical \<= 7\) return \`Trending upward — \~${prediction.predictedDaysToCritical} days to threshold\`;

  if (prediction.predictedDaysToCritical \<= 14\) return \`Slow degradation detected — monitor closely (\~${prediction.predictedDaysToCritical} days)\`;

  return null;

}

module.exports \= { calculateRisk, predictTimeToCritical, getTrendSummary };

**Integration:**

- In `GET /api/segments/:segmentId`, add prediction to response:  
    
  const prediction \= predictTimeToCritical(segment);  
    
  const trendSummary \= getTrendSummary(segment);  
    
  return { segment: { ...segment, prediction, trendSummary } };  
    
- In the monitoring loop, log concerning predictions:  
    
  const prediction \= predictTimeToCritical(seg);  
    
  if (prediction && prediction.predictedDaysToCritical \<= 3 && prediction.predictedDaysToCritical \> 0\) {  
    
    logActivity("DETECTION", "ANOMALY",  
    
      \`${seg.segmentId} predicted critical in \~${prediction.predictedDaysToCritical} days (slope: ${prediction.slopePerReading}/reading)\`,  
    
      "warning"  
    
    );  
    
  }

**Frontend Component: `TrendBadge.jsx`**

- Shows on TelemetryPanel when prediction exists  
- Text: "Predicted critical in \~3 days"  
- Color: amber for \>3 days, red for \<=3 days  
- Small pulsing dot indicator

---

### Upgrade 5: Enhanced Risk Narration

**What:** `generateRiskExplanation()` now includes trend prediction and work order context in its Gemini prompt, producing richer explanations.

**Why:** The AI explanation box in the TelemetryPanel becomes the "wow" moment. Instead of generic text, Gemini cites actual numbers, trends, and active work orders.

**Updated function signature:**

async function generateRiskExplanation(segment, prediction \= null, workOrder \= null)

**Updated Gemini prompt includes:**

Segment: SEG-042

Current Status: critical (risk score: 70.46)

Vibration: 8.7 mm/s (critical threshold: 7.0)

Cracks: 2 unresolved

Incidents: 3 historical

Days Since Inspection: 14

Trend: Vibration rising at 0.12 mm/s per reading. Predicted critical in \~3 days.

Work Order: WO-SEG042-001 auto-dispatched with urgent priority.

Write 2-3 sentences explaining this segment's risk to a rail operator.

Cite the actual numbers. Do not include repair recommendations.

**Where to call it:**

- In `GET /api/segments/:segmentId` when the segment is warning or critical  
- Pass the prediction from `predictTimeToCritical()` and any pending work order

**Log it:**

logActivity("EXTRACTION", "RISK\_CALC",

  \`Generated risk narration for ${segment.segmentId} (risk: ${segment.riskScore})\`,

  "info"

);

---

## AI SERVICES

### Overview

Gemini is used for **exactly two things** — defect extraction and repair verification. Everything else (risk scores, status classification, anomaly thresholds, trend prediction) is **deterministic math** in `riskEngine.js`. The activity logger is plain JavaScript — no AI.

### Service 1: Gemini Extractor (`services/geminiExtractor.js`)

- **`extractDefect(reportText)`** — Parses unstructured inspection report text → structured defect JSON  
- **`generateRiskExplanation(segment, prediction, workOrder)`** — Generates 2-3 sentence risk explanation with trend \+ work order context \[UPGRADED\]  
- Uses `@google/generative-ai` SDK with `gemini-2.0-flash` model  
- Multi-strategy JSON parsing: raw parse → strip code fences → extract `{...}` block  
- Falls back to `FALLBACK_EXTRACTION` / `FALLBACK_EXPLANATION` if Gemini is unavailable  
- **Calls `logActivity()`** on start, success, and fallback \[NEW\]

**Defect extraction output:**

{

  "defectType": "type of structural or mechanical defect",

  "location": "specific location on the rail segment",

  "severity": "low | medium | high | critical",

  "description": "one-sentence summary of the issue",

  "recommendedAction": "specific repair action needed"

}

### Service 2: Gemini Verifier (`services/geminiVerifier.js`)

- **`verifyRepair(originalDefect, repairDescription)`** — Determines if a repair adequately addresses the original defect  
- Same multi-strategy JSON parsing and fallback pattern  
- Falls back to `FALLBACK_VERIFICATION` if Gemini is unavailable  
- **Calls `logActivity()`** on start, success, and fallback \[NEW\]

**Verification output:**

{

  "isVerified": true,

  "confidence": 0.92,

  "verificationReasoning": "explanation of why the repair is or isn't adequate",

  "statusRecommendation": "healthy | warning | critical"

}

### Service 3: Risk Engine (`services/riskEngine.js`)

- **`calculateRisk(segment)`** — Pure math, no AI. Returns `{ riskScore, status }`.  
- **`predictTimeToCritical(segment)`** — Linear regression on vibrationHistory. Returns `{ predictedDaysToCritical, trendDirection, slopePerReading }` or null. \[NEW\]  
- **`getTrendSummary(segment)`** — Human-readable trend string or null. \[NEW\]  
- Uses weights and thresholds from `utils/constants.js`

### Service 4: Activity Logger (`services/activityLogger.js`) \[NEW\]

- **`logActivity(agent, action, message, severity)`** — Pushes entry to global in-memory log (max 500\)  
- **`getRecentLogs(limit)`** — Returns last N log entries  
- **`clearLogs()`** — Empties the log  
- Called by: monitoring loop, geminiExtractor, geminiVerifier, work order generation, system events

---

## RISK FORMULA — MEMORIZE THIS

risk\_score \= 0.40 × V \+ 0.25 × C \+ 0.20 × I \+ 0.15 × A

| Component | Weight | Raw Input | Normalization (to 0-100) |
| :---- | :---- | :---- | :---- |
| **V** — Vibration | 0.40 | vibrationLevel (mm/s RMS) | `(vibrationLevel / 10) × 100`, cap 100 |
| **C** — Crack | 0.25 | crackCount | `count × 33.33`, cap 100 |
| **I** — Incident | 0.20 | incidentCount | `incidents × 20`, cap 100 |
| **A** — Age | 0.15 | daysSinceInspection | `days × 3.33`, cap 100 |

### Risk Levels:

- **0–30** → `healthy` (green)  
- **31–60** → `warning` (yellow/amber)  
- **61–100** → `critical` (red)

### Vibration Bounds (mm/s RMS):

- **≤ 4.0** → normal  
- **4.1–7.0** → warning  
- **≥ 7.1** → critical

---

## API CONTRACTS

Base URL: `http://localhost:3001`

### REST Endpoints

| Method | Path | Returns | Owner | Status |
| :---- | :---- | :---- | :---- | :---- |
| GET | `/api/segments` | `{ segments: [...] }` — all 100 segments with recalculated risk | Member 2 | ✅ Done |
| GET | `/api/segments/:segmentId` | `{ segment: {..., prediction, trendSummary} }` — single segment \+ trend | Member 2 | ✅ Done (upgrade pending) |
| GET | `/api/stats` | `{ total, healthy, warning, critical }` | Member 2 | ✅ Done |
| POST | `/api/reset-all` | `{ segments: [...] }` — resets all segments to healthy | Member 2 | ✅ Done |
| POST | `/api/extract-defect` | `{ defect, segment }` — extracted defect \+ updated segment | Member 2 | ⚠️ Stub (Day 2\) |
| POST | `/api/verify-repair` | `{ repair, segment }` — verification \+ updated segment | Member 2 | ⚠️ Stub (Day 2\) |
| POST | `/api/segments/:segmentId/simulate` | `{ segment }` — simulated state change | Member 2 | ❌ Not yet (Day 2\) |
| POST | `/api/monitoring/start` | `{ status: "started" }` | Member 2 | 🆕 New |
| POST | `/api/monitoring/stop` | `{ status: "stopped" }` | Member 2 | 🆕 New |
| GET | `/api/monitoring/status` | `{ active: bool, cycleCount: int }` | Member 2 | 🆕 New |
| GET | `/api/activity-log?limit=50` | Array of activity log entries | Member 3 | 🆕 New |
| POST | `/api/activity-log/clear` | `{ status: "cleared" }` | Member 3 | 🆕 New |
| GET | `/api/work-orders` | `{ workOrders: [...] }` | Member 2 | 🆕 New |
| GET | `/api/work-orders?status=pending` | Filtered work orders | Member 2 | 🆕 New |

### Response Shapes

**Segment object (from `data/segments.js`):**

{

  "segmentId": "SEG-001",

  "status": "healthy | warning | critical",

  "riskScore": 8.0,

  "vibrationLevel": 2.35,

  "crackCount": 0,

  "incidentCount": 0,

  "daysSinceInspection": 5,

  "lastUpdated": "2026-06-10T01:00:00.000Z",

  "activeDefects": \[\],

  "vibrationHistory": \[

    {

      "timestamp": "2026-06-10T00:40:00.000Z",

      "vibrationLevel": 2.18,

      "temperature": 37.42,

      "crackDetected": false

    }

  \],

  "prediction": {

    "predictedDaysToCritical": 3,

    "trendDirection": "rising",

    "slopePerReading": 0.12

  },

  "trendSummary": "Predicted critical in \~3 days — urgent monitoring"

}

**Stats object:**

{

  "total": 100,

  "healthy": 98,

  "warning": 1,

  "critical": 1

}

**Activity Log Entry:**

{

  "id": 1,

  "timestamp": "2026-06-10T10:30:01.000Z",

  "agent": "DETECTION",

  "action": "ANOMALY",

  "message": "SEG-042 → critical (risk: 70.46)",

  "severity": "critical"

}

**Work Order:**

{

  "workOrderId": "WO-SEG042-001",

  "segmentId": "SEG-042",

  "riskScore": 72.5,

  "priority": "urgent | high",

  "reason": "Risk score 72.5 exceeded critical threshold (60)",

  "recommendedAction": "Immediate physical inspection and sensor recalibration required",

  "status": "pending | completed",

  "createdAt": "2026-06-10T10:30:02.000Z",

  "completedAt": null

}

### Vite Dev Proxy

The frontend Vite dev server (port 5173\) proxies all `/api` requests to the backend (port 3001\) via `vite.config.js`. In production, the frontend calls the backend URL directly via `VITE_API_URL`.

---

## DATA MODEL (in-memory)

File: `backend/data/segments.js`

100 TrackSegment objects are generated on server startup. Each segment is pre-populated with 20 vibration history data points. All routes read from and write to this in-memory array.

// Each segment object has this shape:

{

  segmentId: "SEG-001",        // "SEG-001" through "SEG-100"

  status: "healthy",           // "healthy" | "warning" | "critical"

  riskScore: 0.0,              // 0-100, recalculated by riskEngine on every GET

  vibrationLevel: 2.35,        // mm/s RMS

  crackCount: 0,               // integer

  incidentCount: 0,            // integer

  daysSinceInspection: 5,      // integer

  lastUpdated: "ISO string",

  activeDefects: \[\],            // array of defect objects

  vibrationHistory: \[           // 20 most recent readings

    {

      timestamp: "ISO string",

      vibrationLevel: 2.18,

      temperature: 37.42,

      crackDetected: false

    }

  \]

}

### Additional In-Memory Arrays \[NEW\]:

// In server.js — global arrays

const workOrders \= \[\];     // Auto-generated work orders

// activityLog is managed by services/activityLogger.js

### Constants (`utils/constants.js`):

| Constant | Value | Purpose |
| :---- | :---- | :---- |
| `TOTAL_SEGMENTS` | 100 | Total track segments |
| `WEIGHT_VIBRATION` | 0.40 | Risk formula weight |
| `WEIGHT_CRACK` | 0.25 | Risk formula weight |
| `WEIGHT_INCIDENT` | 0.20 | Risk formula weight |
| `WEIGHT_AGE` | 0.15 | Risk formula weight |
| `THRESHOLD_HEALTHY_MAX` | 30.00 | Healthy ≤ 30 |
| `THRESHOLD_WARNING_MAX` | 60.00 | Warning ≤ 60, Critical \> 60 |
| `VIBRATION_NORMAL_MAX` | 4.0 | Normal vibration ceiling |
| `VIBRATION_WARNING_MAX` | 7.0 | Warning vibration ceiling |
| `VIBRATION_CRITICAL_MIN` | 7.1 | Critical vibration floor |
| `MAX_VIBRATION_HISTORY` | 20 | History buffer size |
| `POLLING_INTERVAL_MS` | 5000 | Frontend polling interval |
| `DEFAULT_SPIKE_VALUE` | 9.5 | Simulator spike vibration |
| `DEFAULT_HEALTHY_VIBRATION` | 2.0 | Simulator reset vibration |
| `GEMINI_MODEL` | `"gemini-2.0-flash"` | Gemini model identifier |
| `MONITORING_INTERVAL_MS` | 10000 | Autonomous loop interval \[NEW\] |
| `MAX_LOG_ENTRIES` | 500 | Activity log buffer size \[NEW\] |

---

## FRONTEND COMPONENTS

### Design System:

- **Dark theme** — dark navy/charcoal background (`#0a0f1a` or similar)  
- **Glassmorphic cards** — `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`  
- **Color coding:** Green \= healthy, Amber/Yellow \= warning, Red \= critical  
- **Font:** Inter (loaded from Google Fonts)  
- **Animations:** Framer Motion for cell status transitions; CSS `pulse-warning` / `pulse-critical` keyframes

### Components Built (Day 1):

**MetricCards.jsx** — 4 glassmorphic stat cards showing total segments, healthy count, warning count, critical count. Accepts `stats` prop from `useStats` hook.

**CellGrid.jsx** — The hero component. 10×10 grid of cells. Falls back to mock data if no `segments` prop. Each cell renders a `CellItem`.

**CellItem.jsx** — Individual color-coded cell showing segment ID. Pulse animation for warning/critical states. Click handler for segment selection.

**SimulatorPanel.jsx** — Control panel with spike, crack, and reset buttons for individual segments.

### Components To Build (Day 2-3):

- `TelemetryPanel.jsx` — Detailed segment view with risk gauge, chart, AI explanation, trend badge  
- `RiskGauge.jsx` — Visual risk score indicator  
- `VibrationChart.jsx` — Recharts line chart for vibration history  
- `ExtractionForm.jsx` — Submit inspection reports for Gemini extraction  
- `VerificationForm.jsx` — Submit repairs for Gemini verification  
- `AiExplanation.jsx` — Display Gemini-generated risk explanations (typewriter effect)  
- `DefectList.jsx` — List of active defects for a segment  
- `AlertBanner.jsx` — System-wide alert display  
- **`AgentActivityLog.jsx`** — Terminal-style scrolling agent log (polls every 3s) \[NEW\]  
- **`WorkOrderPanel.jsx`** — List of auto-generated work orders \[NEW\]  
- **`TrendBadge.jsx`** — "Critical in \~3 days" indicator on TelemetryPanel \[NEW\]  
- **`MonitoringToggle.jsx`** — Start/Stop monitoring button in StatusBar or SimulatorPanel \[NEW\]

### Hooks:

**useSegments.js** — Polls `GET /api/segments` every 5s. Returns `{ segments, loading, error, refetch }`.

**useStats.js** — Polls `GET /api/stats` every 5s. Returns `{ stats, loading, error }`.

**useSelectedSegment.js** — Fetches single segment detail via `GET /api/segments/:segmentId`. Returns `{ selectedSegment, selectSegment, clearSelection, loading, error }`.

**useActivityLog.js** — Polls `GET /api/activity-log?limit=100` every 3s. Returns `{ logs, loading }`. \[NEW\]

**useWorkOrders.js** — Polls `GET /api/work-orders` every 5s. Returns `{ workOrders, loading }`. \[NEW\]

### API Helper (`services/api.js`) — EXPANDED:

const API\_BASE \= import.meta.env.VITE\_API\_URL || "http://localhost:3001";

const client \= axios.create({ baseURL: API\_BASE });

// Existing

export const getSegments \= () \=\> client.get("/api/segments").then(r \=\> r.data);

export const getSegment \= (id) \=\> client.get(\`/api/segments/${id}\`).then(r \=\> r.data);

export const getStats \= () \=\> client.get("/api/stats").then(r \=\> r.data);

export const simulateAction \= (id, action, value) \=\>

  client.post(\`/api/segments/${id}/simulate\`, { action, value }).then(r \=\> r.data);

export const extractDefect \= (segmentId, reportText) \=\>

  client.post("/api/extract-defect", { segmentId, reportText }).then(r \=\> r.data);

export const verifyRepair \= (segmentId, defectId, repairDescription) \=\>

  client.post("/api/verify-repair", { segmentId, defectId, repairDescription }).then(r \=\> r.data);

export const resetAll \= () \=\> client.post("/api/reset-all").then(r \=\> r.data);

// NEW — Monitoring

export const startMonitoring \= () \=\> client.post("/api/monitoring/start").then(r \=\> r.data);

export const stopMonitoring \= () \=\> client.post("/api/monitoring/stop").then(r \=\> r.data);

export const getMonitoringStatus \= () \=\> client.get("/api/monitoring/status").then(r \=\> r.data);

// NEW — Activity Log

export const getActivityLog \= (limit \= 100\) \=\> client.get(\`/api/activity-log?limit=${limit}\`).then(r \=\> r.data);

export const clearActivityLog \= () \=\> client.post("/api/activity-log/clear").then(r \=\> r.data);

// NEW — Work Orders

export const getWorkOrders \= (status) \=\> {

  const params \= status ? \`?status=${status}\` : "";

  return client.get(\`/api/work-orders${params}\`).then(r \=\> r.data);

};

---

## ENVIRONMENT VARIABLES

**Backend** — create `backend/.env` (never commit):

GEMINI\_API\_KEY=your\_gemini\_api\_key\_here

PORT=3001

Get your free Gemini API key from: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Frontend** — `frontend/.env`:

VITE\_API\_URL=http://localhost:3001

---

## GIT WORKFLOW

1. Each person works on their own branch.  
2. Commit often with clear messages: `feat: add monitoring loop`, `feat: add activity logger`  
3. Push to your branch: `git push origin <your-branch>`  
4. Coordinate merges into `main`.  
5. **Never force push. Never push to main without coordinating.**

---

## WHAT'S ALREADY DONE (Day 1 — All Members)

### Member 2 (Backend):

- [x] `backend/server.js` — Express entry point, port 3001, CORS, 3 route mounts  
- [x] `backend/data/segments.js` — 100 TrackSegment objects with 20 vibration history points each  
- [x] `backend/services/riskEngine.js` — deterministic risk formula, verified against constants  
- [x] `backend/routes/segmentRoutes.js` — `GET /api/segments`, `GET /api/segments/:segmentId`  
- [x] `backend/routes/statsRoutes.js` — `GET /api/stats`, `POST /api/reset-all`  
- [x] `backend/routes/aiRoutes.js` — stub endpoints (prevent boot crash)  
- [x] `backend/middleware/errorHandler.js` — global error handler

### Member 3 (AI Engineer):

- [x] `backend/services/geminiExtractor.js` — `extractDefect()` \+ `generateRiskExplanation()` with JSON parsing safety  
- [x] `backend/services/geminiVerifier.js` — `verifyRepair()` with validation and fallbacks  
- [x] `backend/utils/constants.js` — 21 constants matching the risk formula  
- [x] `backend/utils/fallbacks.js` — `FALLBACK_EXTRACTION`, `FALLBACK_VERIFICATION`, `FALLBACK_EXPLANATION`  
- [x] `backend/utils/idGenerator.js` — `DEF-YYYYMMDD-NNN` \+ `RPR-YYYYMMDD-NNN` format generators  
- [x] `backend/.env.example` — `GEMINI_API_KEY` \+ `PORT=3001`  
- [x] Day 2 hardening: 3-strategy JSON parser, input guards, tighter prompts

### Member 1 (Frontend):

- [x] Vite \+ React scaffold with Tailwind, Framer Motion, Recharts, Axios  
- [x] `MetricCards.jsx` — 4 glassmorphic stat cards  
- [x] `CellGrid.jsx` \+ `CellItem.jsx` — 10×10 grid with color-coded cells and pulse animations  
- [x] `App.jsx` — header \+ MetricCards \+ CellGrid \+ sidebar layout  
- [x] `index.css` — Tailwind directives \+ pulse-warning/pulse-critical keyframes  
- [x] Dark glassmorphic theme

### Member 4 (Integrator):

- [x] `frontend/src/services/api.js` — Axios instance \+ 7 API wrapper functions  
- [x] `frontend/src/hooks/useSegments.js` — polls segments every 5s  
- [x] `frontend/src/hooks/useStats.js` — polls stats every 5s  
- [x] `frontend/src/hooks/useSelectedSegment.js` — single segment detail  
- [x] `frontend/src/utils/constants.js` — shared frontend constants  
- [x] `frontend/src/utils/statusColors.js` — status-to-color mapping  
- [x] `frontend/.env` — `VITE_API_URL=http://localhost:3001`

### Member 5 (Simulator):

- [x] `SimulatorPanel.jsx` — spike, crack, reset controls for individual segments  
- [x] Vibration history pre-population — 20 data points × 100 segments in `data/segments.js`

---

## WHAT EACH PERSON BUILDS NEXT (Day 2-3)

### Member 2 (Backend) — Priority Order:

- [ ] Add autonomous monitoring loop to `server.js` (Upgrade 1\) — **DO FIRST**  
- [ ] Add work order auto-generation in monitoring loop (Upgrade 3\)  
- [ ] Create `routes/monitoringRoutes.js` — start/stop/status endpoints  
- [ ] Create `routes/workOrderRoutes.js` — GET /api/work-orders  
- [ ] Add `POST /api/segments/:segmentId/simulate` route (spike, crack, reset actions)  
- [ ] Wire `POST /api/extract-defect` to `geminiExtractor.extractDefect()`  
- [ ] Wire `POST /api/verify-repair` to `geminiVerifier.verifyRepair()`  
- [ ] On verified repair: find pending work order → mark completed

### Member 3 (AI Engineer) — Priority Order:

- [ ] Create `services/activityLogger.js` (Upgrade 2\) — **DO FIRST**  
- [ ] Add `logActivity()` calls to `geminiExtractor.js` (start, success, fallback)  
- [ ] Add `logActivity()` calls to `geminiVerifier.js` (start, success, fallback)  
- [ ] Add `predictTimeToCritical()` \+ `getTrendSummary()` to `riskEngine.js` (Upgrade 4\)  
- [ ] Upgrade `generateRiskExplanation()` to accept prediction \+ workOrder context (Upgrade 5\)  
- [ ] Add activity-log route: `GET /api/activity-log`, `POST /api/activity-log/clear`  
- [ ] Test all Gemini calls with real API key in `.env`

### Member 1 (Frontend) — Day 2-3:

- [ ] `AgentActivityLog.jsx` — terminal-style scrolling log (**HIGHEST PRIORITY** — the showpiece)  
- [ ] `TelemetryPanel.jsx` \+ `RiskGauge.jsx` — detailed segment view  
- [ ] `VibrationChart.jsx` — Recharts line chart for vibration history  
- [ ] `TrendBadge.jsx` — "Critical in \~3 days" warning on TelemetryPanel  
- [ ] `WorkOrderPanel.jsx` — list of auto-dispatched work orders  
- [ ] `ExtractionForm.jsx` \+ `VerificationForm.jsx` — Gemini AI forms  
- [ ] `AiExplanation.jsx` — typewriter effect text  
- [ ] `DefectList.jsx`, `AlertBanner.jsx`  
- [ ] `MonitoringToggle.jsx` — Start/Stop button in SimulatorPanel

### Member 4 (Integrator) — Day 2-3:

- [ ] Expand `api.js` with new endpoints (monitoring, activity-log, work-orders)  
- [ ] Create `useActivityLog.js` hook (polls every 3s)  
- [ ] Create `useWorkOrders.js` hook (polls every 5s)  
- [ ] Wire MetricCards to `useStats` hook (live data)  
- [ ] Wire CellGrid to `useSegments` hook (live data)  
- [ ] Wire TelemetryPanel to `useSelectedSegment` hook  
- [ ] Wire ExtractionForm \+ VerificationForm to API service  
- [ ] Wire AgentActivityLog to `useActivityLog` hook  
- [ ] Wire WorkOrderPanel to `useWorkOrders` hook

### Member 5 (Simulator) — Day 2-3:

- [ ] Add MonitoringToggle (Start/Stop) to SimulatorPanel  
- [ ] Build demo scenario route `POST /api/demo/scenario`  
- [ ] Add vibration spike history generation  
- [ ] Write demo cheat sheet \+ time the full demo

---

### Day 1 Execution Notes

**Audit Date:** 2026-06-10 01:36 IST | **Audited by:** Member 2 \+ Member 4

All 5 members' Day 1 tasks are **100% complete**. Backend boots cleanly (`npm start` → port 3001), frontend boots cleanly (`npm run dev` → port 5173), Vite proxy forwards `/api` to backend.

#### ⚠️ Remaining Issues (Carried to Day 2\)

| Issue | Impact | Owner |
| :---- | :---- | :---- |
| `backend/.env` file missing (only `.env.example` exists) | Gemini API calls silently use fallback responses instead of real LLM | Member 3 |
| `POST /api/segments/:segmentId/simulate` not implemented | SimulatorPanel buttons return 404 | Member 2 |

---

## CODING CONVENTIONS

- **JavaScript:** camelCase for variables/functions, PascalCase for components/classes. JSDoc comments on all service functions.  
- **No `any` type.** Use consistent object shapes as documented above.  
- **All numbers must be rounded.** `toFixed(2)` for risk scores, `toFixed(2)` for sensor readings.  
- **Error handling everywhere.** Every route and service function should handle errors gracefully. Use the global `errorHandler` middleware as the safety net.  
- **Comments:** Write them. Future you will thank present you.  
- **Use `logActivity()`** instead of `console.log()` for all agent-related output. \[NEW\]

---

## DEMO SCRIPT (UPDATED with upgrades)

**Phase 1 (0:00-0:20):** App opens. 100-segment grid all green. Agent Activity Log shows "Autonomous monitoring activated" and cycle scans running. Metric cards show 100 healthy. The system is working autonomously — nobody clicked anything.

**Phase 2 (0:20-0:50):** Watch the monitoring loop gradually degrade a segment. Agent Activity Log shows: "DETECTION: SEG-042 → warning (risk: 35.2)". Cell turns amber. Then use SimulatorPanel to spike vibration AND add a crack — **a vibration spike alone maxes out at \~40.5 (warning), you MUST also add cracks or incidents to push past 60 into critical.** Activity Log shows: "DETECTION: SEG-042 → critical (risk: 72.5)". Cell turns red. "DISPATCH: Auto-generated WO-SEG042-001 (priority: urgent)".

**Phase 3 (0:50-1:20):** Click SEG-042 → TelemetryPanel slides out. Show risk gauge at 72.5. VibrationChart shows spike. TrendBadge says "Predicted critical in \~3 days." AiExplanation box types out Gemini's risk narration citing actual numbers. WorkOrderPanel shows the auto-dispatched order.

**Phase 4 (1:20-1:40):** Paste inspection report → EXTRACTION agent log: "Processing..." → "Defect found: Rail joint crack, severity HIGH". Paste repair → VERIFICATION agent log: "Repair verified, confidence: 0.92". Activity Log shows: "DISPATCH: Work order completed." Cell turns green.

**Phase 5 (1:40-2:00):** Zoom out — show Agent Activity Log scrolling with autonomous monitoring. Multiple agents working. Emphasize: "Zero human intervention. The agents detected, predicted, dispatched, and verified autonomously. The activity log proves every decision."

---

## CRITICAL REMINDERS

1. **This is an AGENTIC project.** The autonomous monitoring loop runs on its own. The agent activity log proves it. This is the hackathon theme.  
2. **Real math, not LLM calls for detection.** Risk scores and trend predictions use deterministic formulas, not "ask Gemini if this looks bad."  
3. **Gemini is only used for:** extracting defects from text reports, generating risk explanations, and verifying repairs. Everything else is deterministic math.  
4. **The Agent Activity Log is the showpiece.** It proves agents are thinking and acting. Make it prominent, readable, and always visible.  
5. **Fallbacks are mandatory.** If `GEMINI_API_KEY` is missing, all Gemini calls return safe fallback responses — the app never crashes.  
6. **In-memory data store.** Data lives in `segments.js`. Restarting the server resets all data. This is intentional for the demo.  
7. **Test locally before pushing.** Run `npm start` in `backend/` and `npm run dev` in `frontend/`. Confirm no crashes.  
8. **The monitoring loop auto-starts.** When `server.js` boots, monitoring begins immediately. No button click needed.  
9. **Work orders auto-generate.** When a segment hits critical, a work order appears automatically. When a repair is verified, it's marked completed.  
10. **Ask the team if confused.** Don't guess. Don't go rogue. We have limited time.  
11. **Demo math gotcha:** A max vibration spike (9.5 mm/s) on a clean segment only scores \~40.5 (warning). To reach critical (\>60), the segment ALSO needs cracks or incidents. The simulate route must support spike \+ crack in sequence. The autonomous monitoring loop handles this naturally over time, but for a quick manual demo, always spike THEN add cracks.

