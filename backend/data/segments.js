// Generates 100 segments on startup. This is the single source of truth.
// All routes read from and write to this array.

const { MAX_VIBRATION_HISTORY } = require("../utils/constants");

const segments = [];

for (let i = 1; i <= 100; i++) {
  const id = `SEG-${String(i).padStart(3, "0")}`;

  // --- Task 5.3: Generate 20 initial TelemetryData entries ---
  const vibrationHistory = [];
  const now = Date.now();

  for (let j = 0; j < MAX_VIBRATION_HISTORY; j++) {
    // Timestamps 1 minute apart, starting from 20 minutes ago
    const timestamp = new Date(now - (MAX_VIBRATION_HISTORY - j) * 60 * 1000).toISOString();

    // Sine wave base pattern with small random noise
    const baseVibration = 2.0 + 0.5 * Math.sin(j * 0.3);
    const vibrationLevel = parseFloat(
      (baseVibration + (Math.random() - 0.5) * 0.4).toFixed(2)
    );

    vibrationHistory.push({
      timestamp,
      vibrationLevel,
      temperature: parseFloat((35 + Math.random() * 5).toFixed(1)),
      crackDetected: false,
    });
  }

  // Current vibration matches the last reading in history
  const currentVibration = vibrationHistory[vibrationHistory.length - 1].vibrationLevel;

  segments.push({
    segmentId: id,
    status: "healthy",
    riskScore: 0.0,
    vibrationLevel: currentVibration,
    crackCount: 0,
    incidentCount: 0,
    daysSinceInspection: Math.floor(Math.random() * 10),
    lastUpdated: new Date().toISOString(),
    activeDefects: [],
    vibrationHistory,
  });
}

module.exports = segments;
