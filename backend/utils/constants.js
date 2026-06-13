const CONSTANTS = {
  TOTAL_SEGMENTS: 100,
  SEGMENT_ID_PREFIX: "SEG-",
  DEFECT_ID_PREFIX: "DEF-",
  REPAIR_ID_PREFIX: "RPR-",

  // Risk formula weights — must sum to exactly 1.0.
  // WEIGHT_CURVATURE = 0.15 is grounded in FRA-based derailment research:
  // derailment rates on curved track run ~2-3x tangent track, but broken
  // rails/cracks remain the single largest cause, so curvature weighs in
  // below vibration and crack while displacing part of incident/age.
  WEIGHT_VIBRATION: 0.35,
  WEIGHT_CRACK: 0.25,
  WEIGHT_INCIDENT: 0.15,
  WEIGHT_AGE: 0.10,
  WEIGHT_CURVATURE: 0.15,

  // Curvature normalization (meters of circumcircle radius)
  CURVE_RADIUS_CRITICAL_M: 300,   // radius ≤ 300 m = maximum curve penalty (100)
  CURVE_RADIUS_STRAIGHT_M: 10000, // radius beyond this is treated as straight (0)

  // Risk thresholds
  THRESHOLD_HEALTHY_MAX: 30.00,
  THRESHOLD_WARNING_MAX: 60.00,
  MAX_RISK_SCORE: 100.00,

  // Vibration bounds (mm/s RMS)
  VIBRATION_NORMAL_MAX: 4.0,
  VIBRATION_WARNING_MAX: 7.0,
  VIBRATION_CRITICAL_MIN: 7.1,

  // Telemetry
  MAX_VIBRATION_HISTORY: 20,

  // Polling
  POLLING_INTERVAL_MS: 5000,

  // Simulator defaults
  DEFAULT_SPIKE_VALUE: 9.5,
  DEFAULT_HEALTHY_VIBRATION: 2.0,

  // gemini-2.0-flash has a free-tier input-token limit of 0 on this key — every
  // request 429s regardless of size. 2.5-flash works (only a 20 req/min cap).
  // Verified empirically: a 9-token call to 2.0-flash still 429s. Revert to
  // "gemini-2.0-flash" only on a paid tier where its quota is non-zero.
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_TIMEOUT_MS: 20000,         // timeout window
  GEMINI_RETRY_DELAY_MS: 2000,      // Wait before single retry on transient errors

  // Autonomous monitoring
  MONITORING_INTERVAL_MS: 10000,    // Monitoring loop interval (10s)
  MAX_LOG_ENTRIES: 500,             // Activity log buffer size

  // Trend prediction
  VIBRATION_CRITICAL_THRESHOLD: 7.0,   // Critical vibration level for prediction
  MIN_HISTORY_FOR_PREDICTION: 5,        // Min data points for linear regression
  MAX_PREDICTION_DAYS: 30,              // Ignore predictions beyond 30 days
  READINGS_PER_DAY_ESTIMATE: 6,         // ~6 monitoring cycles per day
};

module.exports = CONSTANTS;
