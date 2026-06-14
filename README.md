# 🚆 RailGuard

An autonomous, AI-powered railway safety inspector that continuously monitors track telemetry, JIT-calculates geometries, forecasts failures, auto-dispatches repair tickets, and verifies repairs.

---

## 🌐 Live Demo

🔗 https://railguard-operations-console.vercel.app/

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

### 🔍 Autonomous Telemetry Monitoring
- Continuous 10-second background scanning loop.
- Simulates train-mounted sensor data (vibration forces, temperatures).
- Dynamic risk assessment incorporating vibration, cracks, recency, and curve stress.

### 🧠 AI-Powered Repair Verification
- SSE (Senior Section Engineer) submits the JE's text report.
- Gemini AI compares completion notes against original defect parameters.
- Autonomously resets segment telemetry (vibration to 2.0 mm/s, clears cracks) and closes work orders on verification.

### 📉 Proactive Trend Forecasting
- Runs Ordinary Least Squares (OLS) linear regression on the last 20 vibration points.
- Predicts exactly when a segment will breach safety ceilings (e.g., *"Predicted critical in ~2 days"*).

### 🗺️ JIT Route Geometry & Curvature Penalty
- Slices raw OpenStreetMap coordinate node clouds into 1-km segments.
- Computes planar circumradius and area Heron's formulas.
- Automatically applies a curvature risk multiplier for sharp curves ($\le 300\text{m}$).

### ⏱️ Dynamic SLA Freeze Loop
- Field Junior Engineers (JEs) can request guidance to freeze countdown clocks.
- Displays "SLA Frozen" snowflake badges on the command console.
- Deadlines are dynamically adjusted on task resumption to ensure crew evaluation remains fair.

### 🎙️ Hands-Free Voice Logs & Shortcuts
- Web Speech API dictation inside the mobile repair completion drawer.
- Direct telephone shortcut links to call supervisors during roadblock escalations.

### ⚡ Caching Optimization
- Persistent `LocalStorage` caching for selected segment details.
- Validated against the active Work Order (Ticket) ID to avoid stale data.
- Bypasses Gemini AI calls for healthy segments, displaying immediate local parameters.

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
