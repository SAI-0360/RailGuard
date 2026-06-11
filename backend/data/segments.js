// Generates 100 segments on startup. This is the single source of truth.
// All routes read from and write to this array.
const fs = require("fs");
const path = require("path");

const cachePath = path.join(__dirname, "segments.json");
const segments = [];

function loadSegments() {
  if (fs.existsSync(cachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      if (Array.isArray(data) && data.length === 100) {
        data.forEach(item => segments.push(item));
        console.log("Loaded 100 segments from local JSON cache segments.json.");
        return;
      }
    } catch (e) {
      console.error("Failed to parse local segments.json cache, recreating...", e.message);
    }
  }

  // Generate 100 default segments if cache is missing or invalid
  for (let i = 1; i <= 100; i++) {
    const id = `SEG-${String(i).padStart(3, "0")}`;
    const history = [];

    for (let j = 0; j < 20; j++) {
      history.push({
        timestamp: new Date(Date.now() - (20 - j) * 60 * 1000).toISOString(),
        vibrationLevel: parseFloat((2.0 + 0.5 * Math.sin(j * 0.3) + (Math.random() - 0.5) * 0.4).toFixed(2)),
        temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
        crackDetected: false
      });
    }

    segments.push({
      segmentId: id,
      status: "healthy",
      riskScore: 0.0,
      vibrationLevel: parseFloat((1.5 + Math.random() * 1.5).toFixed(2)),
      crackCount: 0,
      incidentCount: 0,
      daysSinceInspection: Math.floor(Math.random() * 10),
      lastUpdated: new Date().toISOString(),
      activeDefects: [],
      vibrationHistory: history,
    });
  }

  saveSegments();
}

function saveSegments() {
  try {
    const rawArray = segments.map(item => ({
      segmentId: item.segmentId,
      status: item.status,
      riskScore: item.riskScore,
      vibrationLevel: item.vibrationLevel,
      crackCount: item.crackCount,
      incidentCount: item.incidentCount,
      daysSinceInspection: item.daysSinceInspection,
      lastUpdated: item.lastUpdated,
      activeDefects: item.activeDefects,
      vibrationHistory: item.vibrationHistory
    }));
    fs.writeFileSync(cachePath, JSON.stringify(rawArray, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save segments to local JSON cache:", e.message);
  }
}

// Attach helper save method
segments.save = saveSegments;

// Perform initial load
loadSegments();

module.exports = segments;
