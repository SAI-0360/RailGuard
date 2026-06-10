// backend/data/segments.js
// Generates 100 segments on startup. This is the single source of truth.
// All routes read from and write to this array.
//
// Day 2 enhancement: 5 segments start with elevated baselines (3.0-4.0 range)
// to serve as "early warning" candidates. Some segments have gently rising
// vibration trends in their history for more realistic demo data.

const segments = [];

// Segments that start with slightly elevated vibration (early warning candidates)
const ELEVATED_SEGMENTS = [7, 23, 42, 61, 88]; // SEG-007, SEG-023, SEG-042, SEG-061, SEG-088

// Segments that have a gently rising trend in their vibration history
const RISING_TREND_SEGMENTS = [15, 42, 56, 73, 94]; // SEG-015, SEG-042, SEG-056, SEG-073, SEG-094

for (let i = 1; i <= 100; i++) {
  const id = `SEG-${String(i).padStart(3, "0")}`;
  const history = [];

  // Determine baseline vibration for this segment
  const isElevated = ELEVATED_SEGMENTS.includes(i);
  const isRising = RISING_TREND_SEGMENTS.includes(i);

  // Base vibration: normal ~2.0, elevated ~3.2-4.0
  const baseVibration = isElevated
    ? parseFloat((3.2 + Math.random() * 0.8).toFixed(2))
    : parseFloat((1.5 + Math.random() * 1.0).toFixed(2));

  // Vary the sine wave frequency per segment for natural variation
  const sineFrequency = 0.2 + (i % 7) * 0.05;
  const sineAmplitude = 0.3 + (i % 5) * 0.05;

  for (let j = 0; j < 20; j++) {
    // Rising trend: add a gentle slope of ~0.03 per reading
    const trendComponent = isRising ? j * 0.03 : 0;

    // Natural variation via varied sine wave + random noise
    const vibrationLevel = parseFloat(
      (baseVibration + sineAmplitude * Math.sin(j * sineFrequency) + (Math.random() - 0.5) * 0.4 + trendComponent).toFixed(2)
    );

    history.push({
      timestamp: new Date(Date.now() - (20 - j) * 60 * 1000).toISOString(),
      vibrationLevel: Math.max(0.5, vibrationLevel),
      temperature: parseFloat((35 + Math.random() * 5).toFixed(2)),
      crackDetected: false
    });
  }

  // Current vibration level = last history reading
  const currentVibration = history[history.length - 1].vibrationLevel;

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
    vibrationHistory: history,
  });
}

module.exports = segments;
