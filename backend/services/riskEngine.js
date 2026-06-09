// backend/services/riskEngine.js
// Deterministic risk formula calculator — NO AI here.

const {
  WEIGHT_VIBRATION,
  WEIGHT_CRACK,
  WEIGHT_INCIDENT,
  WEIGHT_AGE,
  THRESHOLD_HEALTHY_MAX,
  THRESHOLD_WARNING_MAX,
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

module.exports = { calculateRisk };
