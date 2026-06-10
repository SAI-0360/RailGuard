import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RiskGauge from './RiskGauge';
import VibrationChart from './VibrationChart';
import DefectList from './DefectList';
import AiExplanation from './AiExplanation';
import ExtractionForm from './ExtractionForm';
import VerificationForm from './VerificationForm';
import TrendBadge from './TrendBadge';

/**
 * TelemetryPanel — Detailed view of a single track segment.
 * Includes risk gauge, metrics, vibration chart, defect list, AI forms, and explanation.
 * @param {{
 *   segment: Object,
 *   onClose: Function,
 *   onDefectExtracted: Function,
 *   onRepairVerified: Function
 * }} props
 */
export default function TelemetryPanel({
  segment,
  onClose,
  onDefectExtracted,
  onRepairVerified
}) {
  const [aiExplanation, setAiExplanation] = useState(null);

  // Keep state in sync with selected segment or changes
  useEffect(() => {
    if (segment) {
      setAiExplanation(segment.riskExplanation || null);
    }
  }, [segment?.segmentId, segment?.riskExplanation]);

  if (!segment) return null;

  const {
    segmentId,
    status,
    riskScore,
    vibrationLevel,
    crackCount,
    incidentCount,
    daysSinceInspection,
    activeDefects = [],
    vibrationHistory = [],
    prediction = null,
    trendSummary = null
  } = segment;

  const handleExtracted = (response) => {
    if (response && response.explanation) {
      setAiExplanation(response.explanation);
    }
    if (onDefectExtracted) {
      onDefectExtracted(response);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-6 min-h-[500px]"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{segmentId}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {status}
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Live Telemetry & Diagnostics</p>
        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Trend Prediction Badge */}
      {prediction && (
        <div className="-mt-2">
          <TrendBadge prediction={prediction} />
        </div>
      )}

      {/* Main stats block (Risk Gauge + Numbers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Risk Gauge */}
        <div className="flex justify-center bg-white/3 border border-white/5 rounded-xl p-4">
          <RiskGauge riskScore={riskScore} status={status} />
        </div>

        {/* Mini stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Vibration"
            value={`${vibrationLevel ? vibrationLevel.toFixed(2) : '0.00'} mm/s`}
            status={
              vibrationLevel >= 7.1 ? 'critical' :
              vibrationLevel >= 4.1 ? 'warning' : 'healthy'
            }
          />
          <StatBox
            label="Cracks"
            value={crackCount || '0'}
            status={crackCount > 0 ? 'warning' : 'healthy'}
          />
          <StatBox
            label="Incidents"
            value={incidentCount || '0'}
            status={incidentCount > 0 ? 'critical' : 'healthy'}
          />
          <StatBox
            label="Last Inspected"
            value={`${daysSinceInspection || 0}d ago`}
            status={daysSinceInspection > 15 ? 'warning' : 'healthy'}
          />
        </div>
      </div>

      {/* Vibration History Chart */}
      <VibrationChart vibrationHistory={vibrationHistory} />

      {/* AI Risk Analysis Explanation */}
      <AiExplanation explanation={aiExplanation} />

      {/* Active Defects List */}
      <DefectList defects={activeDefects} segmentId={segmentId} />

      {/* AI Action Forms */}
      <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-6">
        <ExtractionForm
          segmentId={segmentId}
          onExtracted={handleExtracted}
        />
        <VerificationForm
          segmentId={segmentId}
          defects={activeDefects}
          onVerified={onRepairVerified}
        />
      </div>
    </motion.div>
  );
}

/** Internal metric card helper */
function StatBox({ label, value, status }) {
  const textColor =
    status === 'critical' ? 'text-red-400' :
    status === 'warning' ? 'text-amber-400' :
    'text-emerald-400';

  return (
    <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className={`text-base font-bold ${textColor}`}>
        {value}
      </span>
    </div>
  );
}
