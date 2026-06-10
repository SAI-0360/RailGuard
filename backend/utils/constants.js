const CONSTANTS = {
  TOTAL_SEGMENTS: 100,
  SEGMENT_ID_PREFIX: "SEG-",
  DEFECT_ID_PREFIX: "DEF-",
  REPAIR_ID_PREFIX: "RPR-",

  // Risk formula weights
  WEIGHT_VIBRATION: 0.40,
  WEIGHT_CRACK: 0.25,
  WEIGHT_INCIDENT: 0.20,
  WEIGHT_AGE: 0.15,

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

  // Gemini
  GEMINI_MODEL: "gemini-2.0-flash",

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
