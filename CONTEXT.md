# RAILGUARD — Autonomous Railway Safety Inspector

**READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.** This is the single source of truth for the RailGuard project. Every team member and every AI coding agent must follow this exactly. Do not deviate from the architecture, naming, or API contracts defined here.

---

## PROJECT OVERVIEW

**RailGuard** is an autonomous railway safety monitoring system built for the **FAR AWAY 2026 hackathon** under the **"Agentic & Autonomous Systems"** theme.

**What it does:** AI-powered services continuously monitor 100 railway track segments, detect anomalies using deterministic math (risk formula), compute risk scores, and dispatch maintenance orders — ALL WITHOUT HUMAN INTERVENTION. The key word is **autonomous**. The system watches, detects, predicts, and acts on its own.

**Demo flow:** Start the app → monitoring begins immediately → a segment degrades → risk score climbs → alert fires → maintenance order dispatched → repair is submitted → Gemini verifies → segment returns to healthy. The judges watch this happen live with zero human clicks.

---

## TEAM ROLES

| Person | Role | What They Build |
| :---- | :---- | :---- |
| **Member 1** | Frontend Dev | React dashboard — 100-segment grid, metric cards, charts, simulator panel. |
| **Member 2** | Backend Dev | Express server, data layer, REST routes, risk engine, error handling. |
| **Member 3** | AI Engineer | Gemini extractor & verifier services, prompts, fallbacks, constants. |
| **Member 4** | Integrator | Frontend API service, polling hooks, shared utilities, environment config. |
| **Member 5** | Simulator + Data | SimulatorPanel component, vibration history pre-population, demo scenarios. |

---

## TECH STACK — DO NOT CHANGE THESE

### Backend

- **Node.js** — runtime environment
- **Express** — REST API server (port 3001)
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

```
mavericks/
├── .gitignore
├── CONTEXT.md
├── DAY-1 AUDIT.md
├── README.md
│
├── backend/
│   ├── .env.example            # GEMINI_API_KEY + PORT=3001
│   ├── server.js               # Express entry point, CORS, route mounts, error handler
│   │
│   ├── data/
│   │   └── segments.js         # 100 TrackSegment objects (in-memory data store)
│   │
│   ├── routes/
│   │   ├── segmentRoutes.js    # GET /api/segments, GET /api/segments/:segmentId
│   │   ├── statsRoutes.js      # GET /api/stats, POST /api/reset-all
│   │   └── aiRoutes.js         # POST /api/extract-defect, POST /api/verify-repair (stub → Day 2)
│   │
│   ├── services/
│   │   ├── riskEngine.js       # Deterministic risk formula — NO AI here
│   │   ├── geminiExtractor.js  # extractDefect() + generateRiskExplanation() via Gemini
│   │   └── geminiVerifier.js   # verifyRepair() via Gemini
│   │
│   ├── utils/
│   │   ├── constants.js        # 21 constants: weights, thresholds, IDs, model name
│   │   ├── idGenerator.js      # DEF-YYYYMMDD-NNN + RPR-YYYYMMDD-NNN generators
│   │   └── fallbacks.js        # FALLBACK_EXTRACTION, FALLBACK_VERIFICATION, FALLBACK_EXPLANATION
│   │
│   └── middleware/
│       └── errorHandler.js     # Global Express error handler → { error: err.message }
│
├── frontend/                   # Separate Vite project
│   ├── package.json
│   ├── vite.config.js          # Proxy /api → localhost:3001
│   ├── tailwind.config.js      # Custom colors + Inter font
│   ├── postcss.config.js
│   ├── index.html              # Inter font from Google Fonts
│   ├── .env                    # VITE_API_URL=http://localhost:3001
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css           # Tailwind directives + pulse keyframes
│   │   ├── components/
│   │   │   ├── CellGrid.jsx        # 10×10 grid of rail segments
│   │   │   ├── CellItem.jsx        # Individual color-coded cell with pulse animation
│   │   │   ├── MetricCards.jsx      # 4 glassmorphic stat cards
│   │   │   └── SimulatorPanel.jsx   # Spike/crack/reset simulator controls
│   │   ├── hooks/
│   │   │   ├── useSegments.js       # Polls GET /api/segments every 5s
│   │   │   ├── useStats.js          # Polls GET /api/stats every 5s
│   │   │   └── useSelectedSegment.js # Fetches single segment detail
│   │   ├── services/
│   │   │   └── api.js               # Axios instance + 7 API wrapper functions
│   │   └── utils/
│   │       ├── constants.js         # Shared frontend constants
│   │       └── statusColors.js      # Status-to-color mapping helper
│   └── public/
```

**IMPORTANT:** Do not add new dependencies without coordinating with the team first.

---

## AI SERVICES

### Overview

Gemini is used for **exactly two things** — defect extraction and repair verification. Everything else (risk scores, status classification, anomaly thresholds) is **deterministic math** in `riskEngine.js`.

### Service 1: Gemini Extractor (`services/geminiExtractor.js`)

- **`extractDefect(reportText)`** — Parses unstructured inspection report text → structured defect JSON
- **`generateRiskExplanation(segment)`** — Generates 2-3 sentence plain-English risk explanation
- Uses `@google/generative-ai` SDK with `gemini-2.0-flash` model
- Multi-strategy JSON parsing: raw parse → strip code fences → extract `{...}` block
- Falls back to `FALLBACK_EXTRACTION` / `FALLBACK_EXPLANATION` if Gemini is unavailable

**Defect extraction output:**

```json
{
  "defectType": "type of structural or mechanical defect",
  "location": "specific location on the rail segment",
  "severity": "low | medium | high | critical",
  "description": "one-sentence summary of the issue",
  "recommendedAction": "specific repair action needed"
}
```

### Service 2: Gemini Verifier (`services/geminiVerifier.js`)

- **`verifyRepair(originalDefect, repairDescription)`** — Determines if a repair adequately addresses the original defect
- Same multi-strategy JSON parsing and fallback pattern
- Falls back to `FALLBACK_VERIFICATION` if Gemini is unavailable

**Verification output:**

```json
{
  "isVerified": true,
  "confidence": 0.92,
  "verificationReasoning": "explanation of why the repair is or isn't adequate",
  "statusRecommendation": "healthy | warning | critical"
}
```

### Service 3: Risk Engine (`services/riskEngine.js`)

- **`calculateRisk(segment)`** — Pure math, no AI. Returns `{ riskScore, status }`.
- Uses weights and thresholds from `utils/constants.js`
- Verified against the risk formula defined below

---

## RISK FORMULA — MEMORIZE THIS

```
risk_score = 0.40 × V + 0.25 × C + 0.20 × I + 0.15 × A
```

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
| GET | `/api/segments/:segmentId` | `{ segment: {...} }` — single segment detail | Member 2 | ✅ Done |
| GET | `/api/stats` | `{ total, healthy, warning, critical }` | Member 2 | ✅ Done |
| POST | `/api/reset-all` | `{ segments: [...] }` — resets all segments to healthy | Member 2 | ✅ Done |
| POST | `/api/extract-defect` | Extracted defect JSON | Member 2 | ⚠️ Stub (Day 2) |
| POST | `/api/verify-repair` | Verification result JSON | Member 2 | ⚠️ Stub (Day 2) |
| POST | `/api/segments/:segmentId/simulate` | Simulated segment state | Member 2 | ❌ Not yet (Day 2) |

### Response Shapes

**Segment object (from `data/segments.js`):**

```json
{
  "segmentId": "SEG-001",
  "status": "healthy | warning | critical",
  "riskScore": 8.0,
  "vibrationLevel": 2.35,
  "crackCount": 0,
  "incidentCount": 0,
  "daysSinceInspection": 5,
  "lastUpdated": "2026-06-10T01:00:00.000Z",
  "activeDefects": [],
  "vibrationHistory": [
    {
      "timestamp": "2026-06-10T00:40:00.000Z",
      "vibrationLevel": 2.18,
      "temperature": 37.42,
      "crackDetected": false
    }
  ]
}
```

**Stats object:**

```json
{
  "total": 100,
  "healthy": 98,
  "warning": 1,
  "critical": 1
}
```

### Vite Dev Proxy

The frontend Vite dev server (port 5173) proxies all `/api` requests to the backend (port 3001) via `vite.config.js`. In production, the frontend calls the backend URL directly via `VITE_API_URL`.

---

## DATA MODEL (in-memory)

File: `backend/data/segments.js`

100 TrackSegment objects are generated on server startup. Each segment is pre-populated with 20 vibration history data points. All routes read from and write to this in-memory array.

```javascript
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
  activeDefects: [],            // array of defect objects
  vibrationHistory: [           // 20 most recent readings
    {
      timestamp: "ISO string",
      vibrationLevel: 2.18,
      temperature: 37.42,
      crackDetected: false
    }
  ]
}
```

### Constants (`utils/constants.js`):

| Constant | Value | Purpose |
| :---- | :---- | :---- |
| `TOTAL_SEGMENTS` | 100 | Total track segments |
| `WEIGHT_VIBRATION` | 0.40 | Risk formula weight |
| `WEIGHT_CRACK` | 0.25 | Risk formula weight |
| `WEIGHT_INCIDENT` | 0.20 | Risk formula weight |
| `WEIGHT_AGE` | 0.15 | Risk formula weight |
| `THRESHOLD_HEALTHY_MAX` | 30.00 | Healthy ≤ 30 |
| `THRESHOLD_WARNING_MAX` | 60.00 | Warning ≤ 60, Critical > 60 |
| `VIBRATION_NORMAL_MAX` | 4.0 | Normal vibration ceiling |
| `VIBRATION_WARNING_MAX` | 7.0 | Warning vibration ceiling |
| `VIBRATION_CRITICAL_MIN` | 7.1 | Critical vibration floor |
| `MAX_VIBRATION_HISTORY` | 20 | History buffer size |
| `POLLING_INTERVAL_MS` | 5000 | Frontend polling interval |
| `DEFAULT_SPIKE_VALUE` | 9.5 | Simulator spike vibration |
| `DEFAULT_HEALTHY_VIBRATION` | 2.0 | Simulator reset vibration |
| `GEMINI_MODEL` | `"gemini-2.0-flash"` | Gemini model identifier |

---

## FRONTEND COMPONENTS

### Design System:

- **Dark theme** — dark navy/charcoal background (`#0a0f1a` or similar)
- **Glassmorphic cards** — `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`
- **Color coding:** Green = healthy, Amber/Yellow = warning, Red = critical
- **Font:** Inter (loaded from Google Fonts)
- **Animations:** Framer Motion for cell status transitions; CSS `pulse-warning` / `pulse-critical` keyframes

### Components Built (Day 1):

**MetricCards.jsx** — 4 glassmorphic stat cards showing total segments, healthy count, warning count, critical count. Accepts `stats` prop from `useStats` hook.

**CellGrid.jsx** — The hero component. 10×10 grid of cells. Falls back to mock data if no `segments` prop. Each cell renders a `CellItem`.

**CellItem.jsx** — Individual color-coded cell showing segment ID. Pulse animation for warning/critical states. Click handler for segment selection.

**SimulatorPanel.jsx** — Control panel with spike, crack, and reset buttons for individual segments. Calls `POST /api/segments/:id/simulate` (not yet implemented on backend — Day 2).

### Components Remaining (Day 2):

- `TelemetryPanel.jsx` — Detailed segment view with risk gauge
- `RiskGauge.jsx` — Visual risk score indicator
- `VibrationChart.jsx` — Recharts line chart for vibration history
- `ExtractionForm.jsx` — Submit inspection reports for Gemini extraction
- `VerificationForm.jsx` — Submit repairs for Gemini verification
- `AiExplanation.jsx` — Display Gemini-generated risk explanations
- `DefectList.jsx` — List of active defects for a segment
- `AlertBanner.jsx` — System-wide alert display

### Hooks:

**useSegments.js** — Polls `GET /api/segments` every 5s. Returns `{ segments, loading, error, refetch }`.

**useStats.js** — Polls `GET /api/stats` every 5s. Returns `{ stats, loading, error }`.

**useSelectedSegment.js** — Fetches single segment detail via `GET /api/segments/:segmentId`. Returns `{ selectedSegment, selectSegment, clearSelection, loading, error }`.

### API Helper (`services/api.js`):

```javascript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const client = axios.create({ baseURL: API_BASE });

export const getSegments = () => client.get("/api/segments").then(r => r.data);
export const getSegment = (id) => client.get(`/api/segments/${id}`).then(r => r.data);
export const getStats = () => client.get("/api/stats").then(r => r.data);
export const simulateAction = (id, action, value) =>
  client.post(`/api/segments/${id}/simulate`, { action, value }).then(r => r.data);
export const extractDefect = (segmentId, reportText) =>
  client.post("/api/extract-defect", { segmentId, reportText }).then(r => r.data);
export const verifyRepair = (segmentId, defectId, repairDescription) =>
  client.post("/api/verify-repair", { segmentId, defectId, repairDescription }).then(r => r.data);
export const resetAll = () => client.post("/api/reset-all").then(r => r.data);
```

---

## ENVIRONMENT VARIABLES

**Backend** — create `backend/.env` (never commit):

```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

Get your free Gemini API key from: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Frontend** — `frontend/.env`:

```
VITE_API_URL=http://localhost:3001
```

---

## GIT WORKFLOW

1. Each person works on their own branch.
2. Commit often with clear messages: `feat: add risk engine`, `fix: cell grid polling`
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

- [x] `backend/services/geminiExtractor.js` — `extractDefect()` + `generateRiskExplanation()` with JSON parsing safety
- [x] `backend/services/geminiVerifier.js` — `verifyRepair()` with validation and fallbacks
- [x] `backend/utils/constants.js` — 21 constants matching the risk formula
- [x] `backend/utils/fallbacks.js` — `FALLBACK_EXTRACTION`, `FALLBACK_VERIFICATION`, `FALLBACK_EXPLANATION`
- [x] `backend/utils/idGenerator.js` — `DEF-YYYYMMDD-NNN` + `RPR-YYYYMMDD-NNN` format generators
- [x] `backend/.env.example` — `GEMINI_API_KEY` + `PORT=3001`

### Member 1 (Frontend):

- [x] Vite + React scaffold with Tailwind, Framer Motion, Recharts, Axios
- [x] `MetricCards.jsx` — 4 glassmorphic stat cards
- [x] `CellGrid.jsx` + `CellItem.jsx` — 10×10 grid with color-coded cells and pulse animations
- [x] `App.jsx` — header + MetricCards + CellGrid + sidebar layout
- [x] `index.css` — Tailwind directives + pulse-warning/pulse-critical keyframes
- [x] Dark glassmorphic theme

### Member 4 (Integrator):

- [x] `frontend/src/services/api.js` — Axios instance + 7 API wrapper functions
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

## WHAT EACH PERSON BUILDS NEXT (Day 2)

### Member 2 (Backend) — Day 2:

- [ ] Add `POST /api/segments/:segmentId/simulate` route (spike, crack, reset actions)
- [ ] Wire `POST /api/extract-defect` to `geminiExtractor.extractDefect()`
- [ ] Wire `POST /api/verify-repair` to `geminiVerifier.verifyRepair()`

### Member 1 (Frontend) — Day 2:

- [ ] `TelemetryPanel.jsx` + `RiskGauge.jsx` — detailed segment view
- [ ] `VibrationChart.jsx` — Recharts line chart for vibration history
- [ ] `ExtractionForm.jsx` + `VerificationForm.jsx` — Gemini AI forms
- [ ] `AiExplanation.jsx` — display Gemini risk explanations
- [ ] `DefectList.jsx`, `AlertBanner.jsx`

### Member 4 (Integrator) — Day 2:

- [ ] Wire MetricCards to `useStats` hook (live data)
- [ ] Wire CellGrid to `useSegments` hook (live data)
- [ ] Wire TelemetryPanel to `useSelectedSegment` hook
- [ ] Wire ExtractionForm + VerificationForm to API service

### Member 5 (Simulator) — Day 2:

- [ ] Add vibration spike history generation
- [ ] Build demo scenario route `POST /api/demo/scenario`

---

### Day 1 Execution Notes

> **Audit Date:** 2026-06-10 01:36 IST | **Audited by:** Member 2 + Member 4

All 5 members' Day 1 tasks are **100% complete**. Backend boots cleanly (`npm start` → port 3001), frontend boots cleanly (`npm run dev` → port 5173), Vite proxy forwards `/api` to backend.

#### ⚠️ Remaining Issues (Carried to Day 2)

| Issue | Impact | Owner |
|-------|--------|-------|
| `backend/.env` file missing (only `.env.example` exists) | Gemini API calls silently use fallback responses instead of real LLM | Member 3 |
| `POST /api/segments/:segmentId/simulate` not implemented | SimulatorPanel buttons return 404 | Member 2 |

---

## CODING CONVENTIONS

- **JavaScript:** camelCase for variables/functions, PascalCase for components/classes. JSDoc comments on all service functions.
- **No `any` type.** Use consistent object shapes as documented above.
- **All numbers must be rounded.** `toFixed(2)` for risk scores, `toFixed(2)` for sensor readings.
- **Error handling everywhere.** Every route and service function should handle errors gracefully. Use the global `errorHandler` middleware as the safety net.
- **Comments:** Write them. Future you will thank present you.

---

## DEMO SCRIPT (what judges see)

**Phase 1 (0:00-0:20):** App opens. 100-segment grid all green. Metric cards show 100 healthy, 0 warning, 0 critical. Data polling every 5s.

**Phase 2 (0:20-0:50):** Use SimulatorPanel to spike a segment's vibration. Risk engine recalculates → risk score climbs. Segment turns yellow on grid. Metric cards update.

**Phase 3 (0:50-1:20):** Segment hits critical. Turns red. Defect extraction form: paste inspection report → Gemini extracts structured defect. AI Explanation panel shows Gemini-generated risk reasoning.

**Phase 4 (1:20-1:40):** "Repair" is submitted via VerificationForm. Gemini verifies it. Verification result shows confidence score and reasoning. Segment returns to green.

**Phase 5 (1:40-2:00):** Zoom out — show multiple segments being monitored simultaneously. Hit reset-all to demonstrate system resilience. Emphasize: "Zero human intervention for detection and risk scoring. Gemini provides intelligent extraction and verification."

---

## CRITICAL REMINDERS

1. **This is an AGENTIC project.** The system must monitor autonomously. Risk scores are recalculated on every API call, not on button clicks.
2. **Real math, not LLM calls for detection.** Risk scores use the deterministic formula in `riskEngine.js`, not "ask Gemini if this looks bad."
3. **Gemini is only used for:** extracting defects from text reports, generating risk explanations, and verifying repairs. Everything else is deterministic math.
4. **Fallbacks are mandatory.** If `GEMINI_API_KEY` is missing, all Gemini calls return safe fallback responses — the app never crashes.
5. **In-memory data store.** Data lives in `segments.js`. Restarting the server resets all data. This is intentional for the demo.
6. **Test locally before pushing.** Run `npm start` in `backend/` and `npm run dev` in `frontend/`. Confirm no crashes.
7. **Ask the team if confused.** Don't guess. Don't go rogue. We have limited time.
