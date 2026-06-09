# RAILGUARD — Autonomous Railway Safety Inspector

**READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.** This is the single source of truth for the RailGuard project. Every team member and every AI coding agent must follow this exactly. Do not deviate from the architecture, naming, or API contracts defined here.

---

## PROJECT OVERVIEW

**RailGuard** is an autonomous railway safety monitoring system built for the **FAR AWAY 2026 hackathon** under the **"Agentic & Autonomous Systems"** theme.

**What it does:** 4 AI agents continuously monitor 100 railway track cells, detect anomalies using real math (z-scores), compute risk scores, and dispatch maintenance orders — ALL WITHOUT HUMAN INTERVENTION. The key word is **autonomous**. The agents run in a loop. Nobody clicks a button to trigger analysis. The system watches, detects, predicts, and acts on its own.

**Demo flow:** Start the app → agents immediately begin monitoring → a cell degrades → agents detect it → risk score climbs → agents dispatch a maintenance order → repair is submitted → agents verify → cell returns to healthy. The judges watch this happen live with zero human clicks.

---

## TEAM ROLES

| Person | Role | Branch | What They Build |
| :---- | :---- | :---- | :---- |
| **P1** | AI Engineer \+ PM | `p1-agents` | CrewAI agents, tools, autonomous loop, main.py. Merges all branches to `main`. |
| **P2** | Backend Developer | `p2-backend` | FastAPI routes, SQLite database models, REST endpoints, data layer. |
| **P3** | Frontend Developer | `p3-frontend` | React dashboard — 100-cell grid, charts, agent activity log, alerts panel. |
| **P4** | Simulator \+ Data | `p4-simulator` | Physics-based sensor simulator, seed data, mock inspection reports. |

**P1 is the integration point.** All code flows through P1 for merging. If you're unsure about something, ask P1.

---

## TECH STACK — DO NOT CHANGE THESE

### Backend

- **Python 3.11+**  
- **FastAPI** — REST API \+ WebSocket server  
- **CrewAI** — multi-agent orchestration framework (THIS IS THE CORE OF THE PROJECT)  
- **Google Gemini 2.0 Flash** — LLM for report extraction and repair verification  
- **SQLite** via SQLAlchemy — database (NO Supabase, NO Postgres)  
- **numpy / scipy** — sensor simulation and statistical calculations  
- **uvicorn** — ASGI server

### Frontend

- **React 18** via **Vite**  
- **TypeScript**  
- **Tailwind CSS** — styling  
- **Framer Motion** — animations  
- **Recharts** — charts and graphs  
- **WebSocket API** — for real-time agent activity log

### Deployment

- **Vercel** — frontend  
- **Railway** — backend

### Git

- **GitHub** — repo hosting  
- Branches: `main`, `p1-agents`, `p2-backend`, `p3-frontend`, `p4-simulator`  
- P1 merges feature branches into `main`. Nobody else pushes to `main` directly.

---

## FOLDER STRUCTURE

railguard/

├── .gitignore

├── .env.example

├── .env                    \# NOT committed — each person creates their own

├── requirements.txt

├── main.py                 \# FastAPI app \+ autonomous monitoring loop

│

├── agents/

│   ├── \_\_init\_\_.py

│   ├── config.py           \# Risk weights, thresholds, normalization constants

│   ├── tools.py            \# 5 CrewAI tool functions (real math, not LLM fluff)

│   └── crew.py             \# 4 agent definitions \+ crew \+ task chain

│

├── database/

│   ├── \_\_init\_\_.py

│   ├── models.py           \# SQLAlchemy models: Cell, Reading, Alert, WorkOrder

│   └── crud.py             \# Database read/write helpers

│

├── simulator/

│   ├── \_\_init\_\_.py

│   ├── engine.py           \# Physics-based sensor data generator

│   └── scenarios.py        \# Pre-built degradation scenarios for demo

│

├── frontend/               \# Separate Vite project

│   ├── package.json

│   ├── vite.config.ts

│   ├── tsconfig.json

│   ├── index.html

│   ├── src/

│   │   ├── App.tsx

│   │   ├── main.tsx

│   │   ├── components/

│   │   │   ├── CellGrid.tsx        \# 10×10 grid of rail cells

│   │   │   ├── CellDetail.tsx      \# Detail panel when clicking a cell

│   │   │   ├── AgentLog.tsx        \# Real-time scrolling agent activity

│   │   │   ├── AlertPanel.tsx      \# Active alerts list

│   │   │   ├── RiskChart.tsx       \# Risk score trend chart

│   │   │   └── StatusBar.tsx       \# Top bar: monitoring on/off, cycle count

│   │   ├── hooks/

│   │   │   ├── useWebSocket.ts     \# WebSocket hook for agent log

│   │   │   └── useCells.ts         \# Polling hook for cell data

│   │   ├── types/

│   │   │   └── index.ts            \# TypeScript interfaces

│   │   └── lib/

│   │       └── api.ts              \# Axios/fetch wrapper for REST calls

│   └── public/

│       └── railguard-logo.svg

│

└── API\_CONTRACTS.md         \# Endpoint definitions (shared reference)

**IMPORTANT:** Do not create files outside this structure. Do not add new dependencies without telling P1 first.

---

## THE 4 CREWAI AGENTS

This is the heart of the project. These agents run autonomously in a sequential pipeline every 10 seconds.

### Agent 1: Ingestion Agent

- **Role:** Sensor Data Ingestion Specialist  
- **Tool:** `parse_sensor_batch` — parses raw JSON sensor readings, extracts vibration/temperature/crack data, computes batch statistics (mean, std, max, min)  
- **Input:** Raw sensor JSON from simulator  
- **Output:** Cleaned, structured sensor summary

### Agent 2: Detection Agent

- **Role:** Anomaly Detection Analyst  
- **Tools:** `calculate_zscore`, `check_thresholds`  
- **What it does:** Runs z-score anomaly detection on vibration readings. If z-score ≥ 2.0 → warning. If z-score ≥ 3.0 → critical.  
- **Input:** Parsed sensor data from Agent 1  
- **Output:** Anomaly flags with severity levels

### Agent 3: Prediction Agent

- **Role:** Risk Prediction & Reporting Specialist  
- **Tools:** `check_thresholds`, `extract_pdf_report`  
- **What it does:** Computes the composite risk score for flagged cells. Can also extract defect info from inspection reports using Gemini.  
- **Input:** Anomaly data from Agent 2  
- **Output:** Risk score \+ status classification

### Agent 4: Dispatch Agent

- **Role:** Maintenance Dispatch Coordinator  
- **Tool:** `verify_repair`  
- **What it does:** Generates maintenance work orders for warning/critical cells. After repairs are submitted, verifies them using Gemini.  
- **Input:** Risk data from Agent 3  
- **Output:** Work orders or repair verification results

### Pipeline flow:

Simulator → Ingestion Agent → Detection Agent → Prediction Agent → Dispatch Agent

    ↑                                                                      |

    └──────────────────── loop every 10 seconds ───────────────────────────┘

---

## RISK FORMULA — MEMORIZE THIS

risk\_score \= 0.40 × V \+ 0.25 × C \+ 0.20 × I \+ 0.15 × A

| Component | Weight | Raw Input | Normalization (to 0-100) |
| :---- | :---- | :---- | :---- |
| **V** — Vibration | 0.40 | z-score from rolling window | `abs(zscore) × 25`, cap 100 |
| **C** — Crack | 0.25 | crack count | `count × 33`, cap 100 |
| **I** — Incident | 0.20 | weighted incident count | `incidents × 20`, cap 100 |
| **A** — Age | 0.15 | days since last inspection | `days × 3.3`, cap 100 |

### Risk Levels:

- **0–30** → `healthy` (green)  
- **31–60** → `warning` (yellow/amber)  
- **61–100** → `critical` (red)

### Z-Score Thresholds:

- **\< 2.0** → normal  
- **2.0–2.99** → warning  
- **≥ 3.0** → critical

---

## API CONTRACTS

Base URL: `http://localhost:8000`

### REST Endpoints

| Method | Path | Returns | Who Builds |
| :---- | :---- | :---- | :---- |
| GET | `/api/health` | `{ status, monitoring_active }` | P1 (done) |
| GET | `/api/cells` | Array of all 100 cells with status \+ risk\_score | P2 |
| GET | `/api/cells/{cell_id}` | Single cell detail with reading history | P2 |
| GET | `/api/alerts` | Active alerts array | P2 |
| GET | `/api/agent-log?limit=50` | Recent agent activity entries | P1 (done) |
| POST | `/api/monitoring/start` | `{ status: "started" }` | P1 (done) |
| POST | `/api/monitoring/stop` | `{ status: "stopped" }` | P1 (done) |

### Response Shapes

**Cell object:**

{

  "cell\_id": "C-001",

  "status": "healthy | warning | critical",

  "risk\_score": 22.5,

  "last\_vibration": 3.2,

  "last\_temperature": 35,

  "crack\_count": 0,

  "days\_since\_inspection": 5,

  "last\_updated": "2026-06-09T10:00:00"

}

**Alert object:**

{

  "id": 1,

  "cell\_id": "C-042",

  "severity": "critical",

  "risk\_score": 78.5,

  "message": "Vibration z-score 3.4 exceeds critical threshold",

  "timestamp": "2026-06-09T10:02:00",

  "resolved": false

}

**Agent log entry:**

{

  "timestamp": "2026-06-09T10:00:00",

  "agent": "Ingestion | Detection | Prediction | Dispatch | System",

  "action": "PROCESS | ANOMALY | RISK | DISPATCH | CYCLE | START | STOP | ERROR",

  "detail": "Human-readable description",

  "severity": "info | warning | critical"

}

### WebSocket

**`ws://localhost:8000/ws/agent-log`** — Real-time agent activity stream. On connect, sends last 20 entries then streams new ones live. Frontend connects once and keeps listening.

---

## DATABASE MODELS (P2 builds these)

Use **SQLAlchemy** with **SQLite**. File: `database/models.py`

\# These are the exact models P2 must implement:

class Cell:

    id: str              \# "C-001" through "C-100"

    status: str          \# "healthy" | "warning" | "critical"

    risk\_score: float    \# 0-100

    last\_vibration: float

    last\_temperature: float

    crack\_count: int

    days\_since\_inspection: int

    last\_updated: datetime

class Reading:

    id: int              \# auto-increment

    cell\_id: str         \# FK to Cell

    vibration: float

    temperature: float

    crack\_count: int

    timestamp: datetime

class Alert:

    id: int

    cell\_id: str

    severity: str        \# "warning" | "critical"

    risk\_score: float

    message: str

    timestamp: datetime

    resolved: bool       \# default False

class WorkOrder:

    id: int

    cell\_id: str

    alert\_id: int        \# FK to Alert

    priority: str        \# "high" | "medium" | "low"

    recommended\_action: str

    status: str          \# "pending" | "in\_progress" | "completed"

    created\_at: datetime

    completed\_at: datetime | None

---

## SIMULATOR ENGINE (P4 builds this)

File: `simulator/engine.py`

The simulator generates **physics-based** fake sensor data. NOT random numbers. It uses:

- **Sine waves** — base vibration pattern (trains passing at regular intervals)  
- **Harmonics** — higher-frequency components layered on base  
- **Gaussian noise** — random measurement noise  
- **Degradation drift** — slow upward trend simulating wear over time

\# Pseudocode for what P4 builds:

import numpy as np

def generate\_sensor\_batch(cell\_id: str, cycle: int) \-\> dict:

    t \= np.linspace(0, 1, 5\)  \# 5 readings per batch

    

    \# Base vibration: sine wave (train passing pattern)

    base \= 2.5 \* np.sin(2 \* np.pi \* t)

    

    \# Add harmonic

    harmonic \= 0.8 \* np.sin(6 \* np.pi \* t)

    

    \# Add noise

    noise \= np.random.normal(0, 0.3, len(t))

    

    \# Add degradation drift (increases with cycle for "bad" cells)

    drift \= get\_drift\_for\_cell(cell\_id, cycle)

    

    vibration \= np.abs(base \+ harmonic \+ noise \+ drift)

    

    return {

        "readings": \[

            {

                "cell\_id": cell\_id,

                "vibration": round(float(v), 3),

                "temperature": round(35 \+ np.random.normal(0, 2\) \+ drift \* 0.5, 1),

                "crack\_count": 1 if drift \> 3.0 else 0,

                "timestamp": datetime.now().isoformat()

            }

            for v in vibration

        \]

    }

### Demo Scenarios (P4 pre-programs these):

1. **Healthy cell** — stays flat, normal vibrations, risk stays 0-20  
2. **Gradual degradation** — drift increases slowly over 30 cycles, warning at cycle \~20, critical at \~28  
3. **Sudden spike** — normal for 15 cycles, then sudden jump (simulates rail break)  
4. **Repaired cell** — was critical, repair submitted, agents verify, returns to healthy

---

## FRONTEND COMPONENTS (P3 builds these)

### Design System:

- **Dark theme** — dark navy/charcoal background (`#0a0f1a` or similar)  
- **Glassmorphic cards** — `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`  
- **Color coding:** Green \= healthy, Amber/Yellow \= warning, Red \= critical  
- **Font:** Inter or system sans-serif  
- **Animations:** Framer Motion for cell status transitions, alert appearances

### Component Details:

**CellGrid.tsx** — The hero component. 10×10 grid of cells. Each cell is a colored square (green/yellow/red) showing cell ID and risk score. Clicking a cell opens CellDetail. Polls `GET /api/cells` every 5 seconds.

**CellDetail.tsx** — Slide-out or modal panel. Shows: cell ID, current status, risk score breakdown (V/C/I/A bars), vibration trend chart (last 30 readings), recent alerts for that cell.

**AgentLog.tsx** — Scrolling panel showing real-time agent activity. Connects to `ws://localhost:8000/ws/agent-log`. Each entry shows: timestamp, agent name (color-coded), action, and detail text. Auto-scrolls to bottom. This is the **most important visual for judges** — it proves agents are working autonomously.

**AlertPanel.tsx** — List of active alerts sorted by severity. Shows cell ID, risk score, message, timestamp. Unresolved alerts highlighted.

**RiskChart.tsx** — Recharts line/area chart showing risk score history for selected cell. X-axis \= time, Y-axis \= 0-100 risk score. Horizontal lines at 30 (warning threshold) and 60 (critical threshold).

**StatusBar.tsx** — Top bar showing: "Monitoring: ACTIVE/STOPPED", cycle count, total cells monitored, cells in warning/critical.

### TypeScript Interfaces:

// types/index.ts

interface Cell {

  cell\_id: string;

  status: 'healthy' | 'warning' | 'critical';

  risk\_score: number;

  last\_vibration: number;

  last\_temperature: number;

  crack\_count: number;

  days\_since\_inspection: number;

  last\_updated: string;

}

interface Alert {

  id: number;

  cell\_id: string;

  severity: 'warning' | 'critical';

  risk\_score: number;

  message: string;

  timestamp: string;

  resolved: boolean;

}

interface AgentLogEntry {

  timestamp: string;

  agent: 'Ingestion' | 'Detection' | 'Prediction' | 'Dispatch' | 'System';

  action: string;

  detail: string;

  severity: 'info' | 'warning' | 'critical';

}

interface WorkOrder {

  id: number;

  cell\_id: string;

  alert\_id: number;

  priority: 'high' | 'medium' | 'low';

  recommended\_action: string;

  status: 'pending' | 'in\_progress' | 'completed';

  created\_at: string;

  completed\_at: string | null;

}

### API Helper:

// lib/api.ts

const API\_BASE \= import.meta.env.VITE\_API\_URL || 'http://localhost:8000';

export const api \= {

  getCells: () \=\> fetch(\`${API\_BASE}/api/cells\`).then(r \=\> r.json()),

  getCell: (id: string) \=\> fetch(\`${API\_BASE}/api/cells/${id}\`).then(r \=\> r.json()),

  getAlerts: () \=\> fetch(\`${API\_BASE}/api/alerts\`).then(r \=\> r.json()),

  getAgentLog: (limit \= 50\) \=\> fetch(\`${API\_BASE}/api/agent-log?limit=${limit}\`).then(r \=\> r.json()),

  startMonitoring: () \=\> fetch(\`${API\_BASE}/api/monitoring/start\`, { method: 'POST' }).then(r \=\> r.json()),

  stopMonitoring: () \=\> fetch(\`${API\_BASE}/api/monitoring/stop\`, { method: 'POST' }).then(r \=\> r.json()),

};

export const WS\_URL \= API\_BASE.replace('http', 'ws') \+ '/ws/agent-log';

---

## ENVIRONMENT VARIABLES

Create a `.env` file in root (never commit this):

GEMINI\_API\_KEY=your\_gemini\_api\_key\_here

DATABASE\_URL=sqlite:///railguard.db

Get your free Gemini API key from: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

Frontend `.env`:

VITE\_API\_URL=http://localhost:8000

---

## GIT WORKFLOW

1. Each person works on their own branch: `p1-agents`, `p2-backend`, `p3-frontend`, `p4-simulator`  
2. Commit often with clear messages: `feat: add z-score tool`, `fix: cell grid polling`  
3. Push to your branch: `git push origin p2-backend`  
4. Tell P1 when ready → P1 pulls and merges into `main`  
5. **Never force push. Never push to main directly.**

\# First time setup:

git clone \<repo-url\>

cd railguard

git checkout \-b p2-backend   \# use YOUR branch name

\# Daily workflow:

git add .

git commit \-m "feat: add Cell model and CRUD"

git push origin p2-backend

---

## WHAT'S ALREADY DONE (P1 completed)

- [x] `.gitignore`  
- [x] `.env.example`  
- [x] `requirements.txt`  
- [x] `agents/config.py` — all risk weights, thresholds, normalization constants  
- [x] `agents/tools.py` — 5 tool functions with real numpy math \+ Gemini calls  
- [x] `agents/crew.py` — 4 CrewAI agents defined, task chain, crew runner  
- [x] `main.py` — FastAPI app, WebSocket manager, autonomous loop, agent activity log, stub endpoints  
- [x] `API_CONTRACTS.md`

## WHAT EACH PERSON BUILDS NEXT

### P2 (Backend) — Day 1-2:

- [ ] `database/models.py` — Cell, Reading, Alert, WorkOrder SQLAlchemy models  
- [ ] `database/crud.py` — create\_cell, update\_cell, create\_reading, create\_alert, get\_cells, get\_alerts  
- [ ] Implement the stub endpoints in `main.py`: `/api/cells`, `/api/cells/{cell_id}`, `/api/alerts`  
- [ ] Seed 100 cells (C-001 to C-100) on startup  
- [ ] Wire database saves into the autonomous loop (P1 will integrate)

### P3 (Frontend) — Day 1-2:

- [ ] `npx create-vite frontend --template react-ts` → install Tailwind, Framer Motion, Recharts  
- [ ] `CellGrid.tsx` — 10×10 grid, polls `/api/cells` every 5s  
- [ ] `AgentLog.tsx` — WebSocket connection to `/ws/agent-log`  
- [ ] `AlertPanel.tsx` — polls `/api/alerts`  
- [ ] `StatusBar.tsx` — monitoring status \+ counts  
- [ ] Dark glassmorphic theme

### P4 (Simulator) — Day 1-2:

- [ ] `simulator/engine.py` — physics-based sensor generator with sine \+ harmonics \+ noise \+ drift  
- [ ] `simulator/scenarios.py` — 4 demo scenarios (healthy, gradual degradation, sudden spike, repaired)  
- [ ] Generate mock inspection report text for the extraction agent  
- [ ] Wire into `main.py`'s autonomous loop (replace stub data)

---

## CODING CONVENTIONS

- **Python:** snake\_case for variables/functions, PascalCase for classes. Type hints everywhere. Docstrings on all functions.  
- **TypeScript:** camelCase for variables/functions, PascalCase for components/interfaces. Strict mode on.  
- **No `any` type in TypeScript.** Use the interfaces defined above.  
- **No `print()` in production Python.** Use the `log_agent_activity()` function so it shows in the agent log.  
- **All numbers must be rounded.** `round(value, 2)` for risk scores, `round(value, 3)` for sensor readings.  
- **Error handling everywhere.** Every function should have try/except. Agents must never crash the loop.  
- **Comments:** Write them. Future you will thank present you.

---

## DEMO SCRIPT (what judges see)

**Phase 1 (0:00-0:20):** App opens. 100-cell grid all green. Agent log shows "Monitoring activated." Agents cycling every 10s.

**Phase 2 (0:20-0:50):** One cell starts degrading (P4's scenario). Agent log shows Ingestion parsing data → Detection flagging z-score anomaly → Prediction computing rising risk score. Cell turns yellow on grid.

**Phase 3 (0:50-1:20):** Cell hits critical. Turns red. Alert appears in panel. Agent log shows Dispatch generating work order. Risk chart shows the climb.

**Phase 4 (1:20-1:40):** "Repair" is submitted. Dispatch agent verifies it via Gemini. Agent log shows verification reasoning. Cell returns to green.

**Phase 5 (1:40-2:00):** Zoom out — show multiple cells being monitored simultaneously. Emphasize: "Zero human intervention. The agents detected, predicted, dispatched, and verified autonomously."

---

## CRITICAL REMINDERS

1. **This is an AGENTIC project.** The agents must run autonomously. If the judges have to click a button to trigger analysis, we lose.  
2. **Real math, not LLM calls for detection.** Z-scores and risk formulas use numpy, not "ask Gemini if this looks bad."  
3. **Gemini is only used for:** extracting defects from text reports and verifying repairs. Everything else is deterministic math.  
4. **The Agent Activity Log is our showpiece.** It proves the agents are thinking and acting. Make it prominent and readable.  
5. **SQLite only.** No cloud database. `railguard.db` file in root. Simple, fast, zero setup.  
6. **Test locally before pushing.** Run `python main.py` and confirm no crashes.  
7. **Ask P1 if confused.** Don't guess. Don't go rogue. We have 5 days.

