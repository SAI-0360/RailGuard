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

An autonomous, AI-powered railway safety inspector that continuously monitors track telemetry, JIT-calculates geometries, forecasts failures, auto-dispatches repair tickets, and verifies repairs.

---

## 🌐 Live Demo

🔗 https://railguard-sooty.vercel.app/

---

## 📌 Overview

RailGuard is designed to solve a critical safety and operational problem in heavy railway systems (such as Indian Railways P.Way divisions) — **lack of real-time monitoring and administrative paperwork delays**.

Instead of waiting for scheduled trolley inspection runs, operators and engineers can:
- Monitor 100 track segments in real-time on a 10x10 glassmorphic grid.
- Track physical route locations and curve hazards on Leaflet GIS maps.
- Forecast structural breaches using proactive linear regression models.
- Auto-dispatch tickets with dynamic SLA timers.
- Verify field repairs using Gemini AI validation loops.

---

## ✨ Features

### 🔍 24/7 Track Monitoring
- The system continuously scans track data in the background (like train vibrations and track cracks).
- It automatically calculates a simple "Risk Score" based on how bad the vibrations are, how long it's been since the last inspection, and if the track is on a sharp curve.

### 🚨 Smart Auto-Dispatch
RailGuard handles emergencies automatically so humans don't have to:
- **Critical Emergencies:** When a track becomes highly dangerous, the system instantly creates a repair ticket and assigns it to the nearest field worker with a strict 4-hour deadline. No human manager is needed to trigger this.
- **Early Warnings:** When a track is slightly degraded but not yet dangerous, the system alerts the depot manager (SSE). The manager can review the data and proactively send a team to fix it before it becomes an emergency.

### 🧠 AI Repair Verification
- When field workers finish a repair, they type a simple report explaining what they did (e.g., "tightened loose bolts").
- **Google Gemini AI** reads this report and compares it to the original problem.
- If the AI confirms the repair makes sense, it automatically clears the emergency and turns the track "green" again, saving managers hours of paperwork and manual review.

### 📉 Early Trend Forecasting
- The system looks at recent vibration patterns to predict the future.
- If a track is getting worse over time, it warns operators with badges like *"critical in ~2 days"*, giving them a head start to fix the issue.

### ⏱️ Fair Deadlines & Escalation
- The platform features tailored views for Field Workers (JE), Depot Managers (SSE), and HQ Division Chiefs (DEN).
- **SLA Freeze:** If field workers get stuck (e.g., a train is blocking the track), they can request help. This instantly "freezes" their 4-hour countdown clock so they aren't unfairly penalized for delays outside their control.

### 🗺️ Live Maps & Curve Detection
- Displays the entire railway network on an interactive map.
- The system automatically detects sharp curves in the track and assigns them a higher risk penalty, since trains are more likely to derail on curves.

### ⚡ Clutter-Free Design
- **Mute Nominal:** With one click, managers can hide all "healthy" tracks from their screen. This leaves a clean, distraction-free dashboard showing *only* the tracks that need immediate attention.

---

## 🏗️ Tech Stack

### Frontend
- React.js (v18)
- Tailwind CSS
- Framer Motion (UI animations)
- Recharts (telemetry graphs)
- Leaflet (GIS mapping)
- Context API (state management)

### Backend / Services
- Node.js
- Express
- MongoDB / Mongoose

### AI Integration
- Google Gemini API
- Model used: `gemini-2.0-flash`
- Used for:
  - Defect parameters extraction
  - Repair verification validation
  - Risk explanation generation

### Deployment
- Vercel (Frontend)
- Render (Backend)

---

## 📂 Project Structure

```
RailGuard/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── data/
│   │   ├── raw-tracks-db.json    # Geographic OpenStreetMap data
│   │   └── segments.js           # Live segment telemetry store
│   ├── middleware/
│   │   ├── auth.js               # Route JWT validation
│   │   └── errorHandler.js       # Global error handler
│   ├── routes/
│   │   ├── activityLogRoutes.js
│   │   ├── aiRoutes.js           # Gemini extraction & verifications
│   │   ├── authRoutes.js         # JWT auth logins
│   │   ├── segmentRoutes.js      # Track queries & JIT route processor
│   │   ├── statsRoutes.js        # Global counters & resets
│   │   └── workOrderRoutes.js    # SLA ticketing & JEs rosters
│   ├── services/
│   │   ├── activityLogger.js
│   │   ├── geminiExtractor.js    # AI extraction & risk explanations
│   │   ├── geminiVerifier.js     # AI repair verifier
│   │   ├── riskEngine.js         # Math risk scoring & regression
│   │   └── routeProcessor.js     # Curve geometry calculations
│   ├── server.js                 # Express entry point
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/            # Reusable UI panels & components
    │   │   ├── CellGrid.jsx      # 10x10 color-coded schematic matrix
    │   │   ├── FocusPanel.jsx    # Telemetry detail workspace & AI forms
    │   │   ├── LiveMap.jsx       # Leaflet coordinate map
    │   │   ├── LoginPage.jsx
    │   │   ├── SituationBar.jsx  # Metric cards and status totals
    │   │   └── WorkOrderPipeline.jsx # Columns of active tickets
    │   ├── context/
    │   │   └── AuthContext.jsx   # User login & logout handling
    │   ├── hooks/
    │   │   ├── useSegments.js    # Segment data polling hook
    │   │   ├── useSelectedSegment.js # Segment selection & caching logic
    │   │   └── useStats.js
    │   ├── services/
    │   │   └── api.js            # Axios client setup
    │   ├── App.jsx               # Navigation & console layouts
    │   └── main.jsx
    └── index.html
```

---

## 🧠 Key Design Decisions

- **Work by Exception Focus**
  - "Mute Nominal" header filter collapses the grid to hide healthy green cells, focusing operators purely on warnings and critical alerts.

- **Ticket-Validated Caching**
  - Selected segment details are cached in `localStorage` keyed by `segmentId` + `activeWorkOrderId`.
  - Cache is invalidated automatically if the globally polled ticket ID changes, ensuring zero stale views.

- **SLA Clock Adjustments**
  - Real-world roadblocks shouldn't penalize field crew. On task resumption, the deadline is recalculated:
    $$\text{New Deadline} = \text{Original Deadline} + (T_{\text{resume}} - T_{\text{freeze}})$$

---

## ⚠️ Limitations

- **In-Memory Cache resets:** telemetries reset to defaults on server restart (intentional for demonstration).
- **LLM Semantic Sensitivity:** Gemini verifications can fail on ambiguous repair descriptions.
- **Speech API Support:** Voice dictation requires Google Chrome or compatible web speech browsers.

---

## 🚀 Future Improvements

- **Round 2:** MQTT edge node integration for real accelerometers, plus RTK GPS geofencing checks.
- **Round 3:** PostGIS spatial database re-architecting for multi-corridor depot orchestration.
- **Round 4:** Autonomous drone camera patrols parsing rail cracks via YOLOv8 object models.

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/SAI-0360/railguard.git
cd railguard
```

### 2. Configure Backend (.env)

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

Start the backend:
```bash
npm start
```

### 3. Configure Frontend (.env)

Open a new terminal window, navigate to the `frontend/` directory:
```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/` with:
```env
VITE_API_URL=http://localhost:3001
```

Start the frontend:
```bash
npm run dev
```

### 4. Login Credentials

You can log in to the dashboard using these seeded user accounts:
*   **District Engineer (DEN):** `den@railguard.in` / password: `password123`
*   **Senior Section Engineer (SSE):** `sse@railguard.in` / password: `password123`
*   **Junior Engineer (JE):** `je1@railguard.in` / password: `password123`
