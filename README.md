# RailGuard — Autonomous Railway Safety Inspector

RailGuard is an autonomous railway safety monitoring and maintenance orchestration platform built for the **FAR AWAY 2026 Hackathon** under the **"Agentic & Autonomous Systems"** theme. 

The system leverages a hybrid approach: **deterministic physical modeling** for real-time risk calculation and anomaly detection, combined with **Google Gemini 2.0 Flash** for qualitative cognitive tasks (unstructured inspection report extraction and maintenance verification). Operating continuously and without human intervention, RailGuard scans track corridors, predicts degradation curves, dispatches work orders, and verifies repairs.

---

## 1. System Architecture & Flow

The entire RailGuard ecosystem is designed as a closed-loop autonomous inspector. The system flow coordinates telemetric scanning, anomaly detection, work order generation, inspection reporting, and AI-driven repair verification.

```mermaid
sequenceDiagram
    autonumber
    participant Sensor as Segment Sensors (Telemetry)
    participant Monitor as Autonomous Monitor Loop
    participant Risk as Deterministic Risk Engine
    participant DB as In-Memory State
    participant Dispatch as Auto-Dispatch Agent
    participant OP as Operator Console (UI)
    participant Gemini as Gemini AI Service
    
    loop Every 10 Seconds
        Sensor->>Monitor: Capture vibration, temperature, cracks
        Monitor->>Risk: Calculate risk score & trend prediction
        Risk-->>Monitor: Risk Score, Status (healthy/warning/critical)
        Monitor->>DB: Update Segment State & push telemetry history
        Monitor->>OP: Emit activity trace to Agent Activity Ledger
    end

    alt Transition to Critical Status
        Monitor->>Dispatch: Trigger Work Order Generation
        Dispatch->>DB: Write new "Pending" Work Order
        Dispatch->>OP: Push high-priority alert to Attention Queue
    end

    Note over OP, Gemini: Manual Defect Logging & AI Extraction
    OP->>Gemini: Paste unstructured inspection report text
    Gemini->>Gemini: Parse, validate & clean JSON response
    Gemini-->>OP: Returns structured defect (type, severity, location)
    OP->>DB: Add active defect to segment; recalculate risk

    Note over OP, Gemini: Crew Repairs & Verification
    OP->>Gemini: Submit repair description log + original defect
    Gemini->>Gemini: Verify repair adequacy & status recommendation
    Gemini-->>OP: Repair report (isVerified, confidence, reasoning)
    
    alt Repair Verified
        OP->>DB: Clear active defect, decrement crack, reset vibration to 2.0 mm/s
        OP->>DB: Mark associated Work Order as "Completed"
        OP->>OP: Segment returns to healthy green status on grid
    end
```

---

## 2. Technology Stack & Directory Structure

The platform is split into a lightweight Node.js/Express backend and a high-performance React dashboard, engineered to run locally with zero-overhead installation.

### Technology Stack
*   **Backend Runtime:** Node.js, Express (port `3001`), CORS, `dotenv`
*   **Cognitive Services:** Google Gemini 2.0 Flash SDK (`@google/generative-ai`)
*   **Persistent Auth Layer:** MongoDB + Mongoose, JWT authentication, `bcryptjs`
*   **Frontend Interface:** React 18, Vite 5, Tailwind CSS 3, Framer Motion 11
*   **Data Visualization:** Recharts 2 (telemetry trends)
*   **Deployment Platforms:** Vercel (Frontend), Railway (Backend)

### Directory Structure
```
mavericks/
├── CONTEXT.md                  # Comprehensive project specification (source of truth)
├── DESIGN.md                   # Operations console visual system design specification
├── PRODUCT.md                  # Product register, user personas, and design principles
├── README.md                   # This detailed project report & documentation
├── DEMO_CHEAT_SHEET.md         # Live presentation script and simulator presets
│
├── backend/
│   ├── .env.example            # Backend environment template (API keys, PORT)
│   ├── server.js               # Express entry point & autonomous scanning loop
│   ├── config/
│   │   └── db.js               # Mongoose connection & connection health checks
│   ├── data/
│   │   └── segments.js         # 100 TrackSegment telemetry objects (in-memory)
│   ├── middleware/
│   │   ├── auth.js             # JWT verification & role-based route protection
│   │   └── errorHandler.js     # Express global error handler
│   ├── models/
│   │   └── User.js             # MongoDB Schema for operators (bcrypt hashes)
│   ├── routes/
│   │   ├── activityLogRoutes.js # GET /api/activity-log, POST /api/activity-log/clear
│   │   ├── aiRoutes.js         # POST /api/extract-defect, POST /api/verify-repair
│   │   ├── authRoutes.js       # POST /api/auth/login, GET /api/auth/me
│   │   ├── demoRoutes.js       # POST /api/demo/scenario (presets degradation)
│   │   ├── monitoringRoutes.js # Control endpoints for autonomous loop
│   │   ├── segmentRoutes.js    # GET /api/segments (with JIT slicing), POST /api/segments/:id/simulate
│   │   ├── statsRoutes.js      # GET /api/stats, POST /api/reset-all
│   │   └── workOrderRoutes.js  # GET /api/work-orders
│   ├── services/
│   │   ├── activityLogger.js   # Central in-memory log buffer for autonomous actions
│   │   ├── geminiExtractor.js  # AI defect extraction & risk narration
│   │   ├── geminiVerifier.js   # AI maintenance report verification
│   │   ├── riskEngine.js       # Deterministic math, regression slope & trend summaries
│   │   └── routeProcessor.js   # JIT raw-coordinate parsing & corridor slicing (1-km segments)
│   └── utils/
│       ├── constants.js        # Global weights, thresholds, model config
│       ├── fallbacks.js        # Mock data templates for offline/keyless resiliency
│       └── idGenerator.js      # Monotonically increasing defect and repair IDs
│
└── frontend/                   # React dashboard
    ├── vite.config.js          # Port 5173 configuration with custom /api proxy
    ├── src/
    │   ├── App.jsx             # Grid layout, metric cards, active panels, state coordination
    │   ├── main.jsx            # React hydration & Router setup
    │   ├── index.css           # Tailwind configuration + alert pulsing keyframes
    │   ├── components/         # High-density cockpit dashboard views
    │   │   ├── ActivityLedger.jsx   # Monospaced logs with color keying
    │   │   ├── AiExplanation.jsx    # Typeset Gemini narrative reasoning
    │   │   ├── AttentionQueue.jsx   # Expanded priority/incident lists
    │   │   ├── CellGrid.jsx         # 10x10 track segment grid
    │   │   ├── CellItem.jsx         # Individual segment indicator
    │   │   ├── DrillPanel.jsx       # Synthetic simulator control panel
    │   │   ├── ExtractionForm.jsx   # Inspector report submission interface
    │   │   ├── FocusPanel.jsx       # Tabular stats & segment drill-down shell
    │   │   ├── LoginPage.jsx        # Operator login screen (admin/worker accounts)
    │   │   ├── ProtectedRoute.jsx   # JWT validation redirect wrapper
    │   │   ├── RouteFilter.jsx      # Spatial station dropdown filter
    │   │   ├── TrackStrip.jsx       # Linear schematic showing path status
    │   │   ├── TrendBadge.jsx       # Monospaced warning forecasts
    │   │   ├── VerificationForm.jsx # Maintenance verification submit form
    │   │   ├── VibrationChart.jsx   # Recharts line graph of history
    │   │   └── WorkOrderPipeline.jsx# Work order status tracking columns
    │   ├── hooks/               # Custom Axios polling custom hooks (5s intervals)
    │   └── services/
    │       └── api.js          # Axios API client wrapper
```

---

## 3. Data Models & State Contracts

The system maintains state in two distinct layers:
1.  **Persistent Storage (MongoDB):** Limits database access exclusively to authentication and operator profiles. If MongoDB is unavailable, the backend boots cleanly with console logs warning that auth is disabled, preserving the demo's reliability.
2.  **In-Memory Store (`data/segments.js`):** Tracks realtime telemetry for 100 segments. Resets to healthy baselines on restart.

### User Schema (MongoDB)
*   `name`: Plaintext operator name.
*   `email`: Trimmed, lowercase unique string.
*   `password`: Hashed with `bcryptjs` (10 rounds).
*   `role`: `"admin"` (access to simulator, full corridor) or `"worker"` (view-only or scoped to `assignedSegments`).
*   `assignedSegments`: Array of strings (`["SEG-001", "SEG-002"]`) defining assigned responsibility.

### Telemetry Segment Shape (In-Memory)
```json
{
  "segmentId": "SEG-042",
  "status": "critical",
  "riskScore": 68.45,
  "vibrationLevel": 8.52,
  "crackCount": 2,
  "incidentCount": 1,
  "daysSinceInspection": 12,
  "lastUpdated": "2026-06-11T11:42:00.000Z",
  "activeDefects": [
    {
      "defectId": "DEF-20260611-001",
      "defectType": "Surface Shelling",
      "location": "Joint at 42.1km",
      "severity": "critical",
      "description": "Deep shelling detected along gauge corner.",
      "reportedAt": "2026-06-11T11:40:00.000Z"
    }
  ],
  "vibrationHistory": [
    {
      "timestamp": "2026-06-11T11:39:00.000Z",
      "vibrationLevel": 8.01,
      "temperature": 37.4,
      "crackDetected": true
    }
  ],
  "startCoord": { "lat": 34.0522, "lon": -118.2437 },
  "endCoord": { "lat": 34.0612, "lon": -118.2325 },
  "distanceKm": 1.0,
  "radiusOfCurvature": 450.23
}
```

### Work Order Structure
Generated automatically when a segment transitions from warning/healthy into critical status (`riskScore > 60.00`):
```json
{
  "workOrderId": "WO-SEG-042-001",
  "segmentId": "SEG-042",
  "riskScore": 68.45,
  "priority": "urgent",
  "reason": "Risk score 68.45 exceeded critical threshold (60)",
  "recommendedAction": "Immediate physical inspection and sensor recalibration required",
  "status": "pending",
  "createdAt": "2026-06-11T11:40:05.000Z",
  "completedAt": null
}
```

### Activity Log Structure
The backend maintains an append-only log of size `500` to trace autonomous events:
```json
{
  "id": 142,
  "timestamp": "2026-06-11T11:40:05.000Z",
  "agent": "DISPATCH",
  "action": "WORK_ORDER",
  "message": "Auto-generated WO-SEG-042-001 for SEG-042 (priority: urgent)",
  "severity": "critical"
}
```

---

## 4. Deterministic Engines & Technical Mathematics

Safety-critical software relies on predictable math. RailGuard uses deterministic models for risk mapping, curve calculation, and trend projection.

### A. The Multi-Factor Risk Formula
The segment risk score is JIT-computed on demand based on five normalize inputs:

$$\text{Risk Score} = 0.35 \cdot V + 0.25 \cdot C + 0.15 \cdot I + 0.10 \cdot A + 0.15 \cdot K$$

Where:
*   **$V$ (Vibration Component):** Normalizes vibration level (mm/s RMS).  
    $$V = \min\left(\frac{\text{vibrationLevel}}{10.0} \cdot 100, \, 100\right)$$
*   **$C$ (Crack Component):** Evaluates structural cracking.  
    $$C = \min(\text{crackCount} \cdot 33.33, \, 100)$$
*   **$I$ (Incident Component):** Accounts for historical failures.  
    $$I = \min(\text{incidentCount} \cdot 20.0, \, 100)$$
*   **$A$ (Inspection Age Component):** Captures time since last manual inspection.  
    $$A = \min(\text{daysSinceInspection} \cdot 3.33, \, 100)$$
*   **$K$ (Curvature Component):** Adds structural risk based on sharp curves. Computed from the radius of curvature $R$ (in meters):
    $$K = \begin{cases} 
      0 & \text{if } R \ge 10000 \text{ or } R \le 0 \\
      \min\left(\frac{300}{R} \cdot 100, \, 100\right) & \text{if } 0 < R < 10000 
   \end{cases}$$
   *Grounded in Federal Railroad Administration (FRA) research: sharp curves experience 2-3x higher derailment risk.*

#### Threshold Status Classifications:
*   **$0.00 \le \text{Risk Score} \le 30.00$** $\rightarrow$ `healthy` (dim green on UI)
*   **$30.01 \le \text{Risk Score} \le 60.00$** $\rightarrow$ `warning` (solid amber on UI)
*   **$60.01 \le \text{Risk Score} \le 100.00$** $\rightarrow$ `critical` (blinking red on UI)

### B. Just-In-Time Curvature Analysis
When a route is queried (`GET /api/segments`), the `routeProcessor.js` engine reads the cached raw spatial coordinates (`raw-tracks-db.json`), applies a moving average smoothing window ($\pm2$ buckets / $\sim500$ meters) to filter out telemetry noise, slices the path into $1\text{ km}$ segments, and JIT-computes the radius of curvature $R$ using the **circumcircle formula** of three points (start, middle, and end of the segment):

$$R = \frac{a \cdot b \cdot c}{2 \cdot \text{Area}_{2}} \cdot 1000$$

Where:
*   $a, b, c$ are the Euclidean distances between the planar equirectangular-projected coordinates.
*   $\text{Area}_{2} = \left|(b_x - a_x)(c_y - a_y) - (c_x - a_x)(b_y - a_y)\right|$ represents twice the area of the triangle formed by the points. If $\text{Area}_{2} < 10^{-9}$, the segment is straight and $R = 0$.

### C. Predictive Linear Regression Engine
Vibration trend lines are predicted using **ordinary least squares (OLS) linear regression** on the `vibrationHistory` array (requiring a minimum of 5 data points):

$$\text{Slope} \, (\beta) = \frac{\sum_{i=1}^{n} (i - \bar{x})(y_i - \bar{y})}{\sum_{i=1}^{n} (i - \bar{x})^2}$$

*   If $\text{Slope} \le 0$, the segment is stable/improving (no prediction).
*   If the current vibration $y_n \ge 7.0$ mm/s, it is flagged as immediately critical.
*   Otherwise, it estimates the remaining readings until it crosses the critical threshold ($7.0$):
    $$\text{Readings to Threshold} = \frac{7.0 - y_n}{\beta}$$
    $$\text{Days to Critical} = \left\lceil \frac{\text{Readings to Threshold}}{\text{Readings Per Day (6)}} \right\rceil$$
*   If estimated days $> 30$, the alert is suppressed as statistically insignificant.

---

## 5. Agentic & Cognitive Layer (Gemini AI Services)

Google Gemini 2.0 Flash is integrated for cognitive, high-context safety evaluations.

```
       ┌────────────────────────┐
       │   Crew Written text    │
       └───────────┬────────────┘
                   │  1. Submit HTTP Request
                   ▼
 ┌───────────────────────────────────┐
 │       geminiExtractor.js          │
 ├───────────────────────────────────┤
 │  • Prompt: Context & constraints  │
 │  • JSON Schema enforced           │
 │  • Enforce 10s HTTP timeout       │
 └─────────────────┬─────────────────┘
                   │  2. Run API Call
                   ▼
        [ Google Gemini API ]
                   │  3. Raw Text Response
                   ▼
 ┌───────────────────────────────────┐
 │      JSON Extraction Parser       │
 ├───────────────────────────────────┤
 │  • Strategy A: Direct JSON parse  │
 │  • Strategy B: Strip code fences  │
 │  • Strategy C: Find largest {...} │
 └─────────────────┬─────────────────┘
                   │  4. Resulting Object
                   ▼
         ( Validated JSON? )
            ├── YES ──► Return to Route
            └── NO  ──► Load offline fallbacks
```

### A. Defect Extraction (`POST /api/extract-defect`)
Parses free-text field inspection reports submitted by track workers into structural databases.

*   **Prompt Architecture:** Instructs the model to output a strict JSON structure containing `defectType`, `location`, `severity` (restricted to low/medium/high/critical), `description`, and `recommendedAction`.
*   **JSON Enforcement:** Configures the SDK with `responseMimeType: "application/json"`.

### B. Repair Verification (`POST /api/verify-repair`)
Analyzes repair descriptions written by maintenance crews to verify if they adequately resolve the original defect.

*   **Prompt Architecture:** Inputs both the original defect JSON and the raw text repair report. Instructs Gemini to evaluate if the repair satisfies the defect requirements.
*   **Verification Object:** Returns:
    ```json
    {
      "isVerified": true,
      "confidence": 0.95,
      "verificationReasoning": "The crew replaced the broken tie plates on segment 42 as recommended, resolving the structural threat.",
      "statusRecommendation": "healthy"
    }
    ```

### C. Risk Narration (`generateRiskExplanation`)
Crafts a concise 2-to-3 sentence plain-English summary explaining why a segment has elevated risk, citing numbers, trends, and work orders. This narration is typed out dynamically in the frontend Focus Panel.

### D. Cognitive Fault Tolerance & Resiliency
1.  **Multi-Strategy Parser:** If Gemini wraps JSON in markdown fences (` ```json `) or prefaces it with conversational text, the parser executes three sequential decoding strategies:
    *   *Direct Parse:* Decodes the entire string.
    *   *Fence Stripping:* Cleans leading/trailing backticks and quotes.
    *   *Regex Block Selector:* Selects the outermost braces `{ ... }` to bypass conversational text.
2.  **Hard Timeout Limits:** API calls are wrapped in a `Promise.race` racing against a $10$-second timer.
3.  **Transient Error Retries:** Recognizes transient HTTP codes (`429`, `503`, network drops) and attempts a single retry after a $2$-second delay.
4.  **Local Static Fallbacks:** If the Gemini API key is missing or calls time out, the backend retrieves pre-defined, context-aware static fallbacks (`utils/fallbacks.js`). The demo flow remains completely functional offline.

---

## 6. Frontend Visual Cockpit Design

Following the cockpit design guidelines in `DESIGN.md`, the dashboard rejects generic SaaS cards and visual bloat.

### Colors & CSS System (OKLCH-derived HEX Tokens)
*   **Background (`bg`):** `#0B0D12` (Cool, dark near-black to reduce shift operator eye fatigue).
*   **Panels (`surface-1`):** `#12151C` (High contrast containers).
*   **Nested Tracks/Inputs (`surface-2`):** `#181C25` (Embedded tables).
*   **Hovers (`surface-3`):** `#1F2430` (Interactive feedback).
*   **Borders (`line`):** `#232936` (Sharp 1px dividers, no heavy shadows).
*   **Labels/Text (`ink` / `ink-2`):** `#E7EBF1` and `#9AA3B2` (Readable contrast ratios matching WCAG AA).
*   **Agent Identity (`accent`):** `#4CB8E8` (Cyber cyan; represents selection, active indicators, and AI agents).
*   **Status Tints:** `#3FB890` (Healthy ok), `#E6A23C` (Warning), `#F0524F` (Critical). Severity colors are strictly reserved for track safety states.

### Core Visual Components
1.  **Situation Bar:** 56px sticky header. Renders the Corridor Health Index, active warning/critical counts, and a blinking pulse indicating the active state of the autonomous scanning agent.
2.  **Attention Queue:** Lists active anomalies sorted by severity. Warning segments are collapsed; critical segments expand automatically with a 2px left border. Healthy track segments collapse into a single searchable row.
3.  **Track Strip:** A 100-cell linear schematic mapping segments physically. Cells are $2\text{ px}$ wide. Healthy segments are dim green; warnings are solid orange; criticals blink red. Clicking a cell focus-selects it.
4.  **Focus Panel:** Displays detail stats in monospaced typography, a linear gauge showing risk scores, a Recharts line graph of history, and a risk decomposition chart showing weight contributions. Houses the AI-powered defect/repair forms.
5.  **Activity Ledger:** Monospaced terminal window showing real-time logs of the monitoring cycles, anomaly detections, and work orders. Pushes updates every $3$ seconds.

---

## 7. Interactive Live Demo Script (2 Minutes)

To showcase RailGuard's autonomous and cognitive abilities, follow this presentation flow:

### Step 1: Establish the Baseline (0:00 - 0:20)
*   Open the console. Point out that the 100-cell grid is healthy green.
*   Highlight the **Situation Bar**'s active pulse and the scrolling **Activity Log**:
    `[MONITOR] SCAN Cycle #X: Scanning 100 segments...`
*   *Key Talking Point:* "The system operates autonomously. It scans the entire corridor at 10-second intervals and assesses risk in real time, requiring no manual intervention."

### Step 2: Trigger Telemetry Degradation (0:20 - 0:50)
*   Navigate to the **Simulator Panel** (the dashed synthetic test area).
*   Under *Demo Scenarios*, click **"Degrade SEG-042 (Critical)"** and press **Run**.
*   *Observation:*
    *   SEG-042 instantly flashes red on the grid and Track Strip.
    *   The **Attention Queue** shifts the segment to the top.
    *   The **Activity Ledger** logs:
        `[DETECTION] ANOMALY SEG-042 -> critical (risk: 68.45)`
        `[DISPATCH] WORK_ORDER Auto-generated WO-SEG-042-001 (priority: urgent)`
*   *Key Talking Point:* "The detection agent immediately caught the telemetry drift. The risk engine recalculated the score to 68.45, and the dispatch agent generated an urgent work order."

### Step 3: Analyze Telemetry with AI (0:50 - 1:20)
*   Click **SEG-042** on the grid to open the **Focus Panel**.
*   Point out the **Vibration Chart** showing the upward-trending curve, the **Risk Gauge**, and the **Trend Badge** showing `"Predicted critical in ~0 days"`.
*   Show the **AI Explanation** card: Gemini is generating a plain-English explanation, citing the vibration of $8.52\text{ mm/s}$ and the dispatched work order.
*   *Key Talking Point:* "Here, Gemini operates as a supervisor. It doesn't make detection decisions—which are reserved for predictable math—but instead narrates the threat for the operator."

### Step 4: Verify Repairs & Close Incident (1:20 - 2:00)
*   Go to the *Verify Repair* section in the Focus Panel.
*   Paste this crew report: `"Tightened all loose joint bolts on segment 042 and recalibrated the telemetry sensors."`
*   Click **Verify Repair**.
*   *Observation:*
    *   The **Activity Ledger** prints verification success:
        `[VERIFICATION] VERIFY Repair verified for SEG-042 (confidence: 0.95)`
        `[DISPATCH] WORK_ORDER Work order WO-SEG-042-001 completed`
    *   The segment details update, active defects disappear, and SEG-042 returns to healthy green.
*   *Key Talking Point:* "Gemini read the maintenance log, verified that the bolts were secured, closed the work order, and reset the telemetry baseline to healthy. The loop is complete—completely autonomous, validated, and resolved."
