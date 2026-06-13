// backend/services/riskEngine.js
// Deterministic risk formula calculator — NO AI here.

const {
  WEIGHT_VIBRATION,
  WEIGHT_CRACK,
  WEIGHT_INCIDENT,
  WEIGHT_AGE,
  WEIGHT_CURVATURE,
  CURVE_RADIUS_CRITICAL_M,
  CURVE_RADIUS_STRAIGHT_M,
  THRESHOLD_HEALTHY_MAX,
  THRESHOLD_WARNING_MAX,
  VIBRATION_CRITICAL_THRESHOLD,
  MIN_HISTORY_FOR_PREDICTION,
  MAX_PREDICTION_DAYS,
  READINGS_PER_DAY_ESTIMATE,
} = require("../utils/constants");

/**
 * Curve penalty from the JIT-computed circumcircle radius (meters).
 * 0 (straight track) → 0 penalty. The sharper the curve (smaller radius),
 * the higher the penalty, maxing out at radius ≤ CURVE_RADIUS_CRITICAL_M.
 * @param {number} radiusOfCurvature - meters; 0 or missing = straight
 * @returns {number} 0-100 component
 */
function curvatureComponentOf(radiusOfCurvature) {
  const radius = radiusOfCurvature || 0;
  if (radius <= 0 || radius >= CURVE_RADIUS_STRAIGHT_M) return 0;
  return Math.min((CURVE_RADIUS_CRITICAL_M / radius) * 100, 100);
}

/**
 * Compute a segment's composite risk score (0–100) and its status band.
 *
 * MODEL — a fixed-weight linear blend of five independently normalized factors.
 * The weights are constants (utils/constants.js) and sum to exactly 1.0, so the
 * output is bounded to [0, 100] when every component is clamped to [0, 100]:
 *
 *   riskScore = 0.35·V + 0.25·C + 0.15·I + 0.10·A + 0.15·K
 *
 * Each factor is mapped to a 0–100 stress level (then capped at 100):
 *   V  Vibration   vibrationLevel(mm/s) / 10  × 100   (10 mm/s ⇒ 100)
 *   C  Cracks      crackCount × 33.33                 (3 cracks ⇒ ~100)
 *   I  Incidents   incidentCount × 20                 (5 incidents ⇒ 100)
 *   A  Age         daysSinceInspection × 3.33         (~30 days ⇒ ~100)
 *   K  Curvature   (300m / circumradius) × 100        (see curvatureComponentOf)
 *
 * Weight rationale (utils/constants.js): vibration and cracks dominate because
 * broken rails are the single largest derailment cause; curvature (0.15) is FRA-
 * grounded (curved track derails ~2–3× tangent track) and displaces part of the
 * incident/age weight. The result is rounded to 2 decimals for stable display.
 *
 * STATUS BANDS (strict greater-than, so the boundary value stays in the lower
 * band): ≤30 healthy · 30 < x ≤ 60 warning · >60 critical.
 *
 * Deterministic and pure — no AI, no I/O. The autonomous monitor, the detail
 * route, and the simulator all funnel through this one function.
 * @param {Object} segment - TrackSegment with vibrationLevel, crackCount,
 *   incidentCount, daysSinceInspection, and (optional) radiusOfCurvature.
 * @returns {{ riskScore: number, status: "healthy"|"warning"|"critical" }}
 */
function calculateRisk(segment) {
  // Normalize each raw reading to a 0–100 stress level, capping at 100 so a
  // single extreme factor can't push a weighted term past its ceiling.
  const vibrationComponent = Math.min((segment.vibrationLevel / 10.0) * 100, 100);
  const crackComponent = Math.min(segment.crackCount * 33.33, 100);
  const incidentComponent = Math.min(segment.incidentCount * 20.0, 100);
  const ageComponent = Math.min(segment.daysSinceInspection * 3.33, 100);
  const curvatureComponent = curvatureComponentOf(segment.radiusOfCurvature);

  // Weighted sum of the five normalized components (weights sum to 1.0 ⇒ 0–100).
  const riskScore = parseFloat(
    (
      WEIGHT_VIBRATION * vibrationComponent +
      WEIGHT_CRACK * crackComponent +
      WEIGHT_INCIDENT * incidentComponent +
      WEIGHT_AGE * ageComponent +
      WEIGHT_CURVATURE * curvatureComponent
    ).toFixed(2)
  );

  // Threshold classification — strict ">" keeps the boundary in the lower band.
  let status = "healthy";
  if (riskScore > THRESHOLD_WARNING_MAX) status = "critical";
  else if (riskScore > THRESHOLD_HEALTHY_MAX) status = "warning";

  return { riskScore, status };
}

/**
 * Forecast how soon a segment's vibration will breach the critical threshold,
 * using ordinary-least-squares (OLS) linear regression over the recent
 * vibration history.
 *
 * REGRESSION — fit the line y = a + b·x where x is the reading index (0..n-1,
 * evenly spaced) and y is the vibration level. The OLS slope is the covariance
 * of (x, y) over the variance of x:
 *
 *           Σ (xᵢ − x̄)(yᵢ − ȳ)        numerator
 *     b  =  ─────────────────────  =  ───────────
 *               Σ (xᵢ − x̄)²           denominator
 *
 * b is mm/s gained per reading. Because x is a fixed 0..n-1 ramp, the denominator
 * (Σ(xᵢ−x̄)²) is always > 0 for n ≥ 2, so it only collapses to 0 for a single
 * point — guarded below. We don't need the intercept a: the forecast extrapolates
 * from the *latest* actual reading, not the fitted line's start.
 *
 * FORECAST — horizon to the safety breach:
 *   readingsToThreshold = (CRITICAL − current) / b          // how many readings
 *   estimatedDays       = ceil(readingsToThreshold / READINGS_PER_DAY_ESTIMATE)
 * with ~6 monitoring cycles modelled per day. b ≤ 0 ⇒ not degrading (no forecast);
 * current already ≥ threshold ⇒ "critical_now" (0 days); horizons beyond
 * MAX_PREDICTION_DAYS are dropped as too speculative to act on.
 *
 * @param {Object} segment - TrackSegment with a vibrationHistory array.
 * @returns {{predictedDaysToCritical:number, trendDirection:string, slopePerReading:number}|null}
 *   null when there is too little history, the trend is flat/falling, or the
 *   breach is further out than MAX_PREDICTION_DAYS.
 */
function predictTimeToCritical(segment) {
  const history = segment.vibrationHistory;
  // Need a minimum sample size or the slope is just noise.
  if (!history || history.length < MIN_HISTORY_FOR_PREDICTION) return null;

  const values = history.map(h => h.vibrationLevel);
  const n = values.length;
  // x is the evenly-spaced reading index 0..n-1; its mean is (n-1)/2.
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;

  // Accumulate the OLS slope's numerator Σ(xᵢ−x̄)(yᵢ−ȳ) and denominator Σ(xᵢ−x̄)².
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  if (denominator === 0) return null; // degenerate (n < 2): no variance in x

  const slope = numerator / denominator; // mm/s gained per reading

  // Not degrading — vibration stable or decreasing, so there's nothing to forecast.
  if (slope <= 0) return null;

  // Already at/over the threshold — no lead time left.
  const current = values[values.length - 1];
  if (current >= VIBRATION_CRITICAL_THRESHOLD) {
    return {
      predictedDaysToCritical: 0,
      trendDirection: "critical_now",
      slopePerReading: parseFloat(slope.toFixed(4))
    };
  }

  // Extrapolate from the latest actual reading along the fitted slope.
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
