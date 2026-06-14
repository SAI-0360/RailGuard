# RailGuard — Autonomous Railway Safety Platform

**RailGuard** is an autonomous, agentic railway safety monitoring console built for the **Far Away 2026 Hackathon** under the **"Agentic & Autonomous Systems"** theme. 

It continuously scans track telemetry, mathematically evaluates risk, forecasts structural failures, auto-dispatches repair tickets, coordinates field engineers, and verifies repairs using AI—**all without human intervention**. 

The system operates on a **"Work by Exception"** paradigm: the background monitoring service runs silently, only alerting operators and triggering workflows when mathematical safety thresholds are breached.

---

## 🚀 Key Features

*   **Autonomous Scanning Loop:** A background service that scans 100 track segments on a 10-second interval, simulating train-mounted sensor data (vibration forces, temperatures).
*   **Intelligent Risk Calculation:** A deterministic risk engine that aggregates vibration levels, crack counts, incident histories, inspection recency, and track curvature parameters to score segment risks from 0 to 100.
*   **Proactive Trend Forecasting:** Runs ordinary least squares (OLS) linear regression on historical telemetry to predict the exact time remaining before a segment breaches safety thresholds (e.g., *"Predicted critical in ~2 days"*).
*   **Automatic Ticket Dispatch:** The moment a segment goes critical, the system auto-generates a work order, resolves the local roster to assign the ticket to the correct field Junior Engineer (JE), and starts a 4-hour SLA countdown.
*   **Three-Tier Operational Hierarchy:** Adapts the console layout to three distinct P.Way roles:
    1.  *Junior Engineer (JE) View:* A mobile-scoped interface for acknowledging tickets, requesting guidance, using voice dictation, and logging repairs.
    2.  *Senior Section Engineer (SSE) View:* The central operations desk displaying the grid, Leaflet GIS map, and AI verification forms.
    3.  *District Engineer (DEN) View:* A division-level command board tracking health indexes and active escalations.
*   **Dynamic SLA Freeze:** If a field engineer requests guidance on-site, the 4-hour SLA timer freezes immediately, ensuring evaluations remain fair while supervisors coordinate instructions.
*   **Gemini 2.0 Flash AI Integration:**
    *   *Defect Extraction:* Parses raw, unstructured inspection reports into structured database parameters.
    *   *Repair Verification:* Compares the JE's completion report against the original defect parameters, automatically closing the ticket and resetting telemetry baselines on success.
    *   *Supervisor Bypass:* A manual override button to force-close tickets in case of API outages.

---

## 🛠️ Technical Stack & Architecture

*   **Backend:** Node.js, Express, Google Gemini SDK, local JSON cache storage.
*   **Frontend:** React 18, Vite 5, Tailwind CSS 3 (Dark glassmorphic theme), Framer Motion 11, Recharts 2, Axios.
*   **Map GIS:** Leaflet Map API mapping real-world Mumbai-Pune coordinate networks.

---

## 📦 Local Setup & Installation

### Prerequites
*   Node.js (v18+)
*   npm

### 1. Backend Setup
1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `backend/` directory and add your database configuration, JWT secret, and Google Gemini API key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    PORT=3001
    MONGODB_URI=mongodb://127.0.0.1:27017/railguard
    JWT_SECRET=change_me_to_a_long_random_string
    JWT_EXPIRES_IN=24h
    ```
4.  Start the Express server:
    ```bash
    npm start
    ```

### 2. Frontend Setup
1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `frontend/` directory to configure the backend API proxy:
    ```env
    VITE_API_URL=http://localhost:3001
    ```
4.  Start the Vite development server:
    ```bash
    npm run dev
    ```
5.  Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## ⏱️ Live Demonstration Script (2-Minute Walkthrough)

Showcase the autonomous closed loop using the **Simulator Panel** on the SSE operations dashboard:

1.  **Autonomous Baseline (0:00 - 0:20):** Display the 10x10 track grid. Point out that all 100 segments are green (healthy) and highlight the activity ledger showing autonomous background scanning.
2.  **Degradation & Forecast (0:20 - 0:50):** Go to the Simulator Panel and click **"Degrade SEG-042 (Critical)"**. Cell 42 instantly turns red and flashes. The ledger prints an alarm. Point to the **Work Order Pipeline** showing a ticket auto-generated with a 4-hour SLA countdown.
3.  **AI Telemetry Analysis (0:50 - 1:20):** Click on segment **SEG-042**. In the details panel, point to the rising telemetry line chart, the OLS trend badge predicting critical limits, and the Gemini-generated plain-English explanation.
4.  **Field Escalation & SLA Freeze (1:20 - 1:40):** Log in as **JE 1** (`je1@railguard.in`). Acknowledge the ticket and click **"Request Guidance"**. Point out that the SLA timer immediately freezes. Log back in as **SSE**, provide instructions, and log back in as **JE** to submit a completion report.
5.  **AI Verification & Reset (1:40 - 2:00):** Log in as **SSE**, open the verification form (which is pre-filled with the JE's report), and click **"Verify with AI"**. The verifier spinner runs, Gemini approves the repair, the ticket closes, and segment 42 returns to healthy green on the grid and map.
