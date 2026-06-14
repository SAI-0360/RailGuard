<div align="center">
  <h1>🚆 RailGuard</h1>
  <p><strong>Autonomous AI-Powered Railway Safety Inspector & Orchestration Platform</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-Express-green?style=flat-square&logo=node.js" alt="Node" />
    <img src="https://img.shields.io/badge/MongoDB-Mongoose-brightgreen?style=flat-square&logo=mongodb" alt="MongoDB" />
    <img src="https://img.shields.io/badge/AI-Google_Gemini-orange?style=flat-square&logo=google" alt="Gemini" />
  </p>
</div>

RailGuard is an autonomous, AI-powered railway safety monitoring system designed to solve a critical operational problem in heavy railway networks (such as Indian Railways P.Way divisions): **the lack of real-time monitoring, administrative paperwork delays, and communication breakdown between field workers and engineers.**

By continuously monitoring track telemetry, forecasting failures, auto-dispatching repair tickets, and verifying field repairs using AI, RailGuard enforces a **"Work by Exception"** operational philosophy.

---

## 🌐 Live Demo

🔗 **[https://railguard-sooty.vercel.app/](https://railguard-sooty.vercel.app/)**

---

## 🛑 The Problem

Currently, railway track maintenance relies heavily on manual inspections (e.g., push trolley runs). This approach has systemic flaws:
1. **Latency:** Defects can propagate to critical failure before the next manual patrol reaches them.
2. **Paperwork Delays:** Communication between Field Workers (JEs) and Depot Managers (SSEs) involves physical registers, causing massive delays in triage.
3. **Blind Escalations:** When field crews face roadblocks, supervisors lack the situational awareness to provide immediate guidance.
4. **Verification Bottlenecks:** Ensuring a repair was actually completed correctly requires another manual site visit.

## 💡 The Solution

RailGuard replaces the manual reporting chain with an autonomous loop. It assumes a future where trains are equipped with track-facing sensors (accelerometers, cameras) that stream data back to a central server. 
RailGuard ingests this data, scores the risk, and autonomously manages the entire repair lifecycle — from detection to AI-verified closure — without human intervention unless an exception occurs.

---

## ✨ Core Capabilities

### 🔍 Autonomous Telemetry & Risk Engine
- A continuous background loop evaluates simulated train-mounted sensor data.
- **Deterministic Risk Scoring:** The system calculates a unified Risk Score (0-100) using a weighted algorithm:
  - Base risk derived from Vibration (mm/s) and Crack Count.
  - Recency penalty applied based on the age of the last inspection.
  - Incident history penalty applied for historically problematic segments.
  - **Curvature Penalty Multiplier:** Applied dynamically if the segment contains a sharp curve.

### 🧠 AI-Powered Repair Verification
- When a field engineer completes a repair, they submit a text-based field report.
- The system feeds the original anomaly data (e.g., "Vibration at 9.5 mm/s") and the JE's report (e.g., "Tightened loose fishplate bolts") to **Google Gemini AI**.
- Gemini validates if the described repair logically addresses the specific defect. If verified, the system automatically resets the segment's telemetry baselines and closes the work order.

### 📉 Proactive Trend Forecasting
- Runs Ordinary Least Squares (OLS) linear regression on the trailing 20 vibration points of a segment.
- Calculates the degradation slope to project the exact timeframe until a safety threshold breach, alerting operators to intervene proactively (e.g., *"critical in ~2d"*).

### 🗺️ GIS Route Geometry & Curvature Penalty
- Ingests raw OpenStreetMap coordinate node clouds and slices them into 1-km track segments.
- Computes planar circumradius and area Heron's formulas on the fly.
- Automatically applies a curvature risk multiplier for sharp track curves (≤ 300m), as derailment risk is significantly higher on curves.

### ⏱️ Enterprise SLA Orchestration & Freeze Loop
- Tickets are auto-dispatched to the geographically assigned JE with a strict 4-hour SLA countdown.
- **SLA Freeze:** If a field crew hits a roadblock (e.g., train movement blocking the track), they can request guidance. This instantly **freezes the SLA clock** to ensure crew evaluation remains fair. The clock only resumes once the supervisor replies with new instructions.

### ⚡ "Work by Exception" UI Design
- Replaces overwhelming 100-cell grids with a triaged **Attention Queue** and a collapsible **Track Strip**.
- A **"Mute Nominal"** toggle instantly hides all healthy track segments, collapsing the interface to show only active emergencies.
- API cost reduction: The system bypasses Gemini AI calls for healthy segments, using local static data to ensure fast loading and zero token waste.

---

## 👥 Operator Hierarchy

RailGuard mirrors real-world railway administration by segmenting the UI based on three operational tiers:

1. **District Engineer (DEN):** Top-level division commander. Sees the macro HQ Command View featuring a 10-day Corridor Health Index (CHI) trend chart, SLA breach reports, and division-wide escalations. Cannot manage individual segments.
2. **Senior Section Engineer (SSE):** Depot manager. Has full access to the Operations Console. Sees the Live Map, Drill Panels, and Work Order Pipeline. Handles warning triage, issues guidance to blocked field crews, and triggers AI repair verifications.
3. **Junior Engineer (JE):** Field worker. Sees a mobile-first, stripped-down Field View. They only see work orders for segments in their assigned geographical roster. They can acknowledge tickets, request guidance, and submit field completion reports.

---

## 🏗️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js (v18), Tailwind CSS, Framer Motion, Recharts, Leaflet |
| **Backend** | Node.js, Express, MongoDB / Mongoose |
| **AI Integration** | Google Gemini API (`gemini-2.0-flash`) |
| **Deployment** | Vercel (Frontend), Koyeb/Render (Backend) |

---

## 📂 Project Structure

```text
RailGuard/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── data/
│   │   ├── raw-tracks-db.json    # Geographic OpenStreetMap data
│   │   └── segments.js           # Live segment telemetry store
│   ├── middleware/
│   │   └── auth.js               # Route JWT validation
│   ├── routes/
│   │   ├── aiRoutes.js           # Gemini verification & risk endpoints
│   │   ├── segmentRoutes.js      # Track queries & JIT route processor
│   │   └── workOrderRoutes.js    # SLA ticketing & JE rosters
│   ├── services/
│   │   ├── geminiExtractor.js    # AI risk explanations
│   │   ├── geminiVerifier.js     # AI repair verifier
│   │   ├── riskEngine.js         # Math risk scoring & regression
│   │   └── routeProcessor.js     # Curve geometry calculations
│   └── server.js                 # Express entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AttentionQueue.jsx  # Triaged worklist & healthy summary
    │   │   ├── DENCommandView.jsx  # Read-only division HQ dashboard
    │   │   ├── FocusPanel.jsx      # Telemetry details & AI verification form
    │   │   ├── JEFieldView.jsx     # Mobile-first field console for workers
    │   │   ├── LiveMap.jsx         # Leaflet coordinate map
    │   │   ├── RouteFilter.jsx     # Dynamic station-to-station slicing
    │   │   ├── SituationBar.jsx    # Status totals & monitoring controls
    │   │   ├── TrackStrip.jsx      # Linear schematic with 'Mute nominal'
    │   │   └── WorkOrderPipeline.jsx # Pipeline of active tickets
    │   ├── hooks/
    │   │   └── useSegments.js      # Segment data polling hook
    │   └── App.jsx                 # View routing based on operator tier
    └── index.html
```

---

## ⚙️ Local Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/SAI-0360/railguard.git
cd railguard
```

### 2. Configure Backend

Navigate to the `backend/` directory:
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` with:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://127.0.0.1:27017/railguard
JWT_SECRET=your_long_random_jwt_secret_key
JWT_EXPIRES_IN=24h
```

Start the backend (runs on port 3001):
```bash
npm start
```

### 3. Configure Frontend

Open a new terminal window, navigate to the `frontend/` directory:
```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/` with:
```env
VITE_API_URL=http://localhost:3001
```

Start the frontend (runs on port 5173):
```bash
npm run dev
```

### 4. Operator Login Credentials

The application uses a 3-tier hierarchy. You can log in using these seeded demo accounts. Click on the respective operator row on the login screen, or enter the credentials manually:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **District Engineer (DEN)** | `den@railguard.in` | `den123` | Read-only Division HQ Command View |
| **Senior Section Engineer (SSE)** | `sse@railguard.in` | `sse123` | Full Operations Console & AI Verification |
| **Junior Engineer (JE)** | `je1@railguard.in` | `je1123` | Mobile-first Field View (Assigned segments only) |
| **Junior Engineer (JE)** | `je2@railguard.in` | `je2123` | Mobile-first Field View (Assigned segments only) |

---

## 🚀 Future Roadmap

- **Phase 2:** MQTT edge node integration for processing data from real rail-mounted accelerometers, plus RTK GPS geofencing checks.
- **Phase 3:** PostGIS spatial database re-architecture to support multi-corridor orchestration across national boundaries.
- **Phase 4:** Autonomous drone camera patrols parsing rail cracks via YOLOv8 object detection models.
