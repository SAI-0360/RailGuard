// backend/services/riskEngine.js
// Deterministic risk formula calculator — NO AI here.

const {
  WEIGHT_VIBRATION,
  WEIGHT_CRACK,
  WEIGHT_INCIDENT,
  WEIGHT_AGE,
  THRESHOLD_HEALTHY_MAX,
  THRESHOLD_WARNING_MAX,
  VIBRATION_CRITICAL_THRESHOLD,
  MIN_HISTORY_FOR_PREDICTION,
  MAX_PREDICTION_DAYS,
  READINGS_PER_DAY_ESTIMATE,
} = require("../utils/constants");

function calculateRisk(segment) {
  const vibrationComponent = Math.min((segment.vibrationLevel / 10.0) * 100, 100);
  const crackComponent = Math.min(segment.crackCount * 33.33, 100);
  const incidentComponent = Math.min(segment.incidentCount * 20.0, 100);
  const ageComponent = Math.min(segment.daysSinceInspection * 3.33, 100);

  const riskScore = parseFloat(
    (
      WEIGHT_VIBRATION * vibrationComponent +
      WEIGHT_CRACK * crackComponent +
      WEIGHT_INCIDENT * incidentComponent +
      WEIGHT_AGE * ageComponent
    ).toFixed(2)
  );

  let status = "healthy";
  if (riskScore > THRESHOLD_WARNING_MAX) status = "critical";
  else if (riskScore > THRESHOLD_HEALTHY_MAX) status = "warning";

  return { riskScore, status };
}

/**
 * Predict time until a segment reaches critical vibration threshold.
 * Uses simple linear regression on vibration history.
 * @param {Object} segment - TrackSegment object with vibrationHistory.
 * @returns {Object|null} { predictedDaysToCritical, trendDirection, slopePerReading } or null.
 */
function predictTimeToCritical(segment) {
  const history = segment.vibrationHistory;
  if (!history || history.length < MIN_HISTORY_FOR_PREDICTION) return null;

  const values = history.map(h => h.vibrationLevel);
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  if (denominator === 0) return null;

  const slope = numerator / denominator;

  // Not degrading — vibration stable or decreasing
  if (slope <= 0) return null;

  // Already critical
  const current = values[values.length - 1];
  if (current >= VIBRATION_CRITICAL_THRESHOLD) {
    return {
      predictedDaysToCritical: 0,
      trendDirection: "critical_now",
      slopePerReading: parseFloat(slope.toFixed(4))
    };
  }

  const readingsToThreshold = (VIBRATION_CRITICAL_THRESHOLD - current) / slope;
  const estimatedDays = Math.ceil(readingsToThreshold / READINGS_PER_DAY_ESTIMATE);
  if (estimatedDays > MAX_PREDICTION_DAYS) return null; // Too far out to be meaningful

  return {
    predictedDaysToCritical: estimatedDays,
    trendDirection: "rising",
    slopePerReading: parseFloat(slope.toFixed(4))
  };
}

/**
 * Generate a human-readable trend summary string.
 * @param {Object} segment - TrackSegment object.
 * @returns {string|null} Trend summary or null.
 */
function getTrendSummary(segment) {
  const prediction = predictTimeToCritical(segment);
  if (!prediction) return null;
  if (prediction.predictedDaysToCritical === 0)
    return "CRITICAL NOW — immediate attention required";
  if (prediction.predictedDaysToCritical <= 3)
    return `Predicted critical in ~${prediction.predictedDaysToCritical} days — urgent monitoring`;
  if (prediction.predictedDaysToCritical <= 7)
    return `Trending upward — ~${prediction.predictedDaysToCritical} days to threshold`;
  if (prediction.predictedDaysToCritical <= 14)
    return `Slow degradation detected — monitor closely (~${prediction.predictedDaysToCritical} days)`;
  return null;
}

module.exports = { calculateRisk, predictTimeToCritical, getTrendSummary };
